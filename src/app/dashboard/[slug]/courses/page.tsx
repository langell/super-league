import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { courses } from "@/db/schema";
import Link from "next/link";
import { MapPin, Edit, Phone, Mail, Globe, User } from "lucide-react";

export default async function LeagueCoursesPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    await getLeagueAdmin(slug);
    const allCourses = await db.select().from(courses);

    return (
        <div className="max-w-7xl mx-auto py-12 px-8">
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Course Management</h1>
                    <p className="text-zinc-500">Manage your golf courses and their details</p>
                </div>
                <Link href={`/dashboard/${slug}/courses/new`} className="px-6 py-3 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-colors">
                    Add New Course
                </Link>
            </div>
            <div className="grid gap-4">
                {allCourses.map((course) => (
                    <div key={course.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <MapPin className="text-emerald-500" size={24} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-bold mb-2">{course.name}</h3>
                                    <div className="space-y-1 text-sm">
                                        {course.address && (
                                            <p className="text-zinc-400">{course.address}</p>
                                        )}
                                        <p className="text-zinc-400">
                                            {course.city}, {course.state} {course.zipCode || ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={`/dashboard/${slug}/courses/${course.id}/edit`}
                                className="p-3 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                <Edit size={20} />
                            </Link>
                        </div>

                        {/* Contact Information */}
                        {(course.phoneNumber || course.email || course.website || course.proName) && (
                            <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {course.proName && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <User size={16} className="text-zinc-500" />
                                        <span className="text-zinc-400">Head Pro:</span>
                                        <span className="text-white font-medium">{course.proName}</span>
                                    </div>
                                )}
                                {course.phoneNumber && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Phone size={16} className="text-zinc-500" />
                                        <a href={`tel:${course.phoneNumber}`} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                                            {course.phoneNumber}
                                        </a>
                                    </div>
                                )}
                                {course.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Mail size={16} className="text-zinc-500" />
                                        <a href={`mailto:${course.email}`} className="text-emerald-500 hover:text-emerald-400 transition-colors">
                                            {course.email}
                                        </a>
                                    </div>
                                )}
                                {course.website && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Globe size={16} className="text-zinc-500" />
                                        <a
                                            href={course.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-500 hover:text-emerald-400 transition-colors"
                                        >
                                            Visit Website
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {allCourses.length === 0 && (
                    <div className="p-12 text-center border border-zinc-900 rounded-2xl">
                        <MapPin size={48} className="mx-auto mb-4 text-zinc-700" />
                        <h3 className="text-xl font-bold mb-2 text-zinc-400">No Courses Yet</h3>
                        <p className="text-zinc-600 mb-6">Get started by adding your first golf course</p>
                        <Link href={`/dashboard/${slug}/courses/new`} className="inline-block px-6 py-3 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-colors">
                            Add Your First Course
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
