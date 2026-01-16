import { config } from 'dotenv';
config({ path: '.env.local' });

async function simulate() {
    console.log('🚀 Starting Season Simulation...');

    // Dynamically import db after env is loaded
    const { db } = await import('../src/db');
    const { organizations, courses, tees, holes, user, leagueMembers, teams, teamMembers, seasons, rounds, matches, matchPlayers, scores } = await import('../src/db/schema');
    const { eq } = await import('drizzle-orm');

    // 1. Create or Find League
    console.log('Creating League...');
    const leagueSlug = 'sim-league-' + Date.now();
    const [league] = await db.insert(organizations).values({
        name: 'Simulation League',
        slug: leagueSlug,
    }).returning();

    // 2. Create Course, Tees, and Holes
    console.log('Creating Course...');
    const [course] = await db.insert(courses).values({
        name: 'Sim Valley Golf Club',
        city: 'Sim City',
        state: 'SC',
    }).returning();

    const [tee] = await db.insert(tees).values({
        courseId: course.id,
        name: 'Medal',
        par: 72,
        rating: '72.0',
        slope: 113,
    }).returning();

    console.log('Creating Holes...');
    const holeRecords = [];
    for (let i = 1; i <= 18; i++) {
        holeRecords.push({
            teeId: tee.id,
            holeNumber: i,
            par: [3, 4, 5][Math.floor(Math.random() * 3)],
            handicapIndex: i,
        });
    }
    const createdHoles = await db.insert(holes).values(holeRecords).returning();

    // 3. Create Teams and Players
    console.log('Creating Teams and Players...');
    const teamsList = [];

    for (let i = 1; i <= 4; i++) {
        const [team] = await db.insert(teams).values({
            organizationId: league.id,
            name: `Team ${i}`,
        }).returning();
        teamsList.push(team);

        for (let j = 1; j <= 2; j++) {
            const email = `player${i}-${j}-${Date.now()}@example.com`;
            const [u] = await db.insert(user).values({
                email,
                firstName: `Player`,
                lastName: `${i}-${j}`,
                name: `Player ${i}-${j}`,
            }).returning();

            const [membership] = await db.insert(leagueMembers).values({
                userId: u.id,
                organizationId: league.id,
                role: 'player',
                handicap: (Math.random() * 20).toFixed(1),
            }).returning();

            await db.insert(teamMembers).values({
                teamId: team.id,
                leagueMemberId: membership.id,
            });
        }
    }

    // 4. Create Season
    console.log('Creating Season...');
    const [season] = await db.insert(seasons).values({
        organizationId: league.id,
        name: 'Simulation Season 2026',
        active: true,
    }).returning();

    // 5. Create 4 Rounds
    console.log('Creating Rounds and Matches...');
    const roundDates = [
        new Date('2026-01-01'),
        new Date('2026-01-08'),
        new Date('2026-01-15'),
        new Date('2026-01-22'),
    ];

    for (let r = 0; r < 4; r++) {
        const status = r < 3 ? 'completed' : 'in_progress';
        const [round] = await db.insert(rounds).values({
            seasonId: season.id,
            courseId: course.id,
            date: roundDates[r],
            status,
            holesCount: 18,
        }).returning();

        const pairings: [number, number][] = r === 0 || r === 3 ? [[0, 1], [2, 3]] :
            r === 1 ? [[0, 2], [1, 3]] :
                [[0, 3], [1, 2]];

        for (const [idxA, idxB] of pairings) {
            const [match] = await db.insert(matches).values({
                roundId: round.id,
                format: 'match_play',
            }).returning();

            const tA = teamsList[idxA];
            const tB = teamsList[idxB];

            const membersA = await db.select().from(teamMembers).where(eq(teamMembers.teamId, tA.id));
            const membersB = await db.select().from(teamMembers).where(eq(teamMembers.teamId, tB.id));

            for (const tm of [...membersA, ...membersB]) {
                const [lm] = await db.select().from(leagueMembers).where(eq(leagueMembers.id, tm.leagueMemberId)).limit(1);
                const [mPlayer] = await db.insert(matchPlayers).values({
                    matchId: match.id,
                    userId: lm.userId,
                    teamId: tm.teamId,
                    teeId: tee.id,
                    startingHandicap: lm.handicap,
                }).returning();

                const scoreRecords = createdHoles.map(h => ({
                    matchPlayerId: mPlayer.id,
                    holeId: h.id,
                    grossScore: h.par + (Math.random() > 0.7 ? 1 : Math.random() > 0.9 ? 2 : 0),
                }));
                await db.insert(scores).values(scoreRecords);
            }
        }
    }

    console.log(`✅ Simulation complete!`);
    console.log(`League Slug: ${leagueSlug}`);
    console.log(`Dashboard URL: /dashboard/${leagueSlug}/leaderboard`);
    process.exit(0);
}

simulate().catch(err => {
    console.error('❌ Simulation failed:', err);
    process.exit(1);
});
