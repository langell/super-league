import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { teams, teamMembers, leagueMembers, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Users, Trash2, X } from "lucide-react";
import Image from "next/image";
import { createTeam, deleteTeam, removeMemberFromTeam } from "@/app/actions";

export default async function TeamsPage({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);

    // Fetch details
    const allTeams = await db.select().from(teams).where(eq(teams.organizationId, league.id));

    // Fetch members for each team
    const teamDetails = await Promise.all(allTeams.map(async (team) => {
        const members = await db
            .select({
                id: teamMembers.id,
                leagueMemberId: leagueMembers.id,
                firstName: user.firstName,
                lastName: user.lastName,
                userName: user.name,
                image: user.image,
            })
            .from(teamMembers)
            .innerJoin(leagueMembers, eq(teamMembers.leagueMemberId, leagueMembers.id))
            .innerJoin(user, eq(leagueMembers.userId, user.id))
            .where(eq(teamMembers.teamId, team.id));

        return {
            ...team,
            members,
        };
    }));

    return (
        <div className="max-w-7xl mx-auto py-12 px-8">
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Teams</h1>
                    <p className="text-zinc-400">Manage 2-person teams for {league.name}.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-6">
                    {teamDetails.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl text-zinc-600">
                            <Users size={48} className="mx-auto mb-4 opacity-50" />
                            <p>No teams created yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {teamDetails.map((team) => (
                                <div key={team.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl group hover:border-zinc-700 transition-colors">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-xl font-bold">{team.name}</h3>
                                        <form action={deleteTeam}>
                                            <input type="hidden" name="teamId" value={team.id} />
                                            <input type="hidden" name="leagueSlug" value={slug} />
                                            <button className="text-zinc-600 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </form>
                                    </div>

                                    <div className="space-y-3">
                                        {team.members.map(member => (
                                            <div key={member.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden relative">
                                                        {member.image ? (
                                                            <Image src={member.image} alt="" fill className="object-cover" />
                                                        ) : (
                                                            <Users size={12} className="text-zinc-500" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold">
                                                        {member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : member.userName}
                                                    </span>
                                                </div>
                                                <form action={removeMemberFromTeam}>
                                                    <input type="hidden" name="teamMemberId" value={member.id} />
                                                    <input type="hidden" name="leagueSlug" value={slug} />
                                                    <button className="text-zinc-600 hover:text-red-500 transition-colors">
                                                        <X size={14} />
                                                    </button>
                                                </form>
                                            </div>
                                        ))}
                                        {team.members.length < 2 && (
                                            <Link
                                                href={`/dashboard/${slug}/teams/${team.id}/add-member`}
                                                className="block w-full py-3 border border-dashed border-zinc-800 rounded-xl text-center text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white hover:border-zinc-600 transition-colors"
                                            >
                                                + Add Player
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl sticky top-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Plus size={20} className="text-emerald-500" />
                            Create New Team
                        </h3>
                        <form action={createTeam} className="space-y-4">
                            <input type="hidden" name="leagueSlug" value={slug} />
                            <input type="hidden" name="organizationId" value={league.id} />

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Team Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="e.g. The Shanks"
                                    required
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>

                            <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all">
                                Create Team
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
