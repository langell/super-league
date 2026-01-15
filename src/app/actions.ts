"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq, and, asc } from "drizzle-orm";
import { organizations, leagueMembers, courses, tees, user, holes, teams, teamMembers, seasons, rounds, matches, matchPlayers, scores } from "@/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCourseDetails } from "@/lib/course-api";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "@/lib/logger";
import { memberSchema, validateRequest, type ActionResponse } from "@/lib/validations";

// ... existing actions ...

export async function scanScorecardAction(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const imageFile = formData.get("scorecard") as File;
    if (!imageFile || imageFile.size === 0) {
        throw new Error("No image provided");
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("Google AI API Key not configured");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const buffer = Buffer.from(await imageFile.arrayBuffer());

    const prompt = `
        You are a golf course database expert. Extract the following information from this golf scorecard image:
        1. Course Name, City, and State.
        2. List of Tee sets (e.g. Blue, White, Red).
        3. For EACH tee set, extract: 
           - Slope and Rating (if available)
           - Par for all 18 holes
           - Handicap Stroke Index for all 18 holes
           - Yardage for all 18 holes (if available)

        Return ONLY a clean JSON object with this structure:
        {
          "name": "Course Name",
          "city": "City",
          "state": "State",
          "tees": [
            {
              "name": "Tee Name",
              "par": 72,
              "rating": "72.4",
              "slope": 131,
              "holes": [
                { "holeNumber": 1, "par": 4, "handicapIndex": 5, "yardage": 410 },
                ... up to 18
              ]
            }
          ]
        }
    `;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: buffer.toString("base64"),
                mimeType: imageFile.type
            }
        }
    ]);

    const responseText = result.response.text();
    // Clean up potential markdown formatting in JSON response
    const jsonString = responseText.replace(/```json\n?|\n?```/g, "").trim();

    try {
        return JSON.parse(jsonString);
    } catch {
        logger.error({ responseText }, "Failed to parse Gemini response");
        throw new Error("Failed to extract data from scorecard image.");
    }
}



