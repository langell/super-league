"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { leagueMembers, user } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";
import { memberSchema, validateRequest, type ActionResponse, type NotificationPreference } from "@/lib/validations";

const getMembersPath = (slug: string) => `/dashboard/${slug}/members`;

export async function addMemberToLeague(prevState: unknown, formData: FormData): Promise<ActionResponse> {
    const session = await auth();
    if (!session?.user) return { success: false, message: "Unauthorized" };

    const notificationPrefKey = "notificationPreference";
    const validation = validateRequest(memberSchema, {
        firstName: (formData.get("name") as string)?.split(' ')[0] || "",
        lastName: (formData.get("name") as string)?.split(' ').slice(1).join(' ') || "Player",
        email: formData.get("email") as string,
        role: (formData.get("role") as string) || "player",
        notificationPreference: (formData.get(notificationPrefKey) as NotificationPreference) || "sms",
    });

    if (!validation.success) {
        return { success: false, message: "Validation failed", fieldErrors: validation.errors };
    }

    const { email, firstName, lastName, role } = validation.data;
    const name = `${firstName} ${lastName}`;
    const organizationId = formData.get("organizationId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    // 1. Verify caller is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) return { success: false, message: "Unauthorized - Not an Admin" };

    try {
        // 2. Find or create user
        let [targetUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

        if (!targetUser) {
            [targetUser] = await db.insert(user).values({
                email,
                name: name || null,
                firstName: name ? name.split(' ')[0] : null,
                lastName: name ? (name.indexOf(' ') > -1 ? name.split(' ').slice(1).join(' ') : name) : null,
                phone: formData.get("phone") as string || null,
                notificationPreference: (formData.get(notificationPrefKey) as NotificationPreference) || "sms",
            }).returning();
        } else if (name && !targetUser.name) {
            const phone = formData.get("phone") as string;
            const pref = (formData.get(notificationPrefKey) as NotificationPreference) || "sms";

            // Update name if it wasn't set
            await db.update(user).set({
                name,
                firstName: name.split(' ')[0],
                lastName: name.indexOf(' ') > -1 ? name.split(' ').slice(1).join(' ') : name,
                ...(phone ? { phone } : {}),
                notificationPreference: pref
            }).where(eq(user.id, targetUser.id));
        }

        // 3. Add to league if not already member
        const [existingMember] = await db
            .select()
            .from(leagueMembers)
            .where(
                and(
                    eq(leagueMembers.organizationId, organizationId),
                    eq(leagueMembers.userId, targetUser.id)
                )
            )
            .limit(1);

        if (!existingMember) {
            await db.insert(leagueMembers).values({
                organizationId,
                userId: targetUser.id,
                role,
            });
            logger.info({ leagueSlug, email, role }, "New member added to league");
            revalidatePath(getMembersPath(leagueSlug));
            return { success: true, message: "Member added successfully" };
        }

        return { success: true, message: "User is already a member of this league." };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error({ error: errorMessage, leagueSlug, email }, "Failed to add member to league");
        return { success: false, message: "Internal server error" };
    }
}

export async function removeMemberFromLeague(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const memberId = formData.get("memberId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    // 1. Get member info to find organizationId
    const [memberToDelete] = await db.select().from(leagueMembers).where(eq(leagueMembers.id, memberId)).limit(1);
    if (!memberToDelete) return;

    // 2. Verify caller is admin of that league
    const [callerMembership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, memberToDelete.organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!callerMembership) throw new Error("Unauthorized");

    await db.delete(leagueMembers).where(eq(leagueMembers.id, memberId));

    revalidatePath(getMembersPath(leagueSlug));
}

export async function updateMember(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const memberId = formData.get("memberId") as string;
    const userId = formData.get("userId") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const role = formData.get("role") as "admin" | "player" | "sub";
    const handicap = formData.get("handicap") as string;
    const notificationPrefKey = "notificationPreference";
    const notificationPreference = (formData.get(notificationPrefKey) as NotificationPreference) || "sms";

    // 1. Verify caller is admin (of the league that this member belongs to)
    const [memberToUpdate] = await db.select().from(leagueMembers).where(eq(leagueMembers.id, memberId)).limit(1);
    if (!memberToUpdate) throw new Error("Member not found");

    const [callerMembership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, memberToUpdate.organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!callerMembership) throw new Error("Unauthorized");

    await db.transaction(async (tx) => {
        // 2. Update League Member Details
        await tx.update(leagueMembers)
            .set({
                role,
                handicap: handicap,
            })
            .where(eq(leagueMembers.id, memberId));

        // 3. Update User Details
        // Construct full name if changed
        let fullName = undefined;
        if (firstName && lastName) {
            fullName = `${firstName} ${lastName}`;
        } else if (firstName) {
            fullName = firstName;
        }

        await tx.update(user)
            .set({
                firstName,
                lastName,
                phone,
                name: fullName,
                notificationPreference,
            })
            .where(eq(user.id, userId));
    });

    const membersPath = getMembersPath(leagueSlug);
    revalidatePath(membersPath);
    redirect(membersPath);
}

export async function recalculateLeagueHandicaps(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const organizationId = formData.get("organizationId") as string;

    // 1. Verify caller is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, organizationId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) throw new Error("Unauthorized - Not an Admin");

    // 2. Get all members of the league
    const members = await db
        .select({ userId: leagueMembers.userId })
        .from(leagueMembers)
        .where(eq(leagueMembers.organizationId, organizationId));

    // 3. Recalculate handicap for each member
    const { updatePlayerHandicap } = await import("@/lib/handicap-service");

    let successCount = 0;
    let errorCount = 0;

    for (const member of members) {
        try {
            await updatePlayerHandicap(member.userId, organizationId);
            successCount++;
            logger.info({ userId: member.userId, organizationId }, "Handicap recalculated");
        } catch (error) {
            errorCount++;
            logger.error({ error, userId: member.userId, organizationId }, "Failed to recalculate handicap");
        }
    }

    logger.info({
        organizationId,
        totalMembers: members.length,
        successCount,
        errorCount
    }, "Bulk handicap recalculation completed");

    const membersPath = getMembersPath(leagueSlug);
    revalidatePath(membersPath);
    revalidatePath(`/dashboard/${leagueSlug}/leaderboard`);
    redirect(membersPath);
}
