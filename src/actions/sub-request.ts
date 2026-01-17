"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { subRequests, matchPlayers, seasons, rounds, matches } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notificationService } from "@/services/notification-service";

export async function createSubRequest(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const matchId = formData.get("matchId") as string;
    const note = formData.get("note") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    // Find the player's slot in this match and organization ID
    const rows = await db
        .select({
            id: matchPlayers.id,
            userId: matchPlayers.userId,
            organizationId: seasons.organizationId,
            date: rounds.date
        })
        .from(matchPlayers)
        .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
        .innerJoin(rounds, eq(rounds.id, matches.roundId))
        .innerJoin(seasons, eq(seasons.id, rounds.seasonId))
        .where(
            and(
                eq(matchPlayers.matchId, matchId),
                eq(matchPlayers.userId, session.user.id)
            )
        )
        .limit(1);

    const playerSlot = rows[0];

    if (!playerSlot) throw new Error("Match participation not found");

    // Create Request
    await db.insert(subRequests).values({
        matchPlayerId: playerSlot.id,
        requestedByUserId: session.user.id,
        note,
        status: "open",
    });

    // Notify Subs via Service
    await notificationService.broadcastSubRequest(
        playerSlot.organizationId,
        playerSlot.date,
        note
    );

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
}

export async function acceptSubRequest(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const requestId = formData.get("requestId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    const [request] = await db
        .select()
        .from(subRequests)
        .where(eq(subRequests.id, requestId))
        .limit(1);

    if (!request) throw new Error("Request not found");
    if (request.status !== "open") throw new Error("Request is not open");

    await db.transaction(async (tx) => {
        // 1. Mark request as filled
        await tx.update(subRequests)
            .set({
                status: "filled",
                filledByUserId: session.user?.id,
                updatedAt: new Date()
            })
            .where(eq(subRequests.id, requestId));

        // 2. Put the sub in the match
        await tx.update(matchPlayers)
            .set({ userId: session.user?.id })
            .where(eq(matchPlayers.id, request.matchPlayerId));
    });

    // Notify the original player
    await notificationService.notifySubAccepted(
        request.requestedByUserId,
        session.user?.name || session.user?.email || "A sub"
    );

    revalidatePath(`/dashboard/${leagueSlug}/sub-requests`);
}

export async function cancelSubRequest(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    const requestId = formData.get("requestId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    const [request] = await db
        .select()
        .from(subRequests)
        .where(eq(subRequests.id, requestId))
        .limit(1);

    if (!request) throw new Error("Request not found");
    if (request.requestedByUserId !== session.user.id) throw new Error("Unauthorized");

    await db.update(subRequests)
        .set({
            status: "cancelled",
            updatedAt: new Date()
        })
        .where(eq(subRequests.id, requestId));

    revalidatePath(`/dashboard/${leagueSlug}/schedule`);
}
