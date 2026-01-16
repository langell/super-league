"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { matches, rounds, seasons, scores, matchPlayers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import logger from "@/lib/logger";

export async function saveScorecard(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const matchId = formData.get("matchId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (!match) throw new Error("Match not found");

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

    const updates: { matchPlayerId: string; holeId: string; grossScore: number }[] = [];

    for (const [key, value] of formData.entries()) {
        if (key.startsWith("player-") && key.includes("-hole-")) {
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

    const playerIds = new Set<string>();

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            for (const update of updates) {
                await tx.delete(scores).where(
                    and(
                        eq(scores.matchPlayerId, update.matchPlayerId),
                        eq(scores.holeId, update.holeId)
                    )
                );

                await tx.insert(scores).values({
                    matchPlayerId: update.matchPlayerId,
                    holeId: update.holeId,
                    grossScore: update.grossScore,
                    updatedBy: session.user?.id
                });
            }

            const playersInMatch = await tx
                .select({ userId: matchPlayers.userId })
                .from(matchPlayers)
                .where(eq(matchPlayers.matchId, matchId));

            playersInMatch.forEach(p => playerIds.add(p.userId));
        });

        const { updatePlayerHandicap } = await import("@/lib/handicap-service");

        for (const userId of playerIds) {
            try {
                await updatePlayerHandicap(userId, seasonInfo.organizationId);
                logger.info({ userId, matchId }, "Handicap auto-updated after scorecard save");
            } catch (error) {
                logger.error({ error, userId, matchId }, "Failed to auto-update handicap");
            }
        }
    }

    revalidatePath(`/dashboard/${leagueSlug}/scorecard/${matchId}`);
    revalidatePath(`/dashboard/${leagueSlug}/leaderboard`);
}
