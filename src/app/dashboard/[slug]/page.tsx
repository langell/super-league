import { getLeagueAdmin } from "@/lib/auth-utils";
import Link from "next/link";
import { Trophy, MapPin, Settings, Users, LayoutGrid, ArrowRight } from "lucide-react";

export default async function LeagueAdminDashboard({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
                            <LayoutGrid size={20} className="text-zinc-500" />
                        </Link>
                        <div className="h-6 w-[1px] bg-zinc-800" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black">
                                <Trophy size={20} />
                            </div>
                            <h1 className="font-bold text-xl">{league.name} Console</h1>
                        </div>
                    </div>
                    <Link href={`/dashboard/${slug}/settings`} className="p-2 text-zinc-400 hover:text-white">
                        <Settings size={20} />
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl">
                        <div className="flex items-center gap-3 text-zinc-500 mb-3">
                            <Users size={20} />
                            <span className="text-xs font-bold uppercase tracking-widest">Players</span>
                        </div>
                        <p className="text-3xl font-bold">--</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2">
                        <section className="p-12 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
                            <p className="text-zinc-600 mb-4">No rounds scheduled yet.</p>
                            <button className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm font-bold rounded-lg transition-all">
                                Create First Round
                            </button>
                        </section>
                    </div>

                    <div className="space-y-4">
                        <Link href={`/dashboard/${slug}/courses`} className="block p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500 transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <MapPin className="text-emerald-500" />
                                    <span className="font-bold">Course Database</span>
                                </div>
                                <ArrowRight size={20} />
                            </div>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
