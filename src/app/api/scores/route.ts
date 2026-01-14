import { db } from "@/db";
import { scores } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updatePlayerHandicap } from "@/lib/handicap-service";

export async function POST(req: Request) {
    try {
        const { matchPlayerId, holeId, grossScore, organizationId, userId, isAdmin } = await req.json();

        if (!matchPlayerId || !holeId || grossScore === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

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
            const updateData: {
                updatedAt: Date;
                updatedBy: string;
                scoreOverride?: number;
                grossScore?: number;
            } = {
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
            const insertData: {
                matchPlayerId: string;
                holeId: string;
                updatedBy: string;
                scoreOverride?: number;
                grossScore: number;
            } = {
                matchPlayerId,
                holeId,
                updatedBy: userId,
                grossScore: isAdmin ? grossScore : grossScore,
            };

            if (isAdmin) {
                insertData.scoreOverride = grossScore;
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
