import { getLeagueMember } from "@/lib/auth-utils";
import { db } from "@/db";
import { rounds, matches, matchPlayers, scores, teams, user, holes, seasons } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import Image from "next/image";
import { Trophy, Activity } from "lucide-react";

const HOLES_PER_ROUND = 18;
const RECENT_ROUNDS_LIMIT = 5;
const CONTAINER_PADDING_X = 8;
const CONTAINER_PADDING_Y = 12;
const LAYOUT_GAP = 12;
const SECTION_GAP = 6;
const AVATAR_SIZE = 24;

type PlayerAccumulator = {
    id: string;
    name: string | null;
    image: string | null;
    scores: Map<number, number>;
};

type TeamAccumulator = {
    id: string;
    players: Map<string, PlayerAccumulator>;
    scores?: Map<number, number[]>;
};

type MatchAccumulator = {
    id: string;
    teams: Map<string, TeamAccumulator>;
};

type ProcessedMatch = {
    id: string;
    teamA: TeamAccumulator | null;
    teamB: TeamAccumulator | null;
    status: string;
    holesPlayed: number;
};

export default async function LeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const league = await getLeagueMember(slug);

    // 1. Fetch Active/Latest Round for LIVE Leaderboard
    // We look for 'in_progress' first, then 'scheduled' (today?), then 'completed' (most recent)
    const activeRounds = await db
        .select()
        .from(rounds)
        .innerJoin(matches, eq(rounds.id, matches.roundId))
        .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
        .where(
            and(
                eq(seasons.organizationId, league.id),
                inArray(rounds.status, ["in_progress", "completed", "scheduled"])
            )
        )
        .orderBy(desc(rounds.date))
        .limit(RECENT_ROUNDS_LIMIT); // Fetch detailed data for a few rounds, but we'll focus on the top one

    // Group by Round
    const roundData = activeRounds[0]?.rounds; // Most recent or active

    let liveMatches: ProcessedMatch[] = [];

    if (roundData) {
        // Fetch full match details for this round
        const matchRows = await db
            .select({
                matchId: matches.id,
                // Player info
                playerId: matchPlayers.id,
                userId: user.id,
                userName: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                userImage: user.image,
                teamId: matchPlayers.teamId,
                teeId: matchPlayers.teeId,
                // Scores
                holeId: scores.holeId,
                grossScore: scores.grossScore,
                holeNumber: holes.holeNumber,
                holePar: holes.par,
            })
            .from(matches)
            .innerJoin(matchPlayers, eq(matches.id, matchPlayers.matchId))
            .innerJoin(user, eq(matchPlayers.userId, user.id))
            .leftJoin(scores, eq(matchPlayers.id, scores.matchPlayerId))
            .leftJoin(holes, eq(scores.holeId, holes.id))
            .where(eq(matches.roundId, roundData.id));

        // Group by Match -> Team -> Players
        const matchesMap = new Map<string, MatchAccumulator>();

        matchRows.forEach(row => {
            if (!matchesMap.has(row.matchId)) {
                matchesMap.set(row.matchId, {
                    id: row.matchId,
                    teams: new Map(), // teamId -> { players: Map(id -> { scores: {} }) }
                });
            }
            const match = matchesMap.get(row.matchId);
            if (!match) return;

            // Default Team ID if null (Individual match?)
            const teamId = row.teamId || `individual-${row.userId}`;

            if (!match.teams.has(teamId)) {
                match.teams.set(teamId, {
                    id: teamId,
                    players: new Map()
                });
            }
            const team = match.teams.get(teamId);
            if (!team) return;

            if (!team.players.has(row.playerId)) {
                team.players.set(row.playerId, {
                    id: row.playerId,
                    name: row.firstName ? `${row.firstName} ${row.lastName}` : row.userName,
                    image: row.userImage,
                    scores: new Map() // holeNumber -> score
                });
            }

            if (row.grossScore && row.holeNumber) {
                const player = team.players.get(row.playerId);
                if (player) {
                    player.scores.set(row.holeNumber, row.grossScore);
                }
            }
        });

        // Calculate Match Status (Simple Best Ball Gross Match Play)
        // Only works if exactly 2 teams
        liveMatches = Array.from(matchesMap.values()).map(m => {
            const teamsArr = Array.from(m.teams.values());
            if (teamsArr.length !== 2) return {
                id: m.id,
                teamA: teamsArr[0] || null,
                teamB: teamsArr[1] || null,
                status: "Invalid Match Format",
                holesPlayed: 0
            };

            const teamA = teamsArr[0];
            const teamB = teamsArr[1];

            let holesWonA = 0;
            let holesWonB = 0;
            let holesPlayed = 0;

            // Iterate 1-18
            for (let h = 1; h <= HOLES_PER_ROUND; h++) {
                // Get best score for Team A on this hole
                const scoresA = Array.from(teamA.players.values()).map(p => p.scores.get(h)).filter((s): s is number => s !== undefined && s > 0);
                const bestA = scoresA.length > 0 ? Math.min(...scoresA) : null;

                // Get best score for Team B
                const scoresB = Array.from(teamB.players.values()).map(p => p.scores.get(h)).filter((s): s is number => s !== undefined && s > 0);
                const bestB = scoresB.length > 0 ? Math.min(...scoresB) : null;

                if (bestA && bestB) {
                    holesPlayed = h; // Track furthest hole
                    if (bestA < bestB) holesWonA++;
                    else if (bestB < bestA) holesWonB++;
                }
            }

            let statusText = "AS"; // All Square
            const firstPlayerA = teamA.players.values().next().value;
            const nameA = firstPlayerA?.name?.split(' ')[0] || "Team A";

            const firstPlayerB = teamB.players.values().next().value;
            const nameB = firstPlayerB?.name?.split(' ')[0] || "Team B";

            if (holesWonA > holesWonB) {
                statusText = `${nameA}'s Team ${holesWonA - holesWonB}UP`;
                // If team names exist, use them. For now simple heuristic.
            } else if (holesWonB > holesWonA) {
                statusText = `${nameB}'s Team ${holesWonB - holesWonA}UP`;
            } else if (holesPlayed > 0) {
                statusText = "All Square";
            } else {
                statusText = "Not Started";
            }

            // Check for Final (dormie logic omitted for brevity, just final score)
            // e.g. 3&2 logic would be nice but simple UP is fine for MVP

            return {
                id: m.id,
                teamA,
                teamB,
                status: statusText,
                holesPlayed
            };
        });
    }

    // 2. Fetch Season Standings
    // Get current season ID from the roundData if available, or fetch most recent active season
    let seasonId = roundData?.seasonId;

    // If no active/recent round found, try to find active season
    if (!seasonId) {
        const [activeSeason] = await db.select().from(seasons).where(and(eq(seasons.organizationId, league.id), eq(seasons.active, true))).limit(1);
        seasonId = activeSeason?.id;
    }

    const standingsMap = new Map<string, { id: string; name: string; wins: number; losses: number; ties: number; points: number }>();

    // Initialize with all teams
    const allLeagueTeams = await db.select().from(teams).where(eq(teams.organizationId, league.id));
    allLeagueTeams.forEach(t => {
        standingsMap.set(t.id, { id: t.id, name: t.name, wins: 0, losses: 0, ties: 0, points: 0 });
    });

    if (seasonId) {
        // Fetch ALL completed matches for this season
        const completedMatchesRows = await db
            .select({
                matchId: matches.id,
                teamId: matchPlayers.teamId,
                grossScore: scores.grossScore,
                holeNumber: holes.holeNumber,
            })
            .from(matches)
            .innerJoin(rounds, eq(matches.roundId, rounds.id))
            .innerJoin(matchPlayers, eq(matches.id, matchPlayers.matchId))
            .leftJoin(scores, eq(matchPlayers.id, scores.matchPlayerId))
            .leftJoin(holes, eq(scores.holeId, holes.id))
            .where(and(eq(rounds.seasonId, seasonId), eq(rounds.status, "completed")));

        // Process matches similarly to live scoring to determine winners
        const seasonalMatchesMap = new Map();

        completedMatchesRows.forEach(row => {
            if (!seasonalMatchesMap.has(row.matchId)) {
                seasonalMatchesMap.set(row.matchId, { teams: new Map() });
            }
            const match = seasonalMatchesMap.get(row.matchId);
            const teamId = row.teamId;
            if (!teamId) return; // Skip individual matches for team standings logic

            if (!match.teams.has(teamId)) {
                match.teams.set(teamId, { id: teamId, scores: new Map() });
            }
            // We need to aggregate best ball per team per hole. 
            // Simplified: Store all scores for team-hole, then min()
            const team = match.teams.get(teamId);
            if (!team.scores.has(row.holeNumber)) team.scores.set(row.holeNumber, []);
            if (row.grossScore) team.scores.get(row.holeNumber).push(row.grossScore);
        });

        seasonalMatchesMap.forEach(m => {
            const teamsArr = Array.from(m.teams.values()) as { id: string, scores: Map<number, number[]> }[];
            if (teamsArr.length !== 2) return;

            const tA = teamsArr[0];
            const tB = teamsArr[1];
            let holesWonA = 0;
            let holesWonB = 0;

            for (let h = 1; h <= HOLES_PER_ROUND; h++) {
                const scoresA = tA.scores.get(h) || [];
                const scoresB = tB.scores.get(h) || [];
                const bestA = scoresA.length > 0 ? Math.min(...scoresA) : null;
                const bestB = scoresB.length > 0 ? Math.min(...scoresB) : null;

                if (bestA && bestB) {
                    if (bestA < bestB) holesWonA++;
                    else if (bestB < bestA) holesWonB++;
                }
            }

            // Update Standings
            const statA = standingsMap.get(tA.id);
            const statB = standingsMap.get(tB.id);

            if (statA && statB) {
                if (holesWonA > holesWonB) {
                    statA.wins++;
                    statA.points += 1; // 1 pt for win
                    statB.losses++;
                } else if (holesWonB > holesWonA) {
                    statB.wins++;
                    statB.points += 1;
                    statA.losses++;
                } else {
                    statA.ties++;
                    statA.points += 0.5;
                    statB.ties++;
                    statB.points += 0.5;
                }
            }
        });
    }

    const sortedStandings = Array.from(standingsMap.values()).sort((a, b) => b.points - a.points);

    return (
        <div className={`w-full py-${CONTAINER_PADDING_Y} px-${CONTAINER_PADDING_X} text-white`}>
            <h1 className="text-4xl font-bold mb-8">Leaderboard</h1>

            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-${LAYOUT_GAP}`}>
                {/* LIVE LEADERBOARD */}
                <div className={`space-y-${SECTION_GAP}`}>
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="text-red-500 animate-pulse" />
                        <h2 className="text-2xl font-bold">Live Scoring</h2>
                    </div>

                    {!roundData ? (
                        <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900 text-zinc-500 text-center">
                            No active rounds found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm text-zinc-400 px-2">
                                <span>{roundData.status === 'in_progress' ? 'LIVE NOW' : roundData.status.toUpperCase()}</span>
                                <span>{roundData.date.toDateString()}</span>
                            </div>

                            {liveMatches.map((match) => (
                                <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                                    {/* Status Badge */}
                                    <div className="absolute top-0 right-0 px-4 py-1 bg-zinc-800 rounded-bl-xl text-xs font-bold text-zinc-400">
                                        {match.status} {match.status !== "Not Started" && match.status !== "All Square" && match.holesPlayed < 18 ? `thru ${match.holesPlayed}` : ''}
                                    </div>

                                    <div className="flex justify-between items-center mt-4">
                                        <div className="flex-1">
                                            <div className="flex flex-col gap-2">
                                                {match.teamA && Array.from(match.teamA.players.values()).map((p) => (
                                                    <div key={p.id} className="flex items-center gap-2">
                                                        <div className={`w-${AVATAR_SIZE / 4} h-${AVATAR_SIZE / 4} rounded-full bg-zinc-700 relative overflow-hidden`}>
                                                            {p.image ? <Image src={p.image} alt="" fill /> : null}
                                                        </div>
                                                        <span className="font-bold text-sm">{p.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="px-4 text-xs font-bold text-zinc-500">VS</div>

                                        <div className="flex-1 text-right">
                                            <div className="flex flex-col gap-2 items-end">
                                                {match.teamB && Array.from(match.teamB.players.values()).map((p) => (
                                                    <div key={p.id} className="flex items-center gap-2 flex-row-reverse">
                                                        <div className={`w-${AVATAR_SIZE / 4} h-${AVATAR_SIZE / 4} rounded-full bg-zinc-700 relative overflow-hidden`}>
                                                            {p.image ? <Image src={p.image} alt="" fill /> : null}
                                                        </div>
                                                        <span className="font-bold text-sm">{p.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {liveMatches.length === 0 && (
                                <p className="text-zinc-500 text-sm text-center">Matches setup but no scoring data yet.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* STANDINGS */}
                <div>
                    <div className="flex items-center gap-2 mb-8">
                        <Trophy className="text-yellow-500" />
                        <h2 className="text-2xl font-bold">Season Standings</h2>
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-950/50 text-xs font-bold text-zinc-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Team</th>
                                    <th className="px-6 py-4 text-center">PTS</th>
                                    <th className="px-6 py-4 text-center">W</th>
                                    <th className="px-6 py-4 text-center">L</th>
                                    <th className="px-6 py-4 text-center">T</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {sortedStandings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                            No teams yet.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedStandings.map((team, i) => (
                                        <tr key={team.id} className="group hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4 font-bold relative">
                                                {i === 0 && team.points > 0 && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-yellow-500">👑</span>}
                                                {team.name}
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono font-bold text-emerald-500">{team.points}</td>
                                            <td className="px-6 py-4 text-center text-zinc-400">{team.wins}</td>
                                            <td className="px-6 py-4 text-center text-zinc-400">{team.losses}</td>
                                            <td className="px-6 py-4 text-center text-zinc-400">{team.ties}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
