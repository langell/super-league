import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { rounds, courses, matches, matchPlayers, leagueMembers, user, teams, teamMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, Plus, Users, Trash2 } from "lucide-react";
import Image from "next/image";
import { createMatch, deleteMatch } from "@/actions/match";
import { notFound } from "next/navigation";

export default async function RoundDetailPage({ params }: { params: Promise<{ slug: string; seasonId: string; roundId: string }> }) {
    const { slug, seasonId, roundId } = await params;
    const league = await getLeagueAdmin(slug);

    // 1. Fetch Round Details
    const [round] = await db
        .select({
            id: rounds.id,
            date: rounds.date,
            status: rounds.status,
            courseName: courses.name,
            courseCity: courses.city,
            courseState: courses.state,
            courseId: courses.id,
        })
        .from(rounds)
        .leftJoin(courses, eq(rounds.courseId, courses.id))
        .where(eq(rounds.id, roundId))
        .limit(1);

    if (!round) notFound();

    // 2. Fetch Matches for this Round
    const roundMatches = await db.select().from(matches).where(eq(matches.roundId, roundId));

    // 3. Fetch Players for each Match
    const matchesWithPlayers = await Promise.all(roundMatches.map(async (match) => {
        const players = await db
            .select({
                id: matchPlayers.id,
                userId: matchPlayers.userId,
                teamId: matchPlayers.teamId,
                teeId: matchPlayers.teeId,
                startingHandicap: matchPlayers.startingHandicap,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.name,
                image: user.image,
            })
            .from(matchPlayers)
            .innerJoin(user, eq(matchPlayers.userId, user.id))
            .where(eq(matchPlayers.matchId, match.id));

        return {
            ...match,
            players
        };
    }));

    // 4. Get all Teams
    const teamsList = await db.select().from(teams).where(eq(teams.organizationId, league.id));
    const teamMap = new Map(teamsList.map(t => [t.id, t.name]));

    // Let's see which users are playing.
    const engagedUserIds = new Set<string>();
    matchesWithPlayers.forEach(m => m.players.forEach(p => engagedUserIds.add(p.userId)));

    // Now filter teams: A team is "free" if NONE of its members are engaged in this round.
    // We need to know who is on which team.
    const teamsWithMembers = await Promise.all(teamsList.map(async (team) => {
        const members = await db
            .select({ userId: leagueMembers.userId })
            .from(teamMembers)
            .innerJoin(leagueMembers, eq(teamMembers.leagueMemberId, leagueMembers.id))
            .where(eq(teamMembers.teamId, team.id));

        return { ...team, members };
    }));

    const freeTeams = teamsWithMembers.filter(t => {
        // If team has no members, don't show it for match creation
        if (t.members.length === 0) return false;
        // If any member is already playing, team is not free
        return !t.members.some(m => engagedUserIds.has(m.userId));
    });

    return (
        <div className="max-w-5xl mx-auto py-12 px-8">
            <Link href={`/dashboard/${slug}/schedule`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                <ArrowLeft size={20} />
                Back to Schedule
            </Link>

            <div className="flex justify-between items-start mb-12">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[10px] uppercase font-bold tracking-widest mb-4">
                        <Calendar size={10} />
                        {round.status}
                    </div>
                    <h1 className="text-4xl font-bold mb-2">
                        {round.date.toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h1>
                    <div className="flex items-center gap-2 text-zinc-400">
                        <MapPin size={16} />
                        {round.courseName || "No Course Selected"} {round.courseCity && `• ${round.courseCity}, ${round.courseState}`}
                    </div>
                </div>

                <Link
                    href={`/dashboard/${slug}/schedule/${seasonId}/rounds/${roundId}/edit`}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
                >
                    Edit Round
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Matches List */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold mb-4">Pairings & Matches (Team vs Team)</h3>

                    {matchesWithPlayers.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600">
                            <Users size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No matches set up for this round yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {matchesWithPlayers.map((match, i) => {
                                // Group players by teamId
                                const teamsInMatch = Object.entries(match.players.reduce((acc, player) => {
                                    const tId = player.teamId || 'unknown';
                                    if (!acc[tId]) acc[tId] = [];
                                    acc[tId].push(player);
                                    return acc;
                                }, {} as Record<string, typeof match.players>));

                                // Ideally we have exactly 2 teams
                                const teamA = teamsInMatch[0]; // [teamId, players[]]
                                const teamB = teamsInMatch[1];

                                const teamAName = teamA ? (teamMap.get(teamA[0]) || "Team 1") : "TBD";
                                const teamBName = teamB ? (teamMap.get(teamB[0]) || "Team 2") : "TBD";
                                const teamAPlayers = teamA ? teamA[1] : [];
                                const teamBPlayers = teamB ? teamB[1] : [];

                                return (
                                    <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl relative overflow-hidden">
                                        {/* Header / Match Number */}
                                        <div className="px-6 py-3 bg-zinc-950/50 border-b border-zinc-800 flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Match {i + 1}</div>
                                                {match.players.some(p => !p.teeId) ? (
                                                    <Link
                                                        href={`/dashboard/${slug}/matches/${match.id}/setup`}
                                                        className="px-3 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors flex items-center gap-1"
                                                    >
                                                        Start Match
                                                    </Link>
                                                ) : (
                                                    <Link
                                                        href={`/dashboard/${slug}/scorecard/${match.id}`}
                                                        className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors"
                                                    >
                                                        Enter Scores
                                                    </Link>
                                                )}
                                            </div>
                                            <form action={deleteMatch}>
                                                <input type="hidden" name="leagueSlug" value={slug} />
                                                <input type="hidden" name="matchId" value={match.id} />
                                                <button className="text-zinc-600 hover:text-red-500 transition-colors p-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </form>
                                        </div>

                                        <div className="p-6 grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
                                            {/* Team A */}
                                            <div className="text-left">
                                                <h4 className="text-lg font-bold text-white mb-3 truncate">{teamAName}</h4>
                                                <div className="space-y-3">
                                                    {teamAPlayers.map(p => (
                                                        <div key={p.id} className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex flex-shrink-0 items-center justify-center text-zinc-500 font-bold overflow-hidden relative text-xs">
                                                                {p.image ? (
                                                                    <Image src={p.image} alt="" fill className="object-cover" />
                                                                ) : (
                                                                    p.firstName?.[0] || "?"
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-zinc-200 truncate">
                                                                    {p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.username}
                                                                </p>
                                                                <p className="text-[10px] text-zinc-500 font-mono">PHCP: {p.startingHandicap}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* VS */}
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-zinc-600 italic">VS</span>
                                                </div>
                                            </div>

                                            {/* Team B */}
                                            <div className="text-right">
                                                <h4 className="text-lg font-bold text-white mb-3 truncate">{teamBName}</h4>
                                                <div className="space-y-3 flex flex-col items-end">
                                                    {teamBPlayers.map(p => (
                                                        <div key={p.id} className="flex items-center gap-3 flex-row-reverse text-right">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex flex-shrink-0 items-center justify-center text-zinc-500 font-bold overflow-hidden relative text-xs">
                                                                {p.image ? (
                                                                    <Image src={p.image} alt="" fill className="object-cover" />
                                                                ) : (
                                                                    p.firstName?.[0] || "?"
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-bold text-zinc-200 truncate">
                                                                    {p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.username}
                                                                </p>
                                                                <p className="text-[10px] text-zinc-500 font-mono">PHCP: {p.startingHandicap}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Create Match Sidebar */}
                <div>
                    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl sticky top-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Plus size={20} className="text-emerald-500" />
                            Create Team Match
                        </h3>
                        <form action={createMatch} className="space-y-4">
                            <input type="hidden" name="leagueSlug" value={slug} />
                            <input type="hidden" name="roundId" value={roundId} />

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Team 1</label>
                                <select
                                    name="team1Id"
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors appearance-none"
                                >
                                    <option value="">Select Team...</option>
                                    {freeTeams.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Team 2</label>
                                <select
                                    name="team2Id"
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors appearance-none"
                                >
                                    <option value="">Select Team...</option>
                                    {freeTeams.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all mt-4">
                                Create Pairing
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
