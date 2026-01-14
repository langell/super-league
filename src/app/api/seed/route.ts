import { db } from "@/db";
import { organizations, leagueMembers, user, teams, teamMembers, courses, seasons, rounds } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        console.log("🌱 Starting seed via API...");

        // 1. Find or Create Admin User (Me)
        const existingUsers = await db.select().from(user).limit(1);
        let adminUserId: string;

        if (existingUsers.length > 0) {
            adminUserId = existingUsers[0].id;
        } else {
            const [newUser] = await db.insert(user).values({
                email: "admin@example.com",
                firstName: "Admin",
                lastName: "User",
                username: "admin"
            }).returning();
            adminUserId = newUser.id;
        }

        // 2. Create League (Organization)
        const leagueSlug = "super-league-2026-" + Date.now(); // Unique slug to avoid conflicts if calling multiple times
        const [league] = await db.insert(organizations).values({
            name: "Super League 2026",
            slug: leagueSlug,
            handicapPercentage: "0.90",
        }).returning();

        // 3. Add Admin to League as Admin
        await db.insert(leagueMembers).values({
            userId: adminUserId,
            organizationId: league.id,
            role: "admin",
            handicap: "5.0",
        });

        // 4. Create Players (31 more players + 4 subs = 35 new users)
        const players: { id: string, name: string }[] = [];
        players.push({ id: adminUserId, name: "Me (Admin)" });

        for (let i = 1; i <= 35; i++) {
            const isSub = i > 31; // Last 4 are subs
            const [u] = await db.insert(user).values({
                email: `player${i}-${Date.now()}@example.com`,
                firstName: `Player`,
                lastName: `${i}`,
                username: `player${i}-${Date.now()}`,
                image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
            }).returning();

            await db.insert(leagueMembers).values({
                userId: u.id,
                organizationId: league.id,
                role: isSub ? "sub" : "player",
                handicap: (Math.random() * 25).toFixed(1),
            });

            if (!isSub) {
                players.push({ id: u.id, name: `Player ${i}` });
            }
        }

        // 5. Create 16 Teams
        for (let i = 0; i < 16; i++) {
            const teamName = `Team ${i + 1}`;
            const [team] = await db.insert(teams).values({
                organizationId: league.id,
                name: teamName,
            }).returning();

            const p1 = players[i * 2];
            const p2 = players[i * 2 + 1];

            if (p1) {
                const [lm1] = await db.select().from(leagueMembers).where(eq(leagueMembers.userId, p1.id)).limit(1);
                // We need to fetch by userId AND orgId to be safe, but newly created users map 1:1 roughly here.
                // Actually, let's fetch carefully from the members we just made. 
                // But simply:
                if (lm1) {
                    await db.insert(teamMembers).values({
                        teamId: team.id,
                        leagueMemberId: lm1.id,
                    });
                }
            }
            if (p2) {
                const [lm2] = await db.select().from(leagueMembers).where(eq(leagueMembers.userId, p2.id)).limit(1);
                if (lm2) {
                    await db.insert(teamMembers).values({
                        teamId: team.id,
                        leagueMemberId: lm2.id,
                    });
                }
            }
        }

        // 6. Create Course
        const [course] = await db.insert(courses).values({
            name: "Augusta National (Sim)",
            city: "Augusta",
            state: "GA",
        }).returning();

        // 7. Create Season & Rounds
        const [season] = await db.insert(seasons).values({
            organizationId: league.id,
            name: "Spring 2026",
            startDate: new Date("2026-04-01"),
            endDate: new Date("2026-08-01"),
            active: true,
        }).returning();

        const startDate = new Date("2026-04-01");
        for (let i = 0; i < 16; i++) {
            const roundDate = new Date(startDate);
            roundDate.setDate(startDate.getDate() + (i * 7));

            await db.insert(rounds).values({
                seasonId: season.id,
                courseId: course.id,
                date: roundDate,
                status: "scheduled",
            });
        }

        return NextResponse.json({
            success: true,
            message: "Seed complete",
            leagueSlug,
            adminUserId
        });

    } catch (error) {
        console.error("Seed error:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
