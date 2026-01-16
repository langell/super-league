"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq, asc } from "drizzle-orm";
import { rounds, organizations, seasons, teams, matches, leagueMembers, teamMembers, matchPlayers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function generateSchedule(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const seasonId = formData.get("seasonId") as string;

    const [league] = await db.select().from(organizations).where(eq(organizations.slug, leagueSlug)).limit(1);
    const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId)).limit(1);

    if (!league || !season) throw new Error("Invalid league or season");

    const allTeams = await db.select().from(teams).where(eq(teams.organizationId, league.id));
    if (allTeams.length < 2) return;

    const seasonRounds = await db
        .select()
        .from(rounds)
        .where(eq(rounds.seasonId, seasonId))
        .orderBy(asc(rounds.date));

    if (seasonRounds.length === 0) return;

    let pool: (typeof allTeams[0] | null)[] = [...allTeams];
    if (pool.length % 2 !== 0) {
        pool.push(null);
    }

    const numTeams = pool.length;
    const numRounds = numTeams - 1;
    const half = numTeams / 2;

    const roundPairings: Array<Array<[typeof allTeams[0], typeof allTeams[0]]>> = [];

    for (let r = 0; r < numRounds; r++) {
        const roundMatches: Array<[typeof allTeams[0], typeof allTeams[0]]> = [];
        for (let i = 0; i < half; i++) {
            const teamA = pool[i];
            const teamB = pool[numTeams - 1 - i];

            if (teamA && teamB) {
                roundMatches.push([teamA, teamB]);
            }
        }
        roundPairings.push(roundMatches);

        pool = [
            pool[0],
            pool[pool.length - 1],
            ...pool.slice(1, pool.length - 1)
        ];
    }

    for (let i = 0; i < seasonRounds.length; i++) {
        const round = seasonRounds[i];

        const existingMatches = await db.select().from(matches).where(eq(matches.roundId, round.id));
        if (existingMatches.length > 0) continue;

        const weekPairings = roundPairings[i % roundPairings.length];

        for (const [teamA, teamB] of weekPairings) {
            const [newMatch] = await db.insert(matches).values({
                roundId: round.id,
                format: 'match_play'
            }).returning();

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
