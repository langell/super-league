import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { courses } from "@/db/schema";
import Link from "next/link";
import { ArrowLeft, Save, Wand2 } from "lucide-react";
import { createSeason } from "@/app/actions";

export default async function NewSeasonPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);
    const allCourses = await db.select().from(courses);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <Link href={`/dashboard/${slug}/schedule`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to Schedule
                </Link>

                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">New Season</h1>
                    <p className="text-zinc-400">Create a season and optionally auto-generate the rounds.</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                    <form action={createSeason} className="space-y-6">
                        <input type="hidden" name="organizationId" value={league.id} />
                        <input type="hidden" name="leagueSlug" value={slug} />

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Season Name</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Summer 2026"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div className="pt-6 border-t border-zinc-800">
                            <div className="flex items-center gap-2 mb-4 text-emerald-500">
                                <Wand2 size={20} />
                                <h3 className="font-bold">Auto-Populate Rounds (Optional)</h3>
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
                            <p className="text-xs text-zinc-500 mt-2">
                                If dates and day are selected, we will automatically create rounds for every week between the dates.
                            </p>
                        </div>

                        <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex justify-center gap-2 items-center">
                            <Save size={20} />
                            Create Season
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
