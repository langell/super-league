"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { organizations, leagueMembers, courses, tees, user, holes } from "@/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCourseDetails } from "@/lib/course-api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ... existing actions ...

export async function scanScorecardAction(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const imageFile = formData.get("scorecard") as File;
    if (!imageFile) throw new Error("No image provided");

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
        console.error("Failed to parse Gemini response:", responseText);
        throw new Error("Failed to extract data from scorecard image.");
    }
}

export async function addMemberToLeague(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const organizationId = formData.get("organizationId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;
    const email = (formData.get("email") as string).toLowerCase();
    const name = formData.get("name") as string;
    const role = formData.get("role") as "admin" | "player";

    // 1. Verify caller is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, organizationId),
                eq(leagueMembers.userId, session.user.id!),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) throw new Error("Unauthorized");

    // 2. Find or create user
    let [targetUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

    if (!targetUser) {
        [targetUser] = await db.insert(user).values({
            email,
            name: name || null,
        }).returning();
    } else if (name && !targetUser.name) {
        // Update name if it wasn't set
        await db.update(user).set({ name }).where(eq(user.id, targetUser.id));
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
            userId: targetUser.id,
            organizationId,
            role,
        });
    }

    revalidatePath(`/dashboard/${leagueSlug}/members`);
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
                eq(leagueMembers.userId, session.user.id!),
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
        userId: session.user.id!,
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
                eq(leagueMembers.userId, session.user.id!),
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
