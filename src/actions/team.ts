"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { teams, teamMembers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const organizationId = formData.get("organizationId") as string;
    const name = formData.get("name") as string;

    await db.insert(teams).values({
        organizationId,
        name,
    });

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
}

export async function deleteTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const teamId = formData.get("teamId") as string;

    await db.delete(teams).where(eq(teams.id, teamId));

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
}

export async function removeMemberFromTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const teamMemberId = formData.get("teamMemberId") as string;

    await db.delete(teamMembers).where(eq(teamMembers.id, teamMemberId));

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
}

export async function addMemberToTeam(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const teamId = formData.get("teamId") as string;
    const leagueMemberId = formData.get("leagueMemberId") as string;

    const existingMembers = await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (existingMembers.length >= 2) throw new Error("Team is full");

    await db.insert(teamMembers).values({
        teamId,
        leagueMemberId,
    });

    revalidatePath(`/dashboard/${leagueSlug}/teams`);
    redirect(`/dashboard/${leagueSlug}/teams`);
}
