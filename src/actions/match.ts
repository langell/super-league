"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { matches, matchPlayers, organizations, teamMembers, leagueMembers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMatch(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const roundId = formData.get("roundId") as string;
    const team1Id = formData.get("team1Id") as string;
    const team2Id = formData.get("team2Id") as string;

    const [league] = await db.select().from(organizations).where(eq(organizations.slug, leagueSlug)).limit(1);
    if (!league) throw new Error("League not found");

    const [match] = await db.insert(matches).values({
        roundId,
        format: 'match_play'
    }).returning();

    const addTeam = async (teamId: string) => {
        const members = await db
            .select({
                userId: leagueMembers.userId,
                handicap: leagueMembers.handicap,
            })
            .from(teamMembers)
            .innerJoin(leagueMembers, eq(teamMembers.leagueMemberId, leagueMembers.id))
            .where(eq(teamMembers.teamId, teamId));

        for (const member of members) {
            await db.insert(matchPlayers).values({
                matchId: match.id,
                userId: member.userId,
                teamId: teamId,
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

export async function setupMatch(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const matchId = formData.get("matchId") as string;

    const updates: { matchPlayerId: string; teeId: string }[] = [];

    for (const [key, value] of formData.entries()) {
        if (key.startsWith("player-") && key.endsWith("-tee")) {
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
    redirect(`/dashboard/${leagueSlug}/scorecard/${matchId}`);
}
