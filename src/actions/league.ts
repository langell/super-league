"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { organizations, leagueMembers } from "@/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { leagueSchema } from "@/lib/validations";

export async function createLeague(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const rawData = {
        name: formData.get("name"),
        slug: formData.get("slug"),
    };

    const validated = leagueSchema.safeParse(rawData);
    if (!validated.success) {
        throw new Error("Invalid input: " + JSON.stringify(validated.error.flatten().fieldErrors));
    }

    const { name, slug } = validated.data;

    // 1. Create the organization
    const [org] = await db.insert(organizations).values({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    }).returning();

    // 2. Add the user as the admin member
    await db.insert(leagueMembers).values({
        userId: session.user.id ?? "",
        organizationId: org.id,
        role: "admin",
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
}

export async function updateLeagueSettings(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueId = formData.get("leagueId") as string;
    const rawData = {
        name: formData.get("name"),
        slug: formData.get("slug"),
        handicapPercentage: formData.get("handicapPercentage"),
        minScoresToCalculate: parseInt(formData.get("minScoresToCalculate") as string) || 3,
    };

    const validated = leagueSchema.safeParse(rawData);
    if (!validated.success) {
        throw new Error("Invalid input: " + JSON.stringify(validated.error.flatten().fieldErrors));
    }

    const { name, slug, handicapPercentage, minScoresToCalculate } = validated.data;

    // Check if user is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, leagueId),
                eq(leagueMembers.userId, session.user.id ?? ""),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) throw new Error("Unauthorized");

    await db
        .update(organizations)
        .set({
            name,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
            handicapPercentage,
            minScoresToCalculate,
        })
        .where(eq(organizations.id, leagueId));

    revalidatePath(`/dashboard/${slug}/settings`);
    revalidatePath(`/dashboard/${slug}`);
    redirect(`/dashboard/${slug}`);
}
