import { auth } from "@/auth";
import { db } from "@/db";
import { leagueMembers, organizations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export class AuthError extends Error {
    constructor(message: string = "Unauthorized") {
        super(message);
        this.name = "AuthError";
    }
}

/**
 * Returns the current session or throws an AuthError if unauthenticated.
 * Useful for Server Actions and API Routes.
 */
export async function getAuthenticatedSession() {
    const session = await auth();
    if (!session?.user?.id) {
        throw new AuthError();
    }
    return session as { user: { id: string } };
}

/**
 * Validates if the current user has a specific role in an organization.
 * Throws AuthError if validation fails.
 */
export async function validateMemberRole(organizationId: string, allowedRoles: ("admin" | "player")[] = ["admin"]) {
    const session = await getAuthenticatedSession();

    const userId = session.user.id;

    const [membership] = await db
        .select({
            role: leagueMembers.role,
        })
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, organizationId),
                eq(leagueMembers.userId, userId)
            )
        )
        .limit(1);

    if (!membership || !allowedRoles.includes(membership.role as "admin" | "player")) {
        throw new AuthError("Forbidden: Insufficient permissions");
    }

    return { session, membership };
}

export async function getLeagueMember(slug: string) {
    const session = await auth();
    if (!session?.user?.id) redirect("/api/auth/signin");

    const [league] = await db
        .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            handicapPercentage: organizations.handicapPercentage,
            minScoresToCalculate: organizations.minScoresToCalculate,
            role: leagueMembers.role,
        })
        .from(organizations)
        .innerJoin(leagueMembers, eq(organizations.id, leagueMembers.organizationId))
        .where(
            and(
                eq(organizations.slug, slug),
                eq(leagueMembers.userId, session.user.id)
            )
        )
        .limit(1);

    if (!league) {
        redirect("/dashboard");
    }

    return league;
}

export async function getLeagueAdmin(slug: string) {
    const league = await getLeagueMember(slug);

    if (league.role !== "admin") {
        redirect(`/dashboard/${slug}`);
    }

    return league;
}
