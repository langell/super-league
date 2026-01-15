import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { matches, matchPlayers, user, rounds, courses, tees, leagueMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { setupMatch } from "@/app/actions";
import Image from "next/image";

export default async function MatchSetupPage({ params }: { params: Promise<{ slug: string; matchId: string }> }) {
    const { slug, matchId } = await params;
    const league = await getLeagueAdmin(slug);

    // 1. Fetch Match Info
    const [match] = await db
        .select({
            id: matches.id,
            roundId: matches.roundId,
            courseName: courses.name,
            courseId: courses.id,
        })
        .from(matches)
        .innerJoin(rounds, eq(matches.roundId, rounds.id))
        .innerJoin(courses, eq(rounds.courseId, courses.id))
        .where(eq(matches.id, matchId))
        .limit(1);

    if (!match) notFound();

    // 2. Fetch Players
    const players = await db
        .select({
            id: matchPlayers.id,
            userId: matchPlayers.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.name,
            image: user.image,
            teeId: matchPlayers.teeId,
            handicap: matchPlayers.startingHandicap,
            leagueHandicap: leagueMembers.handicap,
        })
        .from(matchPlayers)
        .innerJoin(user, eq(matchPlayers.userId, user.id))
        .innerJoin(leagueMembers, and(eq(leagueMembers.userId, user.id), eq(leagueMembers.organizationId, league.id)))
        .where(eq(matchPlayers.matchId, matchId));

    // 3. Fetch available Tees
    const availableTees = await db
        .select()
        .from(tees)
        .where(eq(tees.courseId, match.courseId));

    return (
        <div className="min-h-screen bg-background text-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <Link href={`/dashboard/${slug}/schedule/${match.roundId}/rounds/${match.roundId}`}
                        className="p-2 -ml-2 hover:bg-zinc-800 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="text-center">
                        <h1 className="font-bold text-sm uppercase tracking-wide">Match Setup</h1>
                        <p className="text-[10px] text-zinc-500">{match.courseName}</p>
                    </div>
                    <div className="w-8"></div>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-8">
                <div className="mb-8 text-center">
                    <h2 className="text-2xl font-bold mb-2">Configure Tees</h2>
                    <p className="text-zinc-400 text-sm">Select the tee box each player will be hitting from to accurately calculate handicaps for this round.</p>
                </div>

                <form action={setupMatch} className="space-y-6">
                    <input type="hidden" name="leagueSlug" value={slug} />
                    <input type="hidden" name="matchId" value={matchId} />

                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
                        {players.map(player => (
                            <div key={player.id} className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex flex-shrink-0 items-center justify-center text-zinc-500 font-bold overflow-hidden relative text-xs">
                                        {player.image ? (
                                            <Image src={player.image} alt="" fill className="object-cover" />
                                        ) : (
                                            player.firstName?.[0] || "?"
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm truncate">
                                            {player.firstName && player.lastName ? `${player.firstName} ${player.lastName}` : player.username}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            <span>HCP: {player.leagueHandicap || "0.0"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-shrink-0 w-40">
                                    <select
                                        name={`player-${player.id}-tee`}
                                        defaultValue={player.teeId || ""}
                                        required
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                                    >
                                        <option value="" disabled>Select Tee...</option>
                                        {availableTees.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} (R:{t.rating}/S:{t.slope})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all">
                        Start Match
                    </button>
                </form>
            </div>
        </div>
    );
}
