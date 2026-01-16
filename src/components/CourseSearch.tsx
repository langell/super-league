"use client";

import { useState } from "react";
import { searchCourses, CourseSearchResult } from "@/lib/course-api";
import { Search, MapPin, Plus, Loader2, Sparkles } from "lucide-react";
import { importCourseFromApi } from "@/actions/course";

export function CourseSearch({ leagueSlug }: { leagueSlug: string }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CourseSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isImporting, setIsImporting] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const data = await searchCourses(query);
            setResults(data);
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search 40,000+ courses worldwide..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-emerald-500 transition-all shadow-xl"
                />
                <button
                    type="submit"
                    disabled={isSearching}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                >
                    {isSearching ? <Loader2 className="animate-spin" size={18} /> : "Search"}
                </button>
            </form>

            <div className="space-y-3">
                {results.length > 0 && (
                    <div className="flex items-center gap-2 px-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                        <Sparkles size={12} className="text-emerald-500" />
                        AI Discovery Results
                    </div>
                )}

                {results.map((course) => (
                    <div
                        key={course.courseID}
                        className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-emerald-500 transition-colors">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold">{course.courseName}</h4>
                                <p className="text-xs text-zinc-500">{course.clubName} • {course.city}, {course.state}</p>
                            </div>
                        </div>

                        <form action={importCourseFromApi}>
                            <input type="hidden" name="leagueSlug" value={leagueSlug} />
                            <input type="hidden" name="courseId" value={course.courseID} />
                            <button
                                onClick={() => setIsImporting(course.courseID)}
                                disabled={isImporting !== null}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                            >
                                {isImporting === course.courseID ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <Plus size={16} />
                                        Import
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ))}

                {query && results.length === 0 && !isSearching && (
                    <p className="text-center py-8 text-zinc-600 text-sm">No courses matching &quot;{query}&quot; found.</p>
                )}
            </div>
        </div>
    );
}
