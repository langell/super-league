"use server";

import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { redirect } from "next/navigation";

export async function updateUserProfile(userId: string, formData: FormData) {
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const image = formData.get("image") as string;
    const notificationPreference = formData.get("notificationPreference") as string;
    const leagueSlug = formData.get("leagueSlug") as string;

    const updateData: Partial<typeof user.$inferSelect> = {
        firstName,
        lastName,
        phone,
        notificationPreference,
        name: `${firstName} ${lastName}`, // Maintain legacy/derived name
    };

    if (image) {
        updateData.image = image;
    }

    await db.update(user)
        .set(updateData)
        .where(eq(user.id, userId));

    revalidatePath("/dashboard/[slug]/profile");
    revalidatePath("/dashboard");

    if (leagueSlug) {
        redirect(`/dashboard/${leagueSlug}`);
    } else {
        redirect("/dashboard");
    }
}