export async function addMemberToLeague(prevState: unknown, formData: FormData): Promise<ActionResponse> {
    const session = await auth();
    if (!session?.user) return { success: false, message: "Unauthorized" };

    const validation = validateRequest(memberSchema, {
        firstName: (formData.get("name") as string)?.split(' ')[0] || "",
        lastName: (formData.get("name") as string)?.split(' ').slice(1).join(' ') || "Player",
        email: formData.get("email") as string,
        role: (formData.get("role") as string) || "player",
    });

    if (!validation.success) {
        return { success: false, message: "Validation failed", fieldErrors: validation.errors };
    }

    const { email, firstName, lastName, role } = validation.data;
    const name = `${firstName} ${lastName}`;
    const organizationId = formData.get("organizationId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    // 1. Verify caller is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) return { success: false, message: "Unauthorized - Not an Admin" };

    try {
        // 2. Find or create user
        let [targetUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

        if (!targetUser) {
            [targetUser] = await db.insert(user).values({
                email,
                name: name || null,
                firstName: name ? name.split(' ')[0] : null,
                lastName: name ? (name.indexOf(' ') > -1 ? name.split(' ').slice(1).join(' ') : name) : null,
                phone: formData.get("phone") as string || null,
                notificationPreference: (formData.get("notificationPreference") as string) || "sms",
            }).returning();
        } else if (name && !targetUser.name) {
            const phone = formData.get("phone") as string;
            const pref = formData.get("notificationPreference") as string;

            // Update name if it wasn't set
            await db.update(user).set({
                name,
                firstName: name.split(' ')[0],
                lastName: name.indexOf(' ') > -1 ? name.split(' ').slice(1).join(' ') : name,
                ...(phone ? { phone } : {}),
                ...(pref ? { notificationPreference: pref } : {})
            }).where(eq(user.id, targetUser.id));
        }

        // 3. Add to league if not already member
        const [existingMember] = await db
            .select()
            .from(leagueMembers)
            .where(
                and(
                    eq(leagueMembers.organizationId, organizationId),
                    eq(leagueMembers.userId, targetUser.id)
                )
            )
            .limit(1);

        if (!existingMember) {
            await db.insert(leagueMembers).values({
                organizationId,
                userId: targetUser.id,
                role,
            });
            logger.info({ leagueSlug, email, role }, "New member added to league");
            revalidatePath(`/dashboard/${leagueSlug}/members`);
            return { success: true, message: "Member added successfully" };
        }

        return { success: true, message: "User is already a member of this league." };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error({ error: errorMessage, leagueSlug, email }, "Failed to add member to league");
        return { success: false, message: "Internal server error" };
    }
}

export async function removeMemberFromLeague(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const memberId = formData.get("memberId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    // 1. Get member info to find organizationId
    const [memberToDelete] = await db.select().from(leagueMembers).where(eq(leagueMembers.id, memberId)).limit(1);
    if (!memberToDelete) return;

    // 2. Verify caller is admin of that league
    const [callerMembership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, memberToDelete.organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!callerMembership) throw new Error("Unauthorized");

    await db.delete(leagueMembers).where(eq(leagueMembers.id, memberId));

    revalidatePath(`/dashboard/${leagueSlug}/members`);
}

export async function createLeague(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    if (!name || !slug) {
        throw new Error("Name and Slug are required");
    }

    // 1. Create the organization
    const [org] = await db.insert(organizations).values({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    }).returning();

    // 2. Add the user as the admin member
    await db.insert(leagueMembers).values({
        userId: session.user.id ?? "",
        organizationId: org.id,
        role: "admin",
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
}

interface ScannedHole {
    holeNumber: number;
    par: number;
    handicapIndex: number;
    yardage?: number;
}

interface ScannedTee {
    name: string;
    par: number;
    rating: string;
    slope: number;
    holes: ScannedHole[];
}

interface ScannedCourse {
    name: string;
    city: string;
    state: string;
    tees: ScannedTee[];
}

export async function saveExtractedCourseAction(courseData: ScannedCourse, leagueSlug: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        await db.transaction(async (tx) => {
            const [course] = await tx.insert(courses).values({
                name: courseData.name,
                city: courseData.city,
                state: courseData.state,
            }).returning();

            for (const teeData of courseData.tees) {
                const [tee] = await tx.insert(tees).values({
                    courseId: course.id,
                    name: teeData.name,
                    par: teeData.par || 72,
                    rating: (teeData.rating || "72.0").toString(),
                    slope: teeData.slope || 113,
                }).returning();

                if (teeData.holes && Array.isArray(teeData.holes)) {
                    const holeValues = teeData.holes.map((h: ScannedHole) => ({
                        teeId: tee.id,
                        holeNumber: h.holeNumber,
                        par: h.par || 4,
                        handicapIndex: h.handicapIndex || 18,
                        yardage: h.yardage || null,
                    }));

                    if (holeValues.length > 0) {
                        await tx.insert(holes).values(holeValues);
                    }
                }
            }
            return course.id;
        });
    } catch (error) {
        console.error("Failed to save extracted course:", error);
        throw new Error("Failed to save course data");
    }

    revalidatePath(`/dashboard/${leagueSlug}/courses`);
    redirect(`/dashboard/${leagueSlug}/courses`);
}


export async function updateCourseFromScanAction(courseId: string, courseData: ScannedCourse, leagueSlug: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    try {
        await db.transaction(async (tx) => {
            // 1. Update Course Info
            await tx.update(courses)
                .set({
                    name: courseData.name,
                    city: courseData.city,
                    state: courseData.state,
                })
                .where(eq(courses.id, courseId));

            // 2. Find existing tees to delete their holes
            const existingTees = await tx.select({ id: tees.id }).from(tees).where(eq(tees.courseId, courseId));

            if (existingTees.length > 0) {
                const teeIds = existingTees.map(t => t.id);
                for (const tId of teeIds) {
                    await tx.delete(holes).where(eq(holes.teeId, tId));
                }
                await tx.delete(tees).where(eq(tees.courseId, courseId));
            }

            // 3. Re-insert Tees and Holes
            for (const teeData of courseData.tees) {
                const [tee] = await tx.insert(tees).values({
                    courseId: courseId,
                    name: teeData.name,
                    par: teeData.par || 72,
                    rating: (teeData.rating || "72.0").toString(),
                    slope: teeData.slope || 113,
                }).returning();

                if (teeData.holes && Array.isArray(teeData.holes)) {
                    const holeValues = teeData.holes.map((h: ScannedHole) => ({
                        teeId: tee.id,
                        holeNumber: h.holeNumber,
                        par: h.par || 4,
                        handicapIndex: h.handicapIndex || 18,
                        yardage: h.yardage || null,
                    }));

                    if (holeValues.length > 0) {
                        await tx.insert(holes).values(holeValues);
                    }
                }
            }
        });
    } catch (error) {
        console.error("Failed to update course:", error);
        throw new Error("Failed to update course data");
    }

    revalidatePath(`/dashboard/${leagueSlug}/courses`);
    revalidatePath(`/dashboard/${leagueSlug}/courses/${courseId}/edit`);
    redirect(`/dashboard/${leagueSlug}/courses/${courseId}/edit`);
}

export async function importCourseFromApi(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const externalCourseId = formData.get("courseId") as string;

    const details = await getCourseDetails(externalCourseId);
    if (!details) throw new Error("Course details not found");

    const newCourseId = await db.transaction(async (tx) => {
        const [course] = await tx.insert(courses).values({
            name: details.name,
            city: details.city,
            state: details.state,
        }).returning();

        for (const teeData of details.tees) {
            const [tee] = await tx.insert(tees).values({
                courseId: course.id,
                name: teeData.name,
                par: teeData.par,
                rating: teeData.rating.toString(),
                slope: teeData.slope,
            }).returning();

            const holeValues = teeData.holes.map(h => ({
                teeId: tee.id,
                holeNumber: h.holeNumber,
                par: h.par,
                handicapIndex: h.handicapIndex,
                yardage: h.yardage || null,
            }));

            if (holeValues.length > 0) {
                await tx.insert(holes).values(holeValues);
            }
        }
        return course.id;
    });

    revalidatePath(`/dashboard/${leagueSlug}/courses`);
    redirect(`/dashboard/${leagueSlug}/courses/${newCourseId}`);
}

export async function createCourse(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const zipCode = formData.get("zipCode") as string;
    const proName = formData.get("proName") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const email = formData.get("email") as string;
    const website = formData.get("website") as string;

    const [course] = await db.insert(courses).values({
        name,
        address,
        city,
        state,
        zipCode,
        proName,
        phoneNumber,
        email,
        website,
    }).returning();

    revalidatePath(`/dashboard/${leagueSlug}/courses`);
    redirect(`/dashboard/${leagueSlug}/courses/${course.id}`);
}

export async function updateCourse(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const courseId = formData.get("courseId") as string;
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;
    const zipCode = formData.get("zipCode") as string;
    const proName = formData.get("proName") as string;
    const phoneNumber = formData.get("phoneNumber") as string;
    const email = formData.get("email") as string;
    const website = formData.get("website") as string;

    await db.update(courses)
        .set({
            name,
            address,
            city,
            state,
            zipCode,
            proName,
            phoneNumber,
            email,
            website,
        })
        .where(eq(courses.id, courseId));

    revalidatePath(`/dashboard/${leagueSlug}/courses/${courseId}/edit`);
    redirect(`/dashboard/${leagueSlug}/courses/${courseId}/edit`);
}

export async function deleteCourse(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const courseId = formData.get("courseId") as string;

    await db.transaction(async (tx) => {
        // 1. Delete Holes
        const existingTees = await tx.select({ id: tees.id }).from(tees).where(eq(tees.courseId, courseId));
        if (existingTees.length > 0) {
            const teeIds = existingTees.map(t => t.id);
            for (const tId of teeIds) {
                await tx.delete(holes).where(eq(holes.teeId, tId));
            }
        }

        // 2. Delete Tees
        await tx.delete(tees).where(eq(tees.courseId, courseId));

        // 3. Delete Course
        await tx.delete(courses).where(eq(courses.id, courseId));
    });

    revalidatePath(`/dashboard/${leagueSlug}/courses`);
    redirect(`/dashboard/${leagueSlug}/courses`);
}

export async function createTee(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const courseId = formData.get("courseId") as string;
    const name = formData.get("name") as string;
    const par = parseInt(formData.get("par") as string);
    const rating = formData.get("rating") as string;
    const slope = parseInt(formData.get("slope") as string);

    await db.insert(tees).values({
        courseId,
        name,
        par,
        rating,
        slope,
    });

    revalidatePath(`/dashboard/${leagueSlug}/courses/${courseId}`);
    redirect(`/dashboard/${leagueSlug}/courses/${courseId}`);
}

export async function updateLeagueSettings(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueId = formData.get("leagueId") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const handicapPercentage = formData.get("handicapPercentage") as string;
    const minScoresToCalculate = parseInt(formData.get("minScoresToCalculate") as string) || 3;

    // Check if user is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, leagueId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) throw new Error("Unauthorized");

    await db
        .update(organizations)
        .set({
            name,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            handicapPercentage,
            minScoresToCalculate,
        })
        .where(eq(organizations.id, leagueId));

    revalidatePath(`/dashboard/${slug}/settings`);
    revalidatePath(`/dashboard/${slug}`);
    redirect(`/dashboard/${slug}`);
}

export async function createTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const organizationId = formData.get("organizationId") as string;
    const name = formData.get("name") as string;

    await db.insert(teams).values({
        organizationId,
        name,
    });

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
}

export async function deleteTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const teamId = formData.get("teamId") as string;

    await db.delete(teams).where(eq(teams.id, teamId));

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
}

export async function removeMemberFromTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const teamMemberId = formData.get("teamMemberId") as string;

    await db.delete(teamMembers).where(eq(teamMembers.id, teamMemberId));

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
}

export async function addMemberToTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const teamId = formData.get("teamId") as string;
    const leagueMemberId = formData.get("leagueMemberId") as string;

    // Check if user is already in a team for this league? 
    // For now, we allow multiple teams or assume UI filters them out.
    // Ideally we check if they are already in *this* team.

    // Check limit of 2?
    const existingMembers = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (existingMembers.length >= 2) throw new Error("Team is full");

    await db.insert(teamMembers).values({
        teamId,
        leagueMemberId,
    });

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
    redirect(`/dashboard/${leagueSlug}/teams`);
}

