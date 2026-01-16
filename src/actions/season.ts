"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { seasons, rounds } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSeason(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const organizationId = formData.get("organizationId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;
    const name = formData.get("name") as string;

    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const frequencyDay = formData.get("frequencyDay") as string; // 0-6
    const defaultCourseId = formData.get("defaultCourseId") as string || null;
    const defaultHolesCount = parseInt(formData.get("defaultHolesCount") as string) || 18; // 9 or 18
    const rotationStrategy = formData.get("rotationStrategy") as string || "18_holes";

    if (!name) throw new Error("Name is required");

    const [season] = await db.insert(seasons).values({
        organizationId,
        name,
        startDate: startDateStr ? new Date(startDateStr) : null,
        endDate: endDateStr ? new Date(endDateStr) : null,
        active: true,
    }).returning();

    if (startDateStr && endDateStr && frequencyDay !== "" && frequencyDay !== null) {
        const start = new Date(startDateStr + 'T12:00:00Z');
        const end = new Date(endDateStr + 'T12:00:00Z');
        const targetDay = parseInt(frequencyDay);

        if (!isNaN(targetDay) && start <= end) {
            const currentDate = new Date(start);
            let loopGuard = 0;
            while (currentDate.getUTCDay() !== targetDay && loopGuard < 7) {
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                loopGuard++;
            }

            const newRounds = [];
            let roundGuard = 0;
            let rotationIndex = 0;

            while (currentDate <= end && roundGuard < 104) {
                let roundType = "18_holes";
                if (defaultHolesCount === 9) {
                    if (rotationStrategy === "rotate") {
                        roundType = rotationIndex % 2 === 0 ? "front_9" : "back_9";
                        rotationIndex++;
                    } else {
                        roundType = rotationStrategy;
                    }
                }

                newRounds.push({
                    seasonId: season.id,
                    courseId: defaultCourseId || null,
                    date: new Date(currentDate),
                    status: "scheduled",
                    holesCount: defaultHolesCount,
                    roundType: roundType
                });

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

export async function updateSeason(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const seasonId = formData.get("seasonId") as string;
    const name = formData.get("name") as string;
    const active = formData.get("active") === "true";

    const startDateStr = formData.get("startDate") as string;
    const endDateStr = formData.get("endDate") as string;
    const frequencyDay = formData.get("frequencyDay") as string;
    const defaultCourseId = formData.get("defaultCourseId") as string || null;

    if (!name) throw new Error("Name is required");

    await db.update(seasons).set({
        name,
        active,
    }).where(eq(seasons.id, seasonId));

    if (startDateStr && endDateStr && frequencyDay !== "" && frequencyDay !== null) {
        const existingRounds = await db.select().from(rounds).where(eq(rounds.seasonId, seasonId));

        if (existingRounds.length === 0) {
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

    await db.delete(seasons).where(eq(seasons.id, seasonId));

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
    redirect(`/dashboard/${leagueSlug}/schedule`);
}
