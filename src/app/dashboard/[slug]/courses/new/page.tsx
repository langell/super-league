import { getLeagueAdmin } from "@/lib/auth-utils";
import { createCourse } from "@/app/actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewCoursePage({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    await getLeagueAdmin(slug);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-20 px-6">
            <div className="max-w-xl mx-auto">
                <Link href={`/dashboard/${slug}/courses`} className="inline-flex items-center gap-2 text-zinc-500 mb-8">
                    <ArrowLeft size={20} />
                    Back to Courses
                </Link>
                <h1 className="text-4xl font-bold mb-4">Add a Golf Course</h1>
                <form action={createCourse} className="space-y-6">
                    <input type="hidden" name="leagueSlug" value={slug} />
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-zinc-300">Course Name</label>
                        <input type="text" name="name" id="name" required placeholder="Augusta" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" name="city" placeholder="City" required className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none" />
                        <input type="text" name="state" placeholder="State" required className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-emerald-500 text-black font-bold rounded-2xl transition-all">Create Course</button>
                </form>
            </div>
        </div>
    );
}
