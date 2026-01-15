import { db } from "@/db";
import { scores, matchPlayers, tees, leagueMembers, organizations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { calculateDifferential, calculateHandicapIndex } from "./handicap";

/**
 * Recalculates and updates a user's handicap for a specific league.
 */
export async function updatePlayerHandicap(userId: string, organizationId: string) {
    // 1. Fetch the last 20 scores for this user in this league
    // This is a simplified version - in a real app, we might check if the round is "handicap-eligible"
    const userScores = await db
        .select({
            grossScore: scores.grossScore,
            scoreOverride: scores.scoreOverride,
            rating: tees.rating,
            slope: tees.slope,
        })
        .from(scores)
        .innerJoin(matchPlayers, eq(scores.matchPlayerId, matchPlayers.id))
        .innerJoin(tees, eq(matchPlayers.teeId, tees.id))
        .where(eq(matchPlayers.userId, userId))
        .limit(20)
        .orderBy(desc(scores.updatedAt));

    if (userScores.length === 0) return;

    // 2. Fetch league settings
    const league = await db
        .select({
            handicapPercentage: organizations.handicapPercentage,
            minScoresToCalculate: organizations.minScoresToCalculate,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

    if (league.length === 0) return;

    const { handicapPercentage, minScoresToCalculate } = league[0];

    if (userScores.length < minScoresToCalculate) return;

    // 3. Calculate differentials
    const differentials = userScores.map((s) => {
        const finalScore = s.scoreOverride ?? s.grossScore ?? 0;
        const rating = Number(s.rating);
        const slope = s.slope;
        return calculateDifferential(finalScore, rating, slope);
    });

    // 4. Calculate new index
    const newHandicap = calculateHandicapIndex(
        differentials,
        Number(handicapPercentage)
    );

    // 5. Update the league_members table
    await db
        .update(leagueMembers)
        .set({ handicap: newHandicap.toString() })
        .where(
            and(
                eq(leagueMembers.userId, userId),
                eq(leagueMembers.organizationId, organizationId)
            )
        );

    return newHandicap;
}
