import { config } from "dotenv";
config({ path: ".env.local" });
import { db } from "./index";
import { organizations, leagueMembers, user, teams, teamMembers, courses, seasons, rounds } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("🌱 Starting seed...");

    // 1. Find or Create Admin User (Me)
    // We'll grabbing the first user we find to be the "Admin/Me"
    const existingUsers = await db.select().from(user).limit(1);
    let adminUserId: string;

    if (existingUsers.length > 0) {
        adminUserId = existingUsers[0].id;
        console.log(`Found existing user (Admin): ${existingUsers[0].email}`);
    } else {
        const [newUser] = await db.insert(user).values({
            email: "admin@example.com",
            firstName: "Admin",
            lastName: "User",
            username: "admin"
        }).returning();
        adminUserId = newUser.id;
        console.log(`Created new admin user: ${newUser.email}`);
    }

    // 2. Create League (Organization)
    const leagueSlug = "super-league-2026";
    const [league] = await db.insert(organizations).values({
        name: "Super League 2026",
        slug: leagueSlug,
        handicapPercentage: "0.90",
    }).returning();
    console.log(`Created League: ${league.name}`);

    // 3. Add Admin to League as Admin
    await db.insert(leagueMembers).values({
        userId: adminUserId,
        organizationId: league.id,
        role: "admin",
        handicap: "5.0", // Admin is a decent golfer
    });

    // 4. Create Players (31 more players + 4 subs = 35 new users)
    const players: { id: string, name: string }[] = [];
    players.push({ id: adminUserId, name: "Me (Admin)" });

    for (let i = 1; i <= 35; i++) {
        const isSub = i > 31; // Last 4 are subs
        const [u] = await db.insert(user).values({
            email: `player${i}@example.com`,
            firstName: `Player`,
            lastName: `${i}`,
            username: `player${i}`,
            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`, // Random avatar
        }).returning();

        // Add to League
        await db.insert(leagueMembers).values({
            userId: u.id,
            organizationId: league.id,
            role: isSub ? "sub" : "player",
            handicap: (Math.random() * 25).toFixed(1), // Random handicap 0-25
        });

        if (!isSub) {
            players.push({ id: u.id, name: `Player ${i}` });
        }
    }
    console.log(`Created 35 additional users (31 players + 4 subs).`);

    // 5. Create 16 Teams (Assign the 32 main players)
    // Admin (Player 0) is in the list of 32
    for (let i = 0; i < 16; i++) {
        const teamName = `Team ${i + 1}`;
        const [team] = await db.insert(teams).values({
            organizationId: league.id,
            name: teamName,
        }).returning();

        // Assign 2 players
        const p1 = players[i * 2];
        const p2 = players[i * 2 + 1];

        if (p1) {
            // Need leagueMemberId, not userId.
            const [lm1] = await db.select().from(leagueMembers).where(eq(leagueMembers.userId, p1.id)).limit(1);
            await db.insert(teamMembers).values({
                teamId: team.id,
                leagueMemberId: lm1.id,
            });
        }
        if (p2) {
            const [lm2] = await db.select().from(leagueMembers).where(eq(leagueMembers.userId, p2.id)).limit(1);
            await db.insert(teamMembers).values({
                teamId: team.id,
                leagueMemberId: lm2.id,
            });
        }
    }
    console.log(`Created 16 Teams with 2 players each.`);

    // 6. Create Course
    const [course] = await db.insert(courses).values({
        name: "Augusta National (Sim)",
        city: "Augusta",
        state: "GA",
    }).returning();
    console.log(`Created Course: ${course.name}`);

    // 7. Create Season & Rounds
    const [season] = await db.insert(seasons).values({
        organizationId: league.id,
        name: "Spring 2026",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-08-01"),
        active: true,
    }).returning();
    console.log(`Created Season: ${season.name}`);

    // 16 Weeks of Rounds
    const startDate = new Date("2026-04-01"); // Wednesday
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
    console.log(`Created 16 Rounds.`);

    console.log(`✅ Seed complete!`);
    console.log(`League Slug: ${leagueSlug}`);
    console.log(`Admin User ID: ${adminUserId}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
