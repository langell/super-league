import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { tees, holes, courses } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function TeeHolesPage({ params }: { params: { slug: string, teeId: string } }) {
    const { slug, teeId } = await params;
    await getLeagueAdmin(slug);

    const [tee] = await db.select().from(tees).where(eq(tees.id, teeId)).limit(1);
    if (!tee) return <div>Tee not found</div>;

    const [course] = await db.select().from(courses).where(eq(courses.id, tee.courseId)).limit(1);
    const existingHoles = await db.select().from(holes).where(eq(holes.teeId, teeId)).orderBy(asc(holes.holeNumber));

    const holeData = Array.from({ length: 18 }, (_, i) => {
        const holeNumber = i + 1;
        const existing = existingHoles.find(h => h.holeNumber === holeNumber);
        return existing || { holeNumber, par: 4, handicapIndex: holeNumber, yardage: null };
    });

    async function saveHoles(formData: FormData) {
        "use server";
        const updates = [];
        for (let i = 1; i <= 18; i++) {
            updates.push({
                teeId,
                holeNumber: i,
                par: parseInt(formData.get(`par-${i}`) as string),
                handicapIndex: parseInt(formData.get(`hdcp-${i}`) as string),
                yardage: parseInt(formData.get(`yardage-${i}`) as string) || null
            });
        }
        await db.delete(holes).where(eq(holes.teeId, teeId));
        await db.insert(holes).values(updates);
        revalidatePath(`/dashboard/${slug}/tees/${teeId}`);
        redirect(`/dashboard/${slug}/courses/${tee.courseId}`);
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href={`/dashboard/${slug}/courses/${tee.courseId}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to {course?.name}
                </Link>
                <h1 className="text-4xl font-bold mb-8">{tee.name} Scorecard</h1>
                <form action={saveHoles}>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden mb-8">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold">
                                    <th className="px-6 py-4">Hole</th>
                                    <th className="px-6 py-4">Par</th>
                                    <th className="px-6 py-4">Stroke Index</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holeData.map((h: { holeNumber: number; par: number; handicapIndex: number; yardage: number | null }) => (
                                    <tr key={h.holeNumber} className="border-t border-zinc-800">
                                        <td className="px-6 py-4 font-bold text-emerald-500">{h.holeNumber}</td>
                                        <td className="px-6 py-4">
                                            <select name={`par-${h.holeNumber}`} defaultValue={h.par} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none">
                                                {[3, 4, 5].map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input type="number" name={`hdcp-${h.holeNumber}`} defaultValue={h.handicapIndex} min={1} max={18} className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="submit" className="w-full py-5 bg-emerald-500 text-black font-bold rounded-2xl shadow-xl">
                        <Save size={20} className="inline mr-2" />
                        Save Scorecard
                    </button>
                </form>
            </div>
        </div>
    );
}
