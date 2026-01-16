import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { rounds, matches, matchPlayers, scores, teams, user, holes, seasons } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import Link from "next/link";
import { Trophy, Activity, Calendar, Play } from "lucide-react";

const HOLES_PER_ROUND = 18;
const MAX_DASHBOARD_LIVE_MATCHES = 3;
const TOP_STANDINGS_LIMIT = 5;

const ICON_SIZE_TINY = 14;
const ICON_SIZE_SMALL = 16;
const ICON_SIZE_MEDIUM = 20;
const ICON_SIZE_LARGE = 32;
import Image from "next/image";

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
    leadingTeam: 'A' | 'B' | 'AS';
};

export default async function LeagueAdminDashboard({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);

    // --- LEADERBOARD LOGIC & STATUS ---
    // 1. Actve Round
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
        .limit(1);

    const roundData = activeRounds[0]?.rounds;
    let liveMatches: ProcessedMatch[] = [];
    let seasonId = roundData?.seasonId;

    if (!seasonId) {
        const [activeSeason] = await db.select().from(seasons).where(and(eq(seasons.organizationId, league.id), eq(seasons.active, true))).limit(1);
        seasonId = activeSeason?.id;
    }

    if (roundData) {
        // Fetch full match details for this round
        const matchRows = await db
            .select({
                matchId: matches.id,
                playerId: matchPlayers.id,
                userId: user.id,
                userName: user.name,
                firstName: user.firstName,
                lastName: user.lastName,
                userImage: user.image,
                teamId: matchPlayers.teamId,
                grossScore: scores.grossScore,
                holeNumber: holes.holeNumber,
            })
            .from(matches)
            .innerJoin(matchPlayers, eq(matches.id, matchPlayers.matchId))
            .innerJoin(user, eq(matchPlayers.userId, user.id))
            .leftJoin(scores, eq(matchPlayers.id, scores.matchPlayerId))
            .leftJoin(holes, eq(scores.holeId, holes.id))
            .where(eq(matches.roundId, roundData.id));

        const matchesMap = new Map<string, MatchAccumulator>();
        matchRows.forEach(row => {
            if (!matchesMap.has(row.matchId)) {
                matchesMap.set(row.matchId, {
                    id: row.matchId,
                    teams: new Map(),
                });
            }
            const match = matchesMap.get(row.matchId);
            if (!match) return;

            const teamId = row.teamId || `individual-${row.userId}`;

            if (!match.teams.has(teamId)) {
                match.teams.set(teamId, { id: teamId, players: new Map() });
            }
            const team = match.teams.get(teamId);
            if (!team) return;

            if (!team.players.has(row.playerId)) {
                team.players.set(row.playerId, {
                    id: row.playerId,
                    name: row.firstName ? `${row.firstName} ${row.lastName}` : row.userName,
                    image: row.userImage,
                    scores: new Map()
                });
            }

            if (row.grossScore && row.holeNumber) {
                const player = team.players.get(row.playerId);
                if (player) {
                    player.scores.set(row.holeNumber, row.grossScore);
                }
            }
        });

        liveMatches = Array.from(matchesMap.values()).map(m => {
            const teamsArr = Array.from(m.teams.values());
            if (teamsArr.length !== 2) return {
                id: m.id,
                teamA: teamsArr[0] || null,
                teamB: teamsArr[1] || null,
                status: "Invalid",
                holesPlayed: 0,
                leadingTeam: 'AS' as const
            };
            const teamA = teamsArr[0];
            const teamB = teamsArr[1];
            let holesWonA = 0;
            let holesWonB = 0;
            let holesPlayed = 0;

            for (let h = 1; h <= HOLES_PER_ROUND; h++) {
                const scoresA = Array.from(teamA.players.values()).map(p => p.scores.get(h)).filter((s): s is number => s !== undefined && s > 0);
                const bestA = scoresA.length > 0 ? Math.min(...scoresA) : null;
                const scoresB = Array.from(teamB.players.values()).map(p => p.scores.get(h)).filter((s): s is number => s !== undefined && s > 0);
                const bestB = scoresB.length > 0 ? Math.min(...scoresB) : null;

                if (bestA && bestB) {
                    holesPlayed = h;
                    if (bestA < bestB) holesWonA++;
                    else if (bestB < bestA) holesWonB++;
                }
            }

            let statusText = "AS";
            let leadingTeam: 'A' | 'B' | 'AS' = 'AS';
            const nameA = teamA.players.values().next().value?.name?.split(' ')[0] || "Team A";
            const nameB = teamB.players.values().next().value?.name?.split(' ')[0] || "Team B";

            if (holesWonA > holesWonB) {
                statusText = `${holesWonA - holesWonB} UP`;
                leadingTeam = 'A';
            } else if (holesWonB > holesWonA) {
                statusText = `${holesWonB - holesWonA} UP`;
                leadingTeam = 'B';
            } else if (holesPlayed > 0) {
                statusText = "AS";
                leadingTeam = 'AS';
            } else {
                statusText = "VS";
                leadingTeam = 'AS';
            }

            return {
                id: m.id,
                teamA,
                teamB,
                status: statusText,
                holesPlayed,
                leadingTeam
            };
        });
    }

    // 2. Standings (Simplified for Dashboard: just top 5 by points)
    const standingsMap = new Map<string, { id: string; name: string; wins: number; losses: number; ties: number; points: number }>();
    const allLeagueTeams = await db.select().from(teams).where(eq(teams.organizationId, league.id));
    allLeagueTeams.forEach(t => standingsMap.set(t.id, { id: t.id, name: t.name, wins: 0, losses: 0, ties: 0, points: 0 }));

    if (seasonId) {
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

        const seasonalMatchesMap = new Map();
        completedMatchesRows.forEach(row => {
            if (!seasonalMatchesMap.has(row.matchId)) seasonalMatchesMap.set(row.matchId, { teams: new Map() });
            const match = seasonalMatchesMap.get(row.matchId);
            const teamId = row.teamId;
            if (!teamId) return;
            if (!match.teams.has(teamId)) match.teams.set(teamId, { id: teamId, scores: new Map() });
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

            const statA = standingsMap.get(tA.id);
            const statB = standingsMap.get(tB.id);
            if (statA && statB) {
                if (holesWonA > holesWonB) { statA.wins++; statA.points += 1; statB.losses++; }
                else if (holesWonB > holesWonA) { statB.wins++; statB.points += 1; statA.losses++; }
                else { statA.ties++; statA.points += 0.5; statB.ties++; statB.points += 0.5; }
            }
        });
    }

    const leaderboardHref = `/dashboard/${slug}/leaderboard`;
    const scheduleHref = `/dashboard/${slug}/schedule`;

    const sortedStandings = Array.from(standingsMap.values()).sort((a, b) => b.points - a.points).slice(0, TOP_STANDINGS_LIMIT); // Top 5
    // --- END LOGIC ---

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-zinc-400">Dashboard for {league.name}</p>
                </div>
                <div className="flex gap-3">
                    <Link href={scheduleHref} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
                        <Calendar size={ICON_SIZE_SMALL} />
                        Schedule
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COL: Next Up / Live */}
                <div className="lg:col-span-2 space-y-8">
                    {roundData ? (
                        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${roundData.status === 'in_progress' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                        {roundData.status === 'in_progress' ? <Activity size={ICON_SIZE_MEDIUM} className="animate-pulse" /> : <Calendar size={ICON_SIZE_MEDIUM} />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg leading-tight">
                                            {roundData.status === 'in_progress' ? 'Live Now' : 'Up Next'}
                                        </h3>
                                        <p className="text-zinc-400 text-xs">{roundData.date.toDateString()}</p>
                                    </div>
                                </div>
                                <Link href={leaderboardHref} className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">
                                    View Full Leaderboard &rarr;
                                </Link>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {liveMatches.slice(0, MAX_DASHBOARD_LIVE_MATCHES).map(match => (
                                    <div key={match.id} className="bg-zinc-950/40 backdrop-blur-sm rounded-2xl p-4 flex justify-between items-center border border-zinc-800/50 hover:border-emerald-500/30 transition-all group/match">
                                        {/* Team A */}
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="flex -space-x-3">
                                                {match.teamA && Array.from(match.teamA.players.values()).map(p => (
                                                    <div key={p.id} className={`w-10 h-10 rounded-full bg-zinc-800 border-2 transition-transform group-hover/match:scale-110 ${match.leadingTeam === 'A' ? 'border-emerald-500' : 'border-zinc-900'} overflow-hidden relative`}>
                                                        {p.image && <Image src={p.image} alt="" fill className="object-cover" />}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`font-bold text-sm transition-colors ${match.leadingTeam === 'A' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                    {match.teamA && Array.from(match.teamA.players.values()).map(p => p.name?.split(' ').pop() || p.name).join(' & ')}
                                                </span>
                                                {match.leadingTeam === 'A' && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Leading</span>}
                                            </div>
                                        </div>

                                        {/* Match Score / Status */}
                                        <div className="flex flex-col items-center px-4 min-w-[100px]">
                                            <div className={`px-4 py-1.5 rounded-full text-xs font-black border transition-all ${match.leadingTeam !== 'AS'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                                }`}>
                                                {match.status}
                                            </div>
                                            {match.holesPlayed > 0 && (
                                                <span className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-tight">Thru {match.holesPlayed}</span>
                                            )}
                                        </div>

                                        {/* Team B */}
                                        <div className="flex items-center gap-4 flex-1 justify-end text-right">
                                            <div className="flex flex-col">
                                                <span className={`font-bold text-sm transition-colors ${match.leadingTeam === 'B' ? 'text-emerald-400' : 'text-zinc-300'}`}>
                                                    {match.teamB && Array.from(match.teamB.players.values()).map(p => p.name?.split(' ').pop() || p.name).join(' & ')}
                                                </span>
                                                {match.leadingTeam === 'B' && <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Leading</span>}
                                            </div>
                                            <div className="flex -space-x-3 flex-row-reverse">
                                                {match.teamB && Array.from(match.teamB.players.values()).map(p => (
                                                    <div key={p.id} className={`w-10 h-10 rounded-full bg-zinc-800 border-2 transition-transform group-hover/match:scale-110 ${match.leadingTeam === 'B' ? 'border-emerald-500' : 'border-zinc-900'} overflow-hidden relative`}>
                                                        {p.image && <Image src={p.image} alt="" fill className="object-cover" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {liveMatches.length > 3 && (
                                    <div className="text-center text-xs text-zinc-500 pt-2">
                                        + {liveMatches.length - 3} more matches
                                    </div>
                                )}

                                {/* Quick Action */}
                                <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-end">
                                    <Link href={scheduleHref} className="inline-flex items-center gap-2 text-sm font-bold text-emerald-500 hover:text-emerald-400">
                                        Manage Round <Play size={ICON_SIZE_TINY} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-900 border border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                            <Calendar className="mx-auto mb-4 text-zinc-700" size={ICON_SIZE_LARGE} />
                            <h3 className="text-lg font-bold text-zinc-400">No scheduled rounds</h3>
                            <p className="text-zinc-600 mb-6 text-sm">Create a schedule to get started.</p>
                            <Link href={scheduleHref} className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm font-bold">
                                Create Schedule
                            </Link>
                        </div>
                    )}
                </div>

                {/* RIGHT COL: Standings Widget */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Trophy className="text-yellow-500" size={ICON_SIZE_MEDIUM} />
                                <h3 className="font-bold text-white">Standings</h3>
                            </div>
                            <Link href={leaderboardHref} className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">
                                View All
                            </Link>
                        </div>

                        <div className="space-y-4">
                            {sortedStandings.length === 0 ? (
                                <p className="text-zinc-500 text-sm">No data yet.</p>
                            ) : (
                                sortedStandings.map((team, i) => (
                                    <div key={team.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-500/10 text-yellow-500' :
                                                i === 1 ? 'bg-zinc-200/10 text-zinc-200' :
                                                    i === 2 ? 'bg-orange-500/10 text-orange-500' : 'text-zinc-600'
                                                }`}>
                                                {i + 1}
                                            </div>
                                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{team.name}</span>
                                        </div>
                                        <span className="font-mono font-bold text-sm text-emerald-500">{team.points}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick Access / Stats (Placeholder) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                            <span className="block text-2xl font-black text-white">{allLeagueTeams.length}</span>
                            <span className="text-xs font-bold text-zinc-500 uppercase">Teams</span>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                            <span className="block text-2xl font-black text-white">{activeRounds.length}</span>
                            <span className="text-xs font-bold text-zinc-500 uppercase">Active Rnd</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
