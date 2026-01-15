import { auth } from "@/auth";
import { db } from "@/db";
import { leagueMembers, organizations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function getLeagueAdmin(slug: string) {
    const session = await auth();
    if (!session?.user) redirect("/api/auth/signin");

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
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!league) {
        redirect("/dashboard");
    }

    return league;
}
