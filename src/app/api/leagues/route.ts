import { db } from "@/db";
import { organizations } from "@/db/schema";
import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/auth-utils";

export async function GET() {
    try {
        await getAuthenticatedSession();
        const leagues = await db.select().from(organizations);
        return NextResponse.json(leagues);
    } catch (error: unknown) {
        if (error instanceof Error && error.name === "AuthError") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Failed to fetch leagues" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await getAuthenticatedSession();
        const { name, slug } = await req.json();

        if (!name || !slug) {
            return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
        }

        const newLeague = await db.insert(organizations).values({
            name,
            slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        }).returning();

        return NextResponse.json(newLeague[0]);
    } catch (error: unknown) {
        if (error instanceof Error && error.name === "AuthError") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        console.error(error);
        return NextResponse.json({ error: "Failed to create league" }, { status: 500 });
    }
}
