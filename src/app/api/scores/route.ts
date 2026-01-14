import { db } from "@/db";
import { scores, matchPlayers, organizations, leagueMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updatePlayerHandicap } from "@/lib/handicap-service";

export async function POST(req: Request) {
    try {
        const { matchPlayerId, holeId, grossScore, organizationId, userId, isAdmin } = await req.json();

        if (!matchPlayerId || !holeId || grossScore === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Check if a score already exists for this hole/player
        const existingScore = await db
            .select()
            .from(scores)
            .where(
                and(
                    eq(scores.matchPlayerId, matchPlayerId),
                    eq(scores.holeId, holeId)
                )
            )
            .limit(1);

        let result;

        if (existingScore.length > 0) {
            // 2. Update existing score
            const updateData: any = {
                updatedAt: new Date(),
                updatedBy: userId,
            };

            if (isAdmin) {
                updateData.scoreOverride = grossScore;
            } else {
                updateData.grossScore = grossScore;
            }

            result = await db
                .update(scores)
                .set(updateData)
                .where(eq(scores.id, existingScore[0].id))
                .returning();
        } else {
            // 3. Create new score
            const insertData: any = {
                matchPlayerId,
                holeId,
                updatedBy: userId,
            };

            if (isAdmin) {
                insertData.scoreOverride = grossScore;
                insertData.grossScore = grossScore; // Initialize gross as well
            } else {
                insertData.grossScore = grossScore;
            }

            result = await db.insert(scores).values(insertData).returning();
        }

        // 4. Trigger handicap update asynchronously (optional based on requirements)
        // For this API, we'll do it synchronously for immediate feedback
        if (organizationId && userId) {
            await updatePlayerHandicap(userId, organizationId);
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to record score" }, { status: 500 });
    }
}