export async function updateMember(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const memberId = formData.get("memberId") as string;
    const userId = formData.get("userId") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const role = formData.get("role") as "admin" | "player" | "sub";
    const handicap = formData.get("handicap") as string;
    const notificationPreference = formData.get("notificationPreference") as string;

    // 1. Verify caller is admin (of the league that this member belongs to)
    const [memberToUpdate] = await db.select().from(leagueMembers).where(eq(leagueMembers.id, memberId)).limit(1);
    if (!memberToUpdate) throw new Error("Member not found");

    const [callerMembership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, memberToUpdate.organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!callerMembership) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        // 2. Update League Member Details
        await tx.update(leagueMembers)
            .set({
                role,
                handicap: handicap,
            })
            .where(eq(leagueMembers.id, memberId));

        // 3. Update User Details
        // Construct full name if changed
        let fullName = undefined;
        if (firstName && lastName) {
            fullName = `${firstName} ${lastName}`;
        } else if (firstName) {
            fullName = firstName;
        }

        await tx.update(user)
            .set({
                firstName,
                lastName,
                phone,
                name: fullName,
                notificationPreference,
            })
            .where(eq(user.id, userId));
    });

    revalidatePath(`/dashboard/${leagueSlug}/members`);
    redirect(`/dashboard/${leagueSlug}/members`);
}

