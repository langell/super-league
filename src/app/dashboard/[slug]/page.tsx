import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { leagueMembers } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { Trophy, MapPin, Users, ArrowRight, UserPlus } from "lucide-react";

export default async function LeagueAdminDashboard({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);

    const [memberCountResult] = await db
        .select({ value: count() })
        .from(leagueMembers)
        .where(eq(leagueMembers.organizationId, league.id));

    return (
        <div className="max-w-7xl mx-auto px-8 py-12">

            <div className="mb-12">
                <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
                <p className="text-zinc-400">Here is what is happening in {league.name}.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <Link href={`/dashboard/${slug}/members`} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500 transition-all group">
                    <div className="flex items-center gap-3 text-zinc-500 mb-3 group-hover:text-emerald-500 transition-colors">
                        <Users size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Players</span>
                    </div>
                    <p className="text-3xl font-bold">{memberCountResult?.value || 0}</p>
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <section className="p-12 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
                        <div className="flex flex-col items-center justify-center">
                            <Trophy size={48} className="mb-4 text-zinc-700" />
                            <h3 className="text-xl font-bold text-zinc-500 mb-2">Schedule & Rounds</h3>
                            <p className="text-zinc-600 mb-6">Manage your seasons and upcoming matches.</p>
                            <Link href={`/dashboard/${slug}/schedule`} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all">
                                Manage Schedule
                            </Link>
                        </div>
                    </section>
                </div>

                <div className="space-y-4">
                    <Link href={`/dashboard/${slug}/members`} className="block p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <UserPlus className="text-emerald-500" />
                                <span className="font-bold">Member Roster</span>
                            </div>
                            <ArrowRight size={20} />
                        </div>
                    </Link>

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
        </div>
    );
}
