import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { teams, teamMembers, leagueMembers, user } from "@/db/schema";
import { eq, notInArray, and } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, PlusCircle, User, Users } from "lucide-react";
import Image from "next/image";
import { addMemberToTeam } from "@/actions/team";
import { redirect } from "next/navigation";

export default async function AddTeamMemberPage({ params }: { params: Promise<{ slug: string; teamId: string }> }) {
    const { slug, teamId } = await params;
    const league = await getLeagueAdmin(slug);

    // 1. Get Team Details
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team) redirect(`/dashboard/${slug}/teams`);

    // 2. Get current team members
    const currentMembers = await db.select({ id: teamMembers.leagueMemberId }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
    const currentMemberIds = currentMembers.map(m => m.id);

    // 3. Get all league members who are NOT in the current team
    // Improved logic: We might want to see who is available (not in ANY team)
    // For now, let's just list everyone not on THIS team, but maybe show if they are on another team?
    // Let's get ALL league members first.

    // Check global team usage
    const allKeyedTeamMembers = await db.select({
        leagueMemberId: teamMembers.leagueMemberId,
        teamName: teams.name
    })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teams.organizationId, league.id));

    const memberTeamMap = new Map<string, string>();
    allKeyedTeamMembers.forEach(tm => memberTeamMap.set(tm.leagueMemberId, tm.teamName));

    const availableMembers = await db
        .select({
            id: leagueMembers.id,
            role: leagueMembers.role,
            firstName: user.firstName,
            lastName: user.lastName,
            userName: user.name,
            image: user.image,
            email: user.email,
        })
        .from(leagueMembers)
        .innerJoin(user, eq(leagueMembers.userId, user.id))
        .where(
            and(
                eq(leagueMembers.organizationId, league.id),
                // Exclude members already on THIS team
                currentMemberIds.length > 0 ? notInArray(leagueMembers.id, currentMemberIds) : undefined
            )
        );

    return (
        <div className="min-h-screen bg-background text-white py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <Link href={`/dashboard/${slug}/teams`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to Teams
                </Link>

                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[10px] uppercase font-bold tracking-widest mb-4">
                        <Users size={10} />
                        Add Player
                    </div>
                    <h1 className="text-4xl font-bold mb-2">Select Player</h1>
                    <p className="text-zinc-400">Adding a teammate to <span className="text-white font-bold">{team.name}</span>.</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                    <div className="divide-y divide-zinc-800">
                        {availableMembers.map((member) => {
                            const existingTeamName = memberTeamMap.get(member.id);

                            return (
                                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden relative">
                                            {member.image ? (
                                                <Image src={member.image} alt="" fill className="object-cover" />
                                            ) : (
                                                <User size={20} className="text-zinc-500" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg">
                                                {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.userName}
                                            </p>
                                            <p className="text-xs text-zinc-500">{member.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {existingTeamName ? (
                                            <span className="px-3 py-1 bg-zinc-800 text-zinc-500 rounded-full text-xs font-bold border border-zinc-700">
                                                On Team: {existingTeamName}
                                            </span>
                                        ) : (
                                            <form action={addMemberToTeam}>
                                                <input type="hidden" name="leagueSlug" value={slug} />
                                                <input type="hidden" name="teamId" value={teamId} />
                                                <input type="hidden" name="leagueMemberId" value={member.id} />
                                                <button className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10">
                                                    <PlusCircle size={16} />
                                                    Add Player
                                                </button>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {availableMembers.length === 0 && (
                            <div className="p-12 text-center text-zinc-500">
                                All eligible players are already on this team.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
