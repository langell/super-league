import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { rounds, courses } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { updateRound, deleteRound } from "@/app/actions";
import { notFound } from "next/navigation";

export default async function EditRoundPage({ params }: { params: Promise<{ slug: string; seasonId: string; roundId: string }> }) {
    const { slug, seasonId, roundId } = await params;
    await getLeagueAdmin(slug);

    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1);
    const allCourses = await db.select().from(courses);

    if (!round) notFound();

    return (
        <div className="min-h-screen bg-background text-white py-12 px-6">
            <div className="max-w-2xl mx-auto">
                <Link href={`/dashboard/${slug}/schedule`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to Schedule
                </Link>

                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-2">Edit Round</h1>
                    <p className="text-zinc-400">Update details for the round on <span className="text-white font-bold">{round.date.toDateString()}</span>.</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8">
                    <form action={updateRound} className="space-y-6">
                        <input type="hidden" name="leagueSlug" value={slug} />
                        <input type="hidden" name="seasonId" value={seasonId} />
                        <input type="hidden" name="roundId" value={roundId} />

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Course</label>
                            <select
                                name="courseId"
                                defaultValue={round.courseId || ""}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            >
                                <option value="">TBD / Be Decided</option>
                                {allCourses.map(course => (
                                    <option key={course.id} value={course.id}>{course.name} ({course.city}, {course.state})</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Date</label>
                            {/* Format date for input: YYYY-MM-DD */}
                            <input
                                type="date"
                                name="date"
                                required
                                defaultValue={round.date.toISOString().split('T')[0]}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors bg-white/5 opacity-100"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Holes</label>
                                <select
                                    name="holesCount"
                                    defaultValue={round.holesCount}
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
                                    defaultValue={round.roundType || "18_holes"}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                >
                                    <option value="18_holes">18 Holes</option>
                                    <option value="front_9">Front 9</option>
                                    <option value="back_9">Back 9</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Status</label>
                            <select
                                name="status"
                                defaultValue={round.status}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            >
                                <option value="scheduled">Scheduled</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex justify-center gap-2 items-center">
                            <Save size={20} />
                            Save Changes
                        </button>
                    </form>

                    <div className="pt-8 border-t border-zinc-800">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-red-500 font-bold mb-1">Delete Round</h3>
                                <p className="text-xs text-zinc-500">Remove this round from the schedule.</p>
                            </div>
                            <form action={deleteRound}>
                                <input type="hidden" name="roundId" value={round.id} />
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
