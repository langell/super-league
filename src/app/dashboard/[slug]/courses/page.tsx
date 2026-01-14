import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { courses } from "@/db/schema";
import Link from "next/link";
import { MapPin, Edit } from "lucide-react";

export default async function LeagueCoursesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    await getLeagueAdmin(slug);
    const allCourses = await db.select().from(courses);

    return (
        <div className="max-w-7xl mx-auto py-12 px-8">
            <div className="flex justify-between items-end mb-12">
                <h1 className="text-4xl font-bold">Course Management</h1>
                <Link href={`/dashboard/${slug}/courses/new`} className="px-6 py-3 bg-emerald-500 text-black font-semibold rounded-xl">Add New Course</Link>
            </div>
            <div className="grid gap-4">
                {allCourses.map((course) => (
                    <div key={course.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <MapPin className="text-emerald-500" />
                            <div>
                                <h3 className="text-xl font-bold">{course.name}</h3>
                                <p className="text-zinc-500">{course.city}, {course.state}</p>
                            </div>
                        </div>
                        <Link href={`/dashboard/${slug}/courses/${course.id}/edit`} className="p-2 text-zinc-500 hover:text-white transition-colors">
                            <Edit size={16} />
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