export async function createSeason(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const organizationId = formData.get("organizationId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;
    const name = formData.get("name") as string;

    // Auto-populate inputs
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const frequencyDay = formData.get("frequencyDay") as string; // 0-6
    const defaultCourseId = formData.get("defaultCourseId") as string || null;
    const defaultHolesCount = parseInt(formData.get("defaultHolesCount") as string) || 18; // 9 or 18
    const rotationStrategy = formData.get("rotationStrategy") as string || "18_holes"; // "18_holes", "front_9", "back_9", "rotate"

    if (!name) throw new Error("Name is required");

    // 1. Create Season
    const [season] = await db.insert(seasons).values({
        organizationId,
        name,
        startDate: startDateStr ? new Date(startDateStr) : null,
        endDate: endDateStr ? new Date(endDateStr) : null,
        active: true,
    }).returning();

    // 2. Generate Rounds if configured
    if (startDateStr && endDateStr && frequencyDay !== "" && frequencyDay !== null) {
        // Parse dates as UTC midnight to avoid any local timezone shifts affecting the day of week calculation
        const start = new Date(startDateStr + 'T12:00:00Z');
        const end = new Date(endDateStr + 'T12:00:00Z');
        const targetDay = parseInt(frequencyDay);

        if (isNaN(targetDay)) {
            console.error("Invalid frequency day");
            throw new Error("Invalid frequency day");
        }

        // Loop safety
        if (start > end) {
            console.error("Start date is after end date");
        } else {
            const currentDate = new Date(start);

            // Find first occurrence of targetDay
            // getUTCDay() ensures we check the day of the week in UTC
            let loopGuard = 0;
            while (currentDate.getUTCDay() !== targetDay && loopGuard < 7) {
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                loopGuard++;
            }

            const newRounds = [];
            let roundGuard = 0;
            let rotationIndex = 0; // 0 = front, 1 = back

            // Generate rounds
            while (currentDate <= end && roundGuard < 104) { // Limit to 2 years (104 weeks)
                let roundType = "18_holes";
                if (defaultHolesCount === 9) {
                    if (rotationStrategy === "rotate") {
                        roundType = rotationIndex % 2 === 0 ? "front_9" : "back_9";
                        rotationIndex++;
                    } else {
                        roundType = rotationStrategy; // "front_9" or "back_9"
                    }
                }

                newRounds.push({
                    seasonId: season.id,
                    courseId: defaultCourseId || null,
                    date: new Date(currentDate), // This will save as specific timestamp
                    status: "scheduled",
                    holesCount: defaultHolesCount,
                    roundType: roundType
                });

                // Advance 1 week
                currentDate.setUTCDate(currentDate.getUTCDate() + 7);
                roundGuard++;
            }

            if (newRounds.length > 0) {
                await db.insert(rounds).values(newRounds);
            }
        }
    }

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
    redirect(`/dashboard/${leagueSlug}/schedule`);
}

export async function createRound(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const seasonId = formData.get("seasonId") as string;
    const courseId = formData.get("courseId") as string;
    const dateStr = formData.get("date") as string;
    const holesCount = parseInt(formData.get("holesCount") as string) || 18;
    const roundType = formData.get("roundType") as string || "18_holes";

    if (!courseId || !dateStr) throw new Error("Missing fields");

    await db.insert(rounds).values({
        seasonId,
        courseId,
        date: new Date(dateStr),
        status: "scheduled",
        holesCount,
        roundType
    });

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
    redirect(`/dashboard/${leagueSlug}/schedule`);
}

export async function updateSeason(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const seasonId = formData.get("seasonId") as string;
    const name = formData.get("name") as string;
    const active = formData.get("active") === "true";

    // Auto-populate inputs
    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const frequencyDay = formData.get("frequencyDay") as string; // 0-6
    const defaultCourseId = formData.get("defaultCourseId") as string || null;

    if (!name) throw new Error("Name is required");

    // 1. Update Season
    await db.update(seasons).set({
        name,
        active,
    }).where(eq(seasons.id, seasonId));

    // 2. Generate Rounds if configured (and safe to do so)
    if (startDateStr && endDateStr && frequencyDay !== "" && frequencyDay !== null) {
        // Double check no rounds exist? Or just append?
        // Let's check count to be safe to avoid duplicates or mess
        const existingRounds = await db.select().from(rounds).where(eq(rounds.seasonId, seasonId));

        if (existingRounds.length === 0) {
            // Apply strict UTC logic
            const start = new Date(startDateStr + 'T12:00:00Z');
            const end = new Date(endDateStr + 'T12:00:00Z');
            const targetDay = parseInt(frequencyDay);

            if (start <= end && !isNaN(targetDay)) {
                const currentDate = new Date(start);

                let loopGuard = 0;
                while (currentDate.getUTCDay() !== targetDay && loopGuard < 7) {
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                    loopGuard++;
                }

                const newRounds = [];
                let roundGuard = 0;

                while (currentDate <= end && roundGuard < 104) {
                    newRounds.push({
                        seasonId: seasonId,
                        courseId: defaultCourseId || null,
                        date: new Date(currentDate),
                        status: "scheduled",
                    });

                    currentDate.setUTCDate(currentDate.getUTCDate() + 7);
                    roundGuard++;
                }

                if (newRounds.length > 0) {
                    await db.insert(rounds).values(newRounds);
                }
            }
        }
    }

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
    redirect(`/dashboard/${leagueSlug}/schedule`);
}

export async function deleteSeason(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const seasonId = formData.get("seasonId") as string;

    // Cascade delete handles rounds/matches
    await db.delete(seasons).where(eq(seasons.id, seasonId));

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
    redirect(`/dashboard/${leagueSlug}/schedule`);
}

export async function updateRound(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const roundId = formData.get("roundId") as string;
    const courseId = formData.get("courseId") as string || null;
    const dateStr = formData.get("date") as string;
    const status = formData.get("status") as string;
    const holesCount = parseInt(formData.get("holesCount") as string) || 18;
    const roundType = formData.get("roundType") as string || "18_holes";

    await db.update(rounds)
        .set({
            courseId: courseId || null,
            date: new Date(dateStr),
            status,
            holesCount,
            roundType,
        })
        .where(eq(rounds.id, roundId));

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
    redirect(`/dashboard/${leagueSlug}/schedule`);
}

export async function deleteRound(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const roundId = formData.get("roundId") as string;

    await db.delete(rounds).where(eq(rounds.id, roundId));

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
    redirect(`/dashboard/${leagueSlug}/schedule`);
}

export async function createMatch(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const roundId = formData.get("roundId") as string;
    const team1Id = formData.get("team1Id") as string;
    const team2Id = formData.get("team2Id") as string;

    // Get League (Organization) ID for handicap lookup
    const [league] = await db.select().from(organizations).where(eq(organizations.slug, leagueSlug)).limit(1);
    if (!league) throw new Error("League not found");

    // Create Match
    const [match] = await db.insert(matches).values({
        roundId,
        format: 'match_play' // or maybe 'four_ball' if it's 2v2? Keep generic for now.
    }).returning();

    // Helper to add a whole team
    const addTeam = async (teamId: string) => {
        // Fetch all members of this team
        const members = await db
            .select({
                userId: leagueMembers.userId,
                handicap: leagueMembers.handicap,
            })
            .from(teamMembers)
            .innerJoin(leagueMembers, eq(teamMembers.leagueMemberId, leagueMembers.id))
            .where(eq(teamMembers.teamId, teamId));

        // Add each member to the match
        for (const member of members) {
            await db.insert(matchPlayers).values({
                matchId: match.id,
                userId: member.userId,
                teamId: teamId, // Important: Link them to the team within the match
                startingHandicap: member.handicap ? member.handicap.toString() : null
            });
        }
    };

    if (team1Id) await addTeam(team1Id);
    if (team2Id) await addTeam(team2Id);

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
}

export async function deleteMatch(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const matchId = formData.get("matchId") as string;

    await db.delete(matches).where(eq(matches.id, matchId));

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
}

export async function generateSchedule(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const seasonId = formData.get("seasonId") as string;

    // 1. Get League & Season
    const [league] = await db.select().from(organizations).where(eq(organizations.slug, leagueSlug)).limit(1);
    const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId)).limit(1);

    if (!league || !season) throw new Error("Invalid league or season");

    // 2. Get Teams
    const allTeams = await db.select().from(teams).where(eq(teams.organizationId, league.id));
    if (allTeams.length < 2) {
        // Not enough teams to schedule
        return;
    }

    // 3. Get Rounds (sorted by date)
    const seasonRounds = await db
        .select()
        .from(rounds)
        .where(eq(rounds.seasonId, seasonId))
        .orderBy(asc(rounds.date));

    if (seasonRounds.length === 0) return;

    // 4. Round Robin Algorithm

    // If odd number of teams, add a "BYE" (null)
    // Actually, handling distinct types is annoying in TS, let's just use specific logic.
    // Simpler: Just allow the array to be odd length and handle indices.

    // Actually, adding a dummy object is easier logic-wise.
    // Let's type it as Team | null.
    let pool: (typeof allTeams[0] | null)[] = [...allTeams];
    if (pool.length % 2 !== 0) {
        pool.push(null); // The "Dummy"/Bye
    }

    const numTeams = pool.length; // Now always even
    const numRounds = numTeams - 1; // Complete round robin
    const half = numTeams / 2;

    const roundPairings: Array<Array<[typeof allTeams[0], typeof allTeams[0]]>> = [];

    for (let r = 0; r < numRounds; r++) {
        const roundMatches: Array<[typeof allTeams[0], typeof allTeams[0]]> = [];
        for (let i = 0; i < half; i++) {
            const teamA = pool[i];
            const teamB = pool[numTeams - 1 - i];

            // If neither is null, it's a valid match
            if (teamA && teamB) {
                roundMatches.push([teamA, teamB]);
            }
        }
        roundPairings.push(roundMatches);

        // Rotate for next round (keep index 0 fixed, rotate the rest)
        // [0, 1, 2, 3, 4, 5] -> [0, 5, 1, 2, 3, 4]
        pool = [
            pool[0],
            pool[pool.length - 1],
            ...pool.slice(1, pool.length - 1)
        ];
    }

    // 5. Assign Assignments to Rounds
    // If we have more rounds than pairings, we cycle through them modulo available pairings.

    for (let i = 0; i < seasonRounds.length; i++) {
        const round = seasonRounds[i];

        // Skip if round already has matches (to prevent duplication)
        const existingMatches = await db.select().from(matches).where(eq(matches.roundId, round.id));
        if (existingMatches.length > 0) continue;

        // Get pairings for this week
        const weekPairings = roundPairings[i % roundPairings.length];

        // Create matches in DB
        for (const [teamA, teamB] of weekPairings) {
            // Create Match
            const [newMatch] = await db.insert(matches).values({
                roundId: round.id,
                format: 'match_play'
            }).returning();

            // Helper to fetch members and insert
            // Note: We need to recreate the insertTeamMembers logic as we are in a new scope now
            const insertTeamMembers = async (tId: string) => {
                const members = await db
                    .select({
                        userId: leagueMembers.userId,
                        handicap: leagueMembers.handicap,
                    })
                    .from(teamMembers)
                    .innerJoin(leagueMembers, eq(teamMembers.leagueMemberId, leagueMembers.id))
                    .where(eq(teamMembers.teamId, tId));

                for (const member of members) {
                    await db.insert(matchPlayers).values({
                        matchId: newMatch.id,
                        userId: member.userId,
                        teamId: tId,
                        startingHandicap: member.handicap ? member.handicap.toString() : null
                    });
                }
            };

            await insertTeamMembers(teamA.id);
            await insertTeamMembers(teamB.id);
        }
    }

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
}

