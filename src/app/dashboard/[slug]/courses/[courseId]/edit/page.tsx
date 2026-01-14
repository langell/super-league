import { getLeagueAdmin } from "@/lib/auth-utils";
import { updateCourse } from "@/app/actions";
import { ArrowLeft, Edit, Sparkles, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { courses, tees } from "@/db/schema";
import { ScorecardScanner } from "@/components/ScorecardScanner";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function EditCoursePage({ params }: { params: { slug: string; courseId: string } }) {
    const { slug, courseId } = await params;
    await getLeagueAdmin(slug);

    const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
    const courseTees = await db.select().from(tees).where(eq(tees.courseId, courseId));

    if (!course) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-20 px-6 font-sans">
            <div className="max-w-2xl mx-auto">
                <Link href={`/dashboard/${slug}/courses`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-12 transition-colors">
                    <ArrowLeft size={18} />
                    <span className="text-sm font-bold uppercase tracking-wider">Back to Courses</span>
                </Link>

                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[10px] uppercase font-bold tracking-widest mb-4">
                        <Edit size={10} />
                        Edit Mode
                    </div>
                    <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">Edit Course</h1>
                    <p className="text-zinc-500 text-lg">Update the details for {course.name}.</p>
                </div>

                <div className="space-y-12">
                    {/* Scanner Section for Updates */}
                    <section>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 px-2 flex items-center gap-2">
                            <Sparkles size={14} className="text-emerald-500" />
                            Update via AI Scan
                        </h3>
                        <ScorecardScanner
                            leagueSlug={slug}
                            courseId={course.id}
                            initialName={course.name}
                            initialCity={course.city || ""}
                            initialState={course.state || ""}
                        />
                    </section>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-900 border-dashed"></span>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-zinc-800">
                            <span className="bg-[#0a0a0a] px-4">Or edit manually</span>
                        </div>
                    </div>

                    <section>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 px-2">Course Details</h3>
                        <form action={updateCourse} className="p-8 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl space-y-6">
                            <input type="hidden" name="leagueSlug" value={slug} />
                            <input type="hidden" name="courseId" value={course.id} />

                            <div className="space-y-2">
                                <label htmlFor="name" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Course Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    id="name"
                                    defaultValue={course.name}
                                    required
                                    placeholder="e.g. Pinehurst No. 2"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                />
                            </div>


                            <div className="space-y-2">
                                <label htmlFor="address" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Street Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    id="address"
                                    defaultValue={course.address || ""}
                                    placeholder="123 Golf Course Rd"
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
                                        defaultValue={course.city || ""}
                                        required
                                        placeholder="Village of"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="state" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">State</label>
                                    <input
                                        type="text"
                                        name="state"
                                        id="state"
                                        defaultValue={course.state || ""}
                                        required
                                        placeholder="NC"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="zipCode" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Zip Code</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        id="zipCode"
                                        defaultValue={course.zipCode || ""}
                                        placeholder="12345"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="phone" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        id="phoneNumber"
                                        defaultValue={course.phoneNumber || ""}
                                        placeholder="(555) 123-4567"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="proName" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Head Pro Name</label>
                                <input
                                    type="text"
                                    name="proName"
                                    id="proName"
                                    defaultValue={course.proName || ""}
                                    placeholder="Jane Doe"
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        id="email"
                                        defaultValue={course.email || ""}
                                        placeholder="contact@course.com"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="website" className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Website URL</label>
                                    <input
                                        type="url"
                                        name="website"
                                        id="website"
                                        defaultValue={course.website || ""}
                                        placeholder="https://course.com"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-5 bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all flex items-center justify-center gap-2">
                                <Edit size={16} />
                                Update Course
                            </button>
                        </form>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-6 px-2">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tees & Holes</h3>
                            {/* Future: Add manual tee creation button */}
                        </div>

                        <div className="space-y-4">
                            {courseTees.map(tee => (
                                <div key={tee.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <div>
                                            <h4 className="font-bold text-lg">{tee.name}</h4>
                                            <div className="flex gap-4 text-xs text-zinc-500 font-mono mt-1">
                                                <span>R: {tee.rating}</span>
                                                <span>S: {tee.slope}</span>
                                                <span>P: {tee.par}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Future: Add individual tee edit/delete actions */}
                                    <div className="text-xs text-zinc-600 italic">
                                        Scan card to update
                                    </div>
                                </div>
                            ))}
                            {courseTees.length === 0 && (
                                <div className="p-8 text-center border border-zinc-900 rounded-2xl text-zinc-600 text-sm">
                                    No tees found. Scan a scorecard to add them.
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-900 border-dashed"></span>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-zinc-800">
                            <span className="bg-[#0a0a0a] px-4">Danger Zone</span>
                        </div>
                    </div>

                    <section className="pb-12">
                        <div className="p-8 bg-red-950/10 border border-red-900/20 rounded-3xl flex items-center justify-between">
                            <div>
                                <h3 className="text-red-500 font-bold mb-1">Delete Course</h3>
                                <p className="text-zinc-600 text-sm">This will permanently remove the course and all its data.</p>
                            </div>
                            <form action={async (formData) => {
                                "use server";
                                // Re-import to avoid "deleteCourse is not a function" client-side ambiguity if any
                                const { deleteCourse } = await import("@/app/actions");
                                await deleteCourse(formData);
                            }}>
                                <input type="hidden" name="leagueSlug" value={slug} />
                                <input type="hidden" name="courseId" value={course.id} />
                                <button type="submit" className="p-4 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-xl transition-all">
                                    <Trash2 size={20} />
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
