import { getLeagueAdmin } from "@/lib/auth-utils";
import { createCourse } from "@/app/actions";
import { ArrowLeft, Sparkles, Plus } from "lucide-react";
import Link from "next/link";
import { CourseSearch } from "@/components/CourseSearch";

export default async function NewCoursePage({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    await getLeagueAdmin(slug);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-20 px-6 font-sans">
            <div className="max-w-2xl mx-auto">
                <Link href={`/dashboard/${slug}/courses`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-12 transition-colors">
                    <ArrowLeft size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Back to Courses</span>
                </Link>

                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[10px] uppercase font-bold tracking-widest mb-4">
                        <Sparkles size={10} />
                        Smart Database
                    </div>
                    <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Add Course</h1>
                    <p className="text-zinc-500 text-lg">Import scorecard data from our global database of 40,000+ courses or enter it manually.</p>
                </div>

                <div className="space-y-12">
                    {/* Discovery Section */}
                    <section>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 px-2">Import from Database</h3>
                        <CourseSearch leagueSlug={slug} />
                    </section>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-900"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#0a0a0a] px-4 text-zinc-700 font-bold">Or</span>
                        </div>
                    </div>

                    {/* Manual Section */}
                    <section>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 px-2">Manual Entry</h3>
                        <form action={createCourse} className="p-8 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl space-y-6">
                            <input type="hidden" name="leagueSlug" value={slug} />

                            <div className="space-y-2">
                                <label htmlFor="name" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Course Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    required
                                    placeholder="e.g. Pinehurst No. 2"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="city" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">City</label>
                                    <input
                                        type="text"
                                        name="city"
                                        id="city"
                                        required
                                        placeholder="Village of"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="state" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">State / Region</label>
                                    <input
                                        type="text"
                                        name="state"
                                        id="state"
                                        required
                                        placeholder="NC"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2">
                                <Plus size={16} />
                                Create Manual Course
                            </button>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
}