export async function saveScorecard(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const matchId = formData.get("matchId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;
    // We expect inputs like "player-[matchPlayerId]-hole-[holeId]" -> value

    // 1. Get Match Info to verify
    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) throw new Error("Match not found");

    // Get the match to find the organization
    const [round] = await db
        .select({ seasonId: rounds.seasonId })
        .from(rounds)
        .where(eq(rounds.id, match.roundId))
        .limit(1);

    if (!round) throw new Error("Round not found");

    const [seasonInfo] = await db
        .select({ organizationId: seasons.organizationId })
        .from(seasons)
        .where(eq(seasons.id, round.seasonId))
        .limit(1);

    if (!seasonInfo) throw new Error("Season not found");

    // 2. Iterate through formData keys
    // We'll process them in a loop or collect and batched insert
    const updates: { matchPlayerId: string; holeId: string; grossScore: number }[] = [];

    // Simple strategy: Collect entries
    for (const [key, value] of formData.entries()) {
        if (key.startsWith("player-") && key.includes("-hole-")) {
            // "player-[mpId]-hole-[hId]"
            // const parts = key.split("-");
            // parts[0] = "player"
            // parts[1] = matchPlayerId (uuid)
            // parts[2] = "hole"
            // parts[3] = holeId (uuid) -- wait, UUIDs can contain hyphens? YES.
            // Split by known separators is safer.

            // Robust parsing:
            // pattern: player-(matchPlayerId)-hole-(holeId)
            // But UUIDs have dashes. regex is safer.
            const matchResult = key.match(/^player-(.+)-hole-(.+)$/);
            if (matchResult) {
                const matchPlayerId = matchResult[1];
                const holeId = matchResult[2];
                const grossScore = parseInt(value as string);

                if (!isNaN(grossScore) && grossScore > 0) {
                    updates.push({ matchPlayerId, holeId, grossScore });
                }
            }
        }
    }

    // 3. Batched Upsert or Delete/Insert?
    // Postgres upsert with ON CONFLICT is good but Drizzle syntax varies.
    // For simplicity, let's delete existing scores for these combinations and re-insert.
    // Ideally we update individually or use raw sql upsert.
    // Let's use individual deletes/inserts for absolute safety for now or find/update.

    // Better: Filter valid updates
    const playerIds = new Set<string>();

    if (updates.length > 0) {
        // Warning: This loop is N+1 DB calls if not careful.
        // For a scorecard, 18 holes * 4 players = 72 queries. Not great but acceptable for MVP.
        // Optimization: Use db.transaction
        await db.transaction(async (tx) => {
            for (const update of updates) {
                // Remove existing score for this player/hole
                await tx.delete(scores).where(
                    and(
                        eq(scores.matchPlayerId, update.matchPlayerId),
                        eq(scores.holeId, update.holeId)
                    )
                );

                // Insert new
                await tx.insert(scores).values({
                    matchPlayerId: update.matchPlayerId,
                    holeId: update.holeId,
                    grossScore: update.grossScore,
                    updatedBy: session.user?.id
                });
            }

            // Get all unique players from this match to recalculate handicaps
            const playersInMatch = await tx
                .select({ userId: matchPlayers.userId })
                .from(matchPlayers)
                .where(eq(matchPlayers.matchId, matchId));

            playersInMatch.forEach(p => playerIds.add(p.userId));
        });

        // 4. Auto-update handicaps for all players in this match
        const { updatePlayerHandicap } = await import("@/lib/handicap-service");

        for (const userId of playerIds) {
            try {
                await updatePlayerHandicap(userId, seasonInfo.organizationId);
                logger.info({ userId, matchId }, "Handicap auto-updated after scorecard save");
            } catch (error) {
                // Don't fail the whole save if handicap update fails
                logger.error({ error, userId, matchId }, "Failed to auto-update handicap");
            }
        }
    }

    revalidatePath(`/dashboard/${leagueSlug}/scorecard/${matchId}`);
    revalidatePath(`/dashboard/${leagueSlug}/leaderboard`);
}

