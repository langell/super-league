import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { seasons, courses, rounds } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Save, Wand2, Trash2 } from "lucide-react";
import { updateSeason, deleteSeason } from "@/app/actions";
import { notFound } from "next/navigation";

export default async function EditSeasonPage({ params }: { params: Promise<{ slug: string; seasonId: string }> }) {
    const { slug, seasonId } = await params;
    const league = await getLeagueAdmin(slug);

    const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId)).limit(1);
    if (!season) notFound();

    const allCourses = await db.select().from(courses);

    // Check if rounds already exist
    const [roundsCount] = await db.select({ value: count() }).from(rounds).where(eq(rounds.seasonId, seasonId));
    const hasRounds = roundsCount.value > 0;

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <Link href={`/dashboard/${slug}/schedule`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to Schedule
                </Link>

                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Edit Season</h1>
                    <p className="text-zinc-400">Update <span className="text-white font-bold">{season.name}</span>.</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8">
                    <form action={updateSeason} className="space-y-6">
                        <input type="hidden" name="organizationId" value={league.id} />
                        <input type="hidden" name="leagueSlug" value={slug} />
                        <input type="hidden" name="seasonId" value={season.id} />

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Season Name</label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={season.name}
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="active" defaultChecked={season.active} value="true" className="w-4 h-4 accent-emerald-500" />
                            <label className="text-sm font-bold">Active Season</label>
                        </div>

                        {!hasRounds && (
                            <div className="pt-6 border-t border-zinc-800">
                                <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                    <Wand2 size={20} />
                                    <h3 className="font-bold">Auto-Populate Rounds</h3>
                                </div>
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-sm text-zinc-400 mb-6">
                                    This season has no rounds. You can automatically generate them below.
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Start Date</label>
                                        <input
                                            name="startDate"
                                            type="date"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors bg-white/5 opacity-100"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">End Date</label>
                                        <input
                                            name="endDate"
                                            type="date"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors bg-white/5 opacity-100"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Weekly Day</label>
                                        <select
                                            name="frequencyDay"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                        >
                                            <option value="">Select Day...</option>
                                            <option value="0">Sunday</option>
                                            <option value="1">Monday</option>
                                            <option value="2">Tuesday</option>
                                            <option value="3">Wednesday</option>
                                            <option value="4">Thursday</option>
                                            <option value="5">Friday</option>
                                            <option value="6">Saturday</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Default Course (Optional)</label>
                                        <select
                                            name="defaultCourseId"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                        >
                                            <option value="">TBD / None</option>
                                            {allCourses.map(course => (
                                                <option key={course.id} value={course.id}>{course.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {hasRounds && (
                            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
                                <p className="text-zinc-500 text-sm">Rounds have already been created for this season. Manage them individually from the schedule.</p>
                            </div>
                        )}

                        <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex justify-center gap-2 items-center">
                            <Save size={20} />
                            Save Changes
                        </button>
                    </form>

                    <div className="pt-8 border-t border-zinc-800">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-red-500 font-bold mb-1">Delete Season</h3>
                                <p className="text-xs text-zinc-500">Permanently remove this season and all its rounds.</p>
                            </div>
                            <form action={deleteSeason}>
                                <input type="hidden" name="seasonId" value={season.id} />
                                <input type="hidden" name="leagueSlug" value={slug} />
                                <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold transition-colors flex items-center gap-2">
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
