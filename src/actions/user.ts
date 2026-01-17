"use server";

import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateUserProfile(userId: string, formData: FormData) {
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const phone = formData.get("phone") as string;
    const ghinId = formData.get("ghinId") as string;
    const venmoHandle = formData.get("venmoHandle") as string;

    await db.update(user)
        .set({
            firstName,
            lastName,
            phone,
            ghinId,
            venmoHandle,
            name: `${firstName} ${lastName}`, // Maintain legacy/derived name
        })
        .where(eq(user.id, userId));

    revalidatePath("/dashboard/[slug]/profile");
    revalidatePath("/dashboard");
}