export async function setupMatch(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const matchId = formData.get("matchId") as string;

    // Iterate over keys to find player tee assignments
    // key format: "player-{matchPlayerId}-tee" -> value: teeId

    const updates: { matchPlayerId: string; teeId: string }[] = [];

    for (const [key, value] of formData.entries()) {
        if (key.startsWith("player-") && key.endsWith("-tee")) {
            // "player-[id]-tee"
            const matchPlayerId = key.replace("player-", "").replace("-tee", "");
            const teeId = value as string;

            if (teeId && teeId !== "") {
                updates.push({ matchPlayerId, teeId });
            }
        }
    }

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            for (const update of updates) {
                await tx.update(matchPlayers)
                    .set({ teeId: update.teeId })
                    .where(eq(matchPlayers.id, update.matchPlayerId));
            }
        });
    }

    revalidatePath(`/dashboard/${leagueSlug}/scorecard/${matchId}`);
    // Redirect to scorecard after setup
    redirect(`/dashboard/${leagueSlug}/scorecard/${matchId}`);
}

/**
 * Manually recalculate handicaps for all members in a league.
 * Only accessible to league admins.
 */
export async function recalculateLeagueHandicaps(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const organizationId = formData.get("organizationId") as string;

    // 1. Verify caller is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) throw new Error("Unauthorized - Not an Admin");

    // 2. Get all members of the league
    const members = await db
        .select({ userId: leagueMembers.userId })
        .from(leagueMembers)
        .where(eq(leagueMembers.organizationId, organizationId));

    // 3. Recalculate handicap for each member
    const { updatePlayerHandicap } = await import("@/lib/handicap-service");

    let successCount = 0;
    let errorCount = 0;

    for (const member of members) {
        try {
            await updatePlayerHandicap(member.userId, organizationId);
            successCount++;
            logger.info({ userId: member.userId, organizationId }, "Handicap recalculated");
        } catch (error) {
            errorCount++;
            logger.error({ error, userId: member.userId, organizationId }, "Failed to recalculate handicap");
        }
    }

    logger.info({
        organizationId,
        totalMembers: members.length,
        successCount,
        errorCount
    }, "Bulk handicap recalculation completed");

    revalidatePath(`/dashboard/${leagueSlug}/members`);
    revalidatePath(`/dashboard/${leagueSlug}/leaderboard`);
    redirect(`/dashboard/${leagueSlug}/members`);
}

