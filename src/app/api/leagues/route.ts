import { db } from "@/db";
import { organizations } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const leagues = await db.select().from(organizations);
        return NextResponse.json(leagues);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch leagues" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { name, slug } = await req.json();

        if (!name || !slug) {
            return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
        }

        const newLeague = await db.insert(organizations).values({
            name,
            slug,
        }).returning();

        return NextResponse.json(newLeague[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create league" }, { status: 500 });
    }
}
