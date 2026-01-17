import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { seasons, rounds, courses } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import Link from "next/link";
import { Calendar, Plus, MapPin, ChevronRight, Trophy, Edit } from "lucide-react";
import { generateSchedule } from "@/actions/round";

export default async function SchedulePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);

    // Fetch all seasons
    const allSeasons = await db.select().from(seasons).where(eq(seasons.organizationId, league.id)).orderBy(desc(seasons.createdAt));

    // For now, let's just focus on the most recent/active season. 
    // In a full app, we'd have a season selector.
    const currentSeason = allSeasons.find(s => s.active) || allSeasons[0];

    // Fetch rounds for the current season if it exists
    let scheduledRounds: {
        id: string;
        date: Date;
        status: string;
        courseName: string;
        courseCity: string | null;
        courseState: string | null;
        courseId: string;
        holesCount: number;
        roundType: string | null;
    }[] = [];
    if (currentSeason) {
        scheduledRounds = await db
            .select({
                id: rounds.id,
                date: rounds.date,
                status: rounds.status,
                courseName: courses.name,
                courseCity: courses.city,
                courseState: courses.state,
                courseId: courses.id,
                holesCount: rounds.holesCount,
                roundType: rounds.roundType,
            })
            .from(rounds)
            .innerJoin(courses, eq(rounds.courseId, courses.id))
            .where(eq(rounds.seasonId, currentSeason.id))
            .orderBy(asc(rounds.date));
    }

    return (
        <div className="w-full py-12 px-8">
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Schedule</h1>
                    <p className="text-zinc-400">Manage seasons and rounds for {league.name}.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                {/* Sidebar: Seasons List */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Trophy size={18} className="text-emerald-500" />
                            Seasons
                        </h3>

                        <div className="space-y-2 mb-6">
                            {allSeasons.length === 0 ? (
                                <p className="text-sm text-zinc-500 italic">No seasons yet.</p>
                            ) : (
                                allSeasons.map(season => (
                                    <div
                                        key={season.id}
                                        className={`p-3 rounded-xl border cursor-pointer transition-colors ${season.id === currentSeason?.id
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 font-bold'
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span>{season.name}</span>
                                                {season.active && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                                            </div>
                                            <Link href={`/dashboard/${slug}/schedule/${season.id}/edit`} className="p-1 text-zinc-600 hover:text-white transition-colors">
                                                <Edit size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <Link href={`/dashboard/${slug}/schedule/new`} className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">
                            <Plus size={16} />
                            New Season
                        </Link>
                    </div>
                </div>

                {/* Main Content: Rounds */}
                <div className="lg:col-span-3">
                    {!currentSeason ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600">
                            <Calendar size={48} className="mb-4 opacity-50" />
                            <h3 className="text-xl font-bold text-zinc-500">No Active Season</h3>
                            <p>Create a season on the left to start scheduling rounds.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center">
                                <h2 className="text-2xl font-bold">{currentSeason.name} Schedule</h2>
                                <div className="flex gap-2">
                                    <form action={generateSchedule}>
                                        <input type="hidden" name="leagueSlug" value={slug} />
                                        <input type="hidden" name="seasonId" value={currentSeason.id} />
                                        <button
                                            type="submit"
                                            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                                        >
                                            <Calendar size={18} />
                                            Auto-Generate
                                        </button>
                                    </form>
                                    <Link
                                        href={`/dashboard/${slug}/schedule/${currentSeason.id}/new-round`}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10"
                                    >
                                        <Plus size={18} />
                                        Add Round
                                    </Link>
                                </div>
                            </div>

                            {scheduledRounds.length === 0 ? (
                                <div className="p-12 text-center bg-zinc-900 border border-zinc-800 rounded-3xl">
                                    <p className="text-zinc-500">No rounds scheduled for this season yet.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {scheduledRounds.map((round) => (
                                        <div key={round.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-all group relative overflow-hidden">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 bg-zinc-950 rounded-2xl flex flex-col items-center justify-center border border-zinc-800">
                                                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">{round.date.toLocaleString('default', { month: 'short' })}</span>
                                                        <span className="text-2xl font-bold text-white">{round.date.getDate()}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-bold mb-1 group-hover:text-emerald-500 transition-colors">{round.courseName}</h3>
                                                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                                                            <MapPin size={14} />
                                                            {round.courseCity}, {round.courseState}
                                                            <span className="mx-2">•</span>
                                                            <span className="text-zinc-400">
                                                                {round.holesCount} Holes
                                                                {round.roundType !== '18_holes' && ` (${round.roundType === 'front_9' ? 'Front' : 'Back'})`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${round.status === 'completed' ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                        }`}>
                                                        {round.status}
                                                    </span>
                                                    <Link
                                                        href={`/dashboard/${slug}/schedule/${currentSeason.id}/rounds/${round.id}/edit`}
                                                        className="p-3 bg-zinc-950 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                                    >
                                                        <Edit size={20} />
                                                    </Link>
                                                    <Link href={`/dashboard/${slug}/schedule/${currentSeason.id}/rounds/${round.id}`} className="p-3 bg-zinc-950 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                                                        <ChevronRight size={20} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
