import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { seasons, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { createRound } from "@/actions/round";
import { notFound } from "next/navigation";

export default async function NewRoundPage({ params }: { params: Promise<{ slug: string; seasonId: string }> }) {
    const { slug, seasonId } = await params;
    await getLeagueAdmin(slug);

    const [season] = await db.select().from(seasons).where(eq(seasons.id, seasonId)).limit(1);
    const allCourses = await db.select().from(courses);

    if (!season) notFound();

    return (
        <div className="min-h-screen bg-background text-white py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <Link href={`/dashboard/${slug}/schedule`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to Schedule
                </Link>

                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Create Round</h1>
                    <p className="text-zinc-400">Add a new event to <span className="text-white font-bold">{season.name}</span>.</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                    <form action={createRound} className="space-y-6">
                        <input type="hidden" name="leagueSlug" value={slug} />
                        <input type="hidden" name="seasonId" value={season.id} />

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Course</label>
                            <select
                                name="courseId"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            >
                                <option value="">Select a Course...</option>
                                {allCourses.map(course => (
                                    <option key={course.id} value={course.id}>{course.name} ({course.city}, {course.state})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Date</label>
                            <input
                                type="date"
                                name="date"
                                required
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors bg-white/5 opacity-100" // Ensure calendar icon is visible
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Holes</label>
                                <select
                                    name="holesCount"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                >
                                    <option value="18">18 Holes</option>
                                    <option value="9">9 Holes</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Type / Side</label>
                                <select
                                    name="roundType"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                >
                                    <option value="18_holes">18 Holes</option>
                                    <option value="front_9">Front 9</option>
                                    <option value="back_9">Back 9</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex justify-center gap-2 items-center">
                            <Save size={20} />
                            Save Round
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
