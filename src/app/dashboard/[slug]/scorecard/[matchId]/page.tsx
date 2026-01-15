import React from "react";
import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { matches, matchPlayers, user, rounds, courses, scores, holes, tees, leagueMembers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { saveScorecard } from "@/app/actions";

export default async function MatchScorecardPage({ params }: { params: Promise<{ slug: string; matchId: string }> }) {
    const { slug, matchId } = await params;
    const league = await getLeagueAdmin(slug);

    // 1. Fetch Match & Round Details
    const [match] = await db
        .select({
            id: matches.id,
            roundId: matches.roundId,
            format: matches.format,
            date: rounds.date,
            courseName: courses.name,
            courseId: courses.id,
            roundType: rounds.roundType,
        })
        .from(matches)
        .innerJoin(rounds, eq(matches.roundId, rounds.id))
        .innerJoin(courses, eq(rounds.courseId, courses.id))
        .where(eq(matches.id, matchId))
        .limit(1);

    if (!match) notFound();

    // 2. Fetch Match Players
    const players = await db
        .select({
            id: matchPlayers.id,
            userId: matchPlayers.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.name,
            image: user.image,
            handicap: matchPlayers.startingHandicap,
            teamId: matchPlayers.teamId,
            teeId: matchPlayers.teeId,
            mainHandicap: leagueMembers.handicap,
        })
        .from(matchPlayers)
        .innerJoin(user, eq(matchPlayers.userId, user.id))
        .innerJoin(leagueMembers, and(eq(leagueMembers.userId, user.id), eq(leagueMembers.organizationId, league.id)))
        .where(eq(matchPlayers.matchId, matchId));

    // 3. Fetch Course Holes for logic (we need Hole IDs)
    // We need to fetch holes for ALL tees used in this match.
    // Simplifying assumption: Players in a match might play different tees.
    // We should map player -> tee -> holes
    // OR just fetch ALL holes for the course?

    // Better: Fetch holes for each player's specific tee.
    // If no tee set for player, we need to prompt to select one.

    // Check if any player is missing a tee
    const missingTees = players.some(p => !p.teeId);
    if (missingTees) {
        // Redirect to "Setup Match" or show Tee Selector here?
        // Let's redirect to a setup page or handle it inline.
        // For MVP, if missing tee, maybe default to first available or show error?
        // Let's show a "Setup Required" UI.
    }

    // Fetch existing scores
    const existingScores = await db
        .select()
        .from(scores)
        .innerJoin(matchPlayers, eq(scores.matchPlayerId, matchPlayers.id))
        .where(eq(matchPlayers.matchId, matchId));

    // Helper to get score
    const getScore = (mpId: string, hId: string) => {
        const s = existingScores.find(es => es.scores.matchPlayerId === mpId && es.scores.holeId === hId);
        return s?.scores.grossScore || "";
    };

    // 4. Get Holes for the course.
    // We need to know which holes correspond to which Tee.
    // Let's just fetch ALL holes for the course and filter in JS. Not efficient for huge data but fine for 1 course.
    const allTees = await db.select().from(tees).where(eq(tees.courseId, match.courseId));
    const allHoles = await db
        .select()
        .from(holes)
        .innerJoin(tees, eq(holes.teeId, tees.id))
        .where(eq(tees.courseId, match.courseId))
        .orderBy(asc(holes.holeNumber));

    return (
        <div className="min-h-screen bg-background text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href={`/dashboard/${slug}/schedule/${match.roundId}/rounds/${match.roundId}`}
                        className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="text-center">
                        <h1 className="font-bold text-sm uppercase tracking-wide">Scorecard</h1>
                        <p className="text-[10px] text-zinc-500">{match.courseName}</p>
                    </div>
                    <form action={saveScorecard}>
                        {/* We will use a proper form submission later, for now just a dummy button or maybe the form wraps the whole table? */}
                        {/* THE WHOLE TABLE MUST BE IN THE FORM */}
                        <div className="w-8"></div>
                    </form>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 pb-24 overflow-x-auto">
                {missingTees ? (
                    <div className="p-8 text-center border border-red-900/50 bg-red-950/10 rounded-2xl">
                        <h3 className="text-red-500 font-bold mb-2">Setup Required</h3>
                        <p className="text-zinc-400 mb-4">One or more players do not have a Tee Box selected.</p>
                        <p className="text-xs text-zinc-500">Please go back to the Round details and assign Tees (Feature coming soon - for now assume default tee).</p>
                        {/* Fallback to first tee logic below to prevent crash */}
                    </div>
                ) : null}

                <form action={saveScorecard}>
                    <input type="hidden" name="leagueSlug" value={slug} />
                    <input type="hidden" name="matchId" value={matchId} />

                    <div className="min-w-[800px]"> {/* Ensure horizontal scroll for mobile */}
                        <div
                            className={`grid gap-0 text-center text-xs border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900`}
                            style={{
                                gridTemplateColumns: `80px ${match.roundType === '18_holes'
                                    ? 'repeat(9, 1fr) 60px repeat(9, 1fr) 60px'
                                    : 'repeat(9, 1fr)'
                                    } 60px`
                            }}
                        >

                            {/* Header Row: Hole Numbers */}
                            <div className="col-span-1 p-3 flex items-center justify-center font-bold bg-zinc-900 border-r border-b border-zinc-800">HOLE</div>

                            {/* Front 9 Headers */}
                            {(match.roundType === '18_holes' || match.roundType === 'front_9') && (
                                <>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                        <div key={num} className="p-3 font-bold border-r border-b border-zinc-800">{num}</div>
                                    ))}
                                    {match.roundType === '18_holes' && (
                                        <div className="p-3 font-black bg-zinc-950/50 border-r border-b border-zinc-800">OUT</div>
                                    )}
                                </>
                            )}

                            {/* Back 9 Headers */}
                            {(match.roundType === '18_holes' || match.roundType === 'back_9') && (
                                <>
                                    {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => (
                                        <div key={num} className="p-3 font-bold border-r border-b border-zinc-800">{num}</div>
                                    ))}
                                    {match.roundType === '18_holes' && (
                                        <div className="p-3 font-black bg-zinc-950/50 border-r border-b border-zinc-800">IN</div>
                                    )}
                                </>
                            )}

                            <div className="p-3 font-black bg-emerald-950/30 text-emerald-500 border-b border-zinc-800">TOT</div>

                            {/* Row per Player */}
                            {players.map((player) => {
                                // Find player's tee holes. If not assigned, use first available tee set as fallback
                                const playerTeeId = player.teeId || allTees[0]?.id;
                                const playerHoles = allHoles.filter(h => h.holes.teeId === playerTeeId);

                                // Calculate totals for display
                                let outTotal = 0;
                                let inTotal = 0;

                                return (
                                    <React.Fragment key={player.id}>
                                        {/* Player Name Cell */}
                                        <div className="col-span-1 p-2 text-left border-r border-b border-zinc-800 bg-zinc-900 flex flex-col justify-center truncate">
                                            <div className="font-bold truncate text-[10px] sm:text-xs">
                                                {player.firstName ? `${player.firstName.charAt(0)}. ${player.lastName}` : player.username}
                                            </div>
                                            <div className="text-[9px] text-zinc-500">H: {player.handicap}</div>
                                        </div>

                                        {/* Front 9 Inputs */}
                                        {(match.roundType === '18_holes' || match.roundType === 'front_9') && (
                                            <>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                                    const hole = playerHoles.find(h => h.holes.holeNumber === num);
                                                    const score = getScore(player.id, hole?.holes.id || "unknown");
                                                    if (score) outTotal += parseInt(score.toString());

                                                    return (
                                                        <div key={num} className="border-r border-b border-zinc-800 bg-zinc-950 relative group">
                                                            {hole && (
                                                                <input
                                                                    name={`player-${player.id}-hole-${hole.holes.id}`}
                                                                    type="number"
                                                                    min="1"
                                                                    max="15"
                                                                    defaultValue={score}
                                                                    className="w-full h-full bg-transparent text-center font-bold text-white outline-none focus:bg-emerald-500/20 transition-colors p-0 appearance-none" // appearance-none to hide spinners
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {match.roundType === '18_holes' && (
                                                    <div className="bg-zinc-900 border-r border-b border-zinc-800 flex items-center justify-center font-mono font-bold text-zinc-400">
                                                        {outTotal || "-"}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {/* Back 9 Inputs */}
                                        {(match.roundType === '18_holes' || match.roundType === 'back_9') && (
                                            <>
                                                {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(num => {
                                                    const hole = playerHoles.find(h => h.holes.holeNumber === num);
                                                    const score = getScore(player.id, hole?.holes.id || "unknown");
                                                    if (score) inTotal += parseInt(score.toString());

                                                    return (
                                                        <div key={num} className="border-r border-b border-zinc-800 bg-zinc-950 relative group">
                                                            {hole && (
                                                                <input
                                                                    name={`player-${player.id}-hole-${hole.holes.id}`}
                                                                    type="number"
                                                                    min="1"
                                                                    max="15"
                                                                    defaultValue={score}
                                                                    className="w-full h-full bg-transparent text-center font-bold text-white outline-none focus:bg-emerald-500/20 transition-colors p-0"
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {match.roundType === '18_holes' && (
                                                    <div className="bg-zinc-900 border-r border-b border-zinc-800 flex items-center justify-center font-mono font-bold text-zinc-400">
                                                        {inTotal || "-"}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="bg-emerald-950/10 border-b border-zinc-800 flex items-center justify-center font-mono font-black text-emerald-500">
                                            {outTotal + inTotal || "-"}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md px-6">
                        <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-2xl shadow-2xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all">
                            <Save size={20} />
                            Save Scores
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
