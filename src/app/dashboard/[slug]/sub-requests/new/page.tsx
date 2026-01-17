import { auth } from "@/auth";
import { db } from "@/db";
import { organizations, leagueMembers, matches, matchPlayers, rounds, courses, user, subRequests, seasons } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { NewSubRequestForm } from "@/components/NewSubRequestForm";
import { createSubRequest } from "@/actions/sub-request";

export default async function NewSubRequestPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await auth();
    if (!session?.user?.id) return redirect("/login");
    const userId = session.user.id;

    const { slug } = await params;
    const [league] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);

    if (!league) return notFound();

    // 1. Get eligible matches for this user
    // Must be in this league, future date, and user is a player in the match
    const upcomingMatches = await db
        .select({
            matchId: matches.id,
            date: rounds.date,
            courseName: courses.name,
            roundType: rounds.roundType,
        })
        .from(matchPlayers)
        .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
        .innerJoin(rounds, eq(matches.roundId, rounds.id))
        .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
        .leftJoin(courses, eq(rounds.courseId, courses.id))
        .where(
            and(
                eq(matchPlayers.userId, userId),
                eq(seasons.organizationId, league.id),
                gt(rounds.date, new Date()) // Future matches only
            )
        )
        .orderBy(rounds.date);

    // 2. Filter out matches that already have an OPEN sub request for this user
    // We fetch existing open requests for this user first
    const existingRequests = await db
        .select({ matchPlayerId: subRequests.matchPlayerId })
        .from(subRequests)
        .where(
            and(
                eq(subRequests.requestedByUserId, userId),
                eq(subRequests.status, "open")
            )
        );

    // We need to map matchPlayerId back to matchId to filter properly, 
    // but easier: get matchPlayerIds for the upcoming matches and check against set.
    // Actually, `upcomingMatches` query doesn't give matchPlayerId. Let's add it.

    // Re-query with matchPlayerId included to optimize filtering
    const eligibleMatches = await db
        .select({
            matchId: matches.id,
            matchPlayerId: matchPlayers.id,
            date: rounds.date,
            courseName: courses.name,
        })
        .from(matchPlayers)
        .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
        .innerJoin(rounds, eq(matches.roundId, rounds.id))
        .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
        .leftJoin(courses, eq(rounds.courseId, courses.id))
        .where(
            and(
                eq(matchPlayers.userId, userId),
                eq(seasons.organizationId, league.id),
                gt(rounds.date, new Date())
            )
        )
        .orderBy(rounds.date);

    const existingRequestMatchPlayerIds = new Set(existingRequests.map(r => r.matchPlayerId));
    const availableMatches = eligibleMatches.filter(m => !existingRequestMatchPlayerIds.has(m.matchPlayerId));

    // 3. Get list of Subs
    const subs = await db
        .select({
            userId: user.id,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            image: user.image
        })
        .from(leagueMembers)
        .innerJoin(user, eq(leagueMembers.userId, user.id))
        .where(
            and(
                eq(leagueMembers.organizationId, league.id),
                eq(leagueMembers.role, "sub")
            )
        );

    return (
        <div className="w-full max-w-2xl mx-auto py-12 px-6">
            <h1 className="text-3xl font-bold mb-2">Request a Sub</h1>
            <p className="text-zinc-400 mb-8">Select a match and notify subs to fill your spot.</p>

            <NewSubRequestForm
                matches={availableMatches}
                subs={subs}
                leagueSlug={slug}
                action={createSubRequest}
            />
        </div>
    );
}
