"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { courses, tees, holes } from "@/db/schema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "@/lib/logger";
import { getCourseDetails } from "@/lib/course-api";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
    const jsonString = responseText.replace(/```json\n?|\n?```/g, "").trim();

    try {
        return JSON.parse(jsonString);
    } catch {
        logger.error({ responseText }, "Failed to parse Gemini response");
        throw new Error("Failed to extract data from scorecard image.");
    }
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
            await tx.update(courses)
                .set({
                    name: courseData.name,
                    city: courseData.city,
                    state: courseData.state,
                })
                .where(eq(courses.id, courseId));

            const existingTees = await tx.select({ id: tees.id }).from(tees).where(eq(tees.courseId, courseId));

            if (existingTees.length > 0) {
                const teeIds = existingTees.map(t => t.id);
                for (const tId of teeIds) {
                    await tx.delete(holes).where(eq(holes.teeId, tId));
                }
                await tx.delete(tees).where(eq(tees.courseId, courseId));
            }

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
        const existingTees = await tx.select({ id: tees.id }).from(tees).where(eq(tees.courseId, courseId));
        if (existingTees.length > 0) {
            const teeIds = existingTees.map(t => t.id);
            for (const tId of teeIds) {
                await tx.delete(holes).where(eq(holes.teeId, tId));
            }
        }
        await tx.delete(tees).where(eq(tees.courseId, courseId));
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
