import { db } from "@/db";
import { scores } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { updatePlayerHandicap } from "@/lib/handicap-service";
import { validateMemberRole } from "@/lib/auth-utils";

export async function POST(req: Request) {
    try {
        const { matchPlayerId, holeId, grossScore, organizationId } = await req.json();

        if (!matchPlayerId || !holeId || grossScore === undefined || !organizationId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // --- SECURITY FIX ---
        // Validate session and get role from DB, NOT from request body
        let session, membership;
        try {
            // Allow both admin and player, but we'll check the role for override permissions
            const result = await validateMemberRole(organizationId, ["admin", "player"]);
            session = result.session;
            membership = result.membership;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Unauthorized";
            return NextResponse.json({ error: message }, { status: 401 });
        }

        const userId = session.user.id;
        if (!userId) {
            return NextResponse.json({ error: "User ID not found in session" }, { status: 401 });
        }
        const isAdmin = membership.role === "admin";

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
                grossScore: grossScore, // Always set grossScore
            };

            if (isAdmin) {
                insertData.scoreOverride = grossScore;
            }

            result = await db.insert(scores).values(insertData).returning();
        }

        // 4. Trigger handicap update asynchronously
        if (organizationId) {
            // Use the verified userId from session
            await updatePlayerHandicap(userId, organizationId);
        }

        return NextResponse.json(result[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to record score" }, { status: 500 });
    }
}
