import { auth } from "@/auth";
import { db } from "@/db";
import { leagueMembers, organizations, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Plus, ArrowRight } from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";

const ICON_SIZE_MEDIUM = 24;
const ICON_SIZE_SMALL = 20;

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/api/auth/signin");
    }

    // Fetch leagues where user is a member
    const userLeagues = await db
        .select({
            id: organizations.id,
            name: organizations.name,
            slug: organizations.slug,
            role: leagueMembers.role,
        })
        .from(leagueMembers)
        .innerJoin(organizations, eq(leagueMembers.organizationId, organizations.id))
        .where(eq(leagueMembers.userId, session.user.id ?? ""));

    // Fetch user details for header
    const [userInfo] = await db.select().from(user).where(eq(user.id, session.user.id ?? "")).limit(1);

    return (
        <div className="min-h-screen bg-background text-white">
            <DashboardHeader user={userInfo || session.user} />

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">My Leagues</h1>
                        <p className="text-zinc-400 text-lg">Manage your golf leagues.</p>
                    </div>
                    <Link
                        href="/dashboard/new"
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all"
                    >
                        <Plus size={ICON_SIZE_SMALL} />
                        Create New League
                    </Link>
                </div>

                {userLeagues.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {userLeagues.map((league) => (
                            <LeagueCard key={league.id} league={league} />
                        ))}
                    </div>
                ) : (
                    <div className="py-24 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
                        <h3 className="text-2xl font-bold mb-2 text-zinc-400">No leagues found</h3>
                        <Link href="/dashboard/new" className="text-emerald-500 hover:underline">Create your first league</Link>
                    </div>
                )}
            </main>
        </div>
    );
}

interface League {
    id: string;
    name: string;
    slug: string;
    role: string | null;
}

function LeagueCard({ league }: { league: League }) {
    return (
        <div className="group p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition-all">
            <div className="flex justify-between items-start mb-6">
                <Trophy className="text-emerald-500" size={ICON_SIZE_MEDIUM} />
                <div className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] uppercase font-bold text-zinc-400">
                    {league.role}
                </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{league.name}</h3>
            <p className="text-zinc-500 text-sm mb-8">leaguely.gg/{league.slug}</p>
            <Link
                href={`/dashboard/${league.slug}`}
                className="flex items-center justify-between pt-6 border-t border-zinc-800/50 group-hover:text-emerald-400 transition-all"
            >
                <span>Enter Console</span>
                <ArrowRight size={ICON_SIZE_SMALL} />
            </Link>
        </div>
    );
}
