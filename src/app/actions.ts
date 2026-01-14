"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { eq, and } from "drizzle-orm";
import { organizations, leagueMembers, courses, tees, user } from "@/db/schema";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ... existing actions ...

export async function addMemberToLeague(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const organizationId = formData.get("organizationId") as string;
    const leagueSlug = formData.get("leagueSlug") as string;
    const email = (formData.get("email") as string).toLowerCase();
    const role = formData.get("role") as "admin" | "player";

    // 1. Verify caller is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, organizationId),
                eq(leagueMembers.userId, session.user.id!),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!membership) throw new Error("Unauthorized");

    // 2. Find or create user
    let [targetUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

    if (!targetUser) {
        [targetUser] = await db.insert(user).values({
            email,
        }).returning();
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
            userId: targetUser.id,
            organizationId,
            role,
        });
    }

    revalidatePath(`/dashboard/${leagueSlug}/members`);
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
                eq(leagueMembers.userId, session.user.id!),
                eq(leagueMembers.role, "admin")
            )
        )
        .limit(1);

    if (!callerMembership) throw new Error("Unauthorized");

    // 3. Prevent deleting yourself if you're the only admin (optional safety)

    await db.delete(leagueMembers).where(eq(leagueMembers.id, memberId));

    revalidatePath(`/dashboard/${leagueSlug}/members`);
}

export async function createLeague(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;

    if (!name || !slug) {
        throw new Error("Name and Slug are required");
    }

    // 1. Create the organization
    const [org] = await db.insert(organizations).values({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
    }).returning();

    // 2. Add the user as the admin member
    await db.insert(leagueMembers).values({
        userId: session.user.id!,
        organizationId: org.id,
        role: "admin",
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
}

export async function createCourse(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const state = formData.get("state") as string;

    const [course] = await db.insert(courses).values({
        name,
        city,
        state,
    }).returning();

    revalidatePath(`/dashboard/${leagueSlug}/courses`);
    redirect(`/dashboard/${leagueSlug}/courses/${course.id}`);
}

export async function createTee(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueSlug = formData.get("leagueSlug") as string;
    const courseId = formData.get("courseId") as string;
    const name = formData.get("name") as string;
    const par = parseInt(formData.get("par") as string);
    const rating = formData.get("rating") as string;
    const slope = parseInt(formData.get("slope") as string);

    await db.insert(tees).values({
        courseId,
        name,
        par,
        rating,
        slope,
    });

    revalidatePath(`/dashboard/${leagueSlug}/courses/${courseId}`);
    redirect(`/dashboard/${leagueSlug}/courses/${courseId}`);
}

export async function updateLeagueSettings(formData: FormData) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const leagueId = formData.get("leagueId") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const handicapPercentage = formData.get("handicapPercentage") as string;
    const minScoresToCalculate = parseInt(formData.get("minScoresToCalculate") as string) || 3;

    // Check if user is admin
    const [membership] = await db
        .select()
        .from(leagueMembers)
        .where(
            and(
                eq(leagueMembers.organizationId, leagueId),
                eq(leagueMembers.userId, session.user.id!),
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
