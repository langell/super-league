import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { leagueMembers, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { UserPlus, Shield, User as UserIcon, Trash2, Edit } from "lucide-react";
import { removeMemberFromLeague } from "@/app/actions";
import Image from "next/image";
import { InviteMemberForm } from "@/components/InviteMemberForm";
export default async function LeagueMembersPage({ params }: { params: { slug: string } }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);

    const members = await db
        .select({
            id: leagueMembers.id,
            role: leagueMembers.role,
            handicap: leagueMembers.handicap,
            userName: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            userEmail: user.email,
            userImage: user.image,
            userPhone: user.phone,
        })
        .from(leagueMembers)
        .innerJoin(user, eq(leagueMembers.userId, user.id))
        .where(eq(leagueMembers.organizationId, league.id));

    return (
        <div className="max-w-6xl mx-auto py-12 px-8">
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Member Roster</h1>
                    <p className="text-zinc-400">Manage players and administrators for {league.name}.</p>
                </div>

                <div className="flex gap-4">
                    <Link
                        href={`/dashboard/${slug}/teams`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors border border-zinc-700"
                    >
                        <UserIcon size={16} />
                        Manage Teams
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-800/50 text-zinc-500 text-xs uppercase font-bold">
                                    <th className="px-6 py-4">Player</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Handicap</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member) => (
                                    <tr key={member.id} className="border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden relative">
                                                    {member.userImage ? (
                                                        <Image src={member.userImage} alt="" fill className="object-cover" />
                                                    ) : (
                                                        <UserIcon size={18} className="text-zinc-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold">
                                                        {member.firstName && member.lastName
                                                            ? `${member.firstName} ${member.lastName}`
                                                            : member.userName || "Unnamed Player"}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">{member.userEmail} {member.userPhone && `• ${member.userPhone}`}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${member.role === 'admin' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                                }`}>
                                                {member.role === 'admin' && <Shield size={10} />}
                                                {member.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-emerald-400">
                                            {member.handicap}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/dashboard/${slug}/members/${member.id}/edit`} className="p-2 text-zinc-600 hover:text-emerald-500 transition-colors">
                                                    <Edit size={18} />
                                                </Link>
                                                <form action={removeMemberFromLeague}>
                                                    <input type="hidden" name="memberId" value={member.id} />
                                                    <input type="hidden" name="leagueSlug" value={slug} />
                                                    <button className="p-2 text-zinc-600 hover:text-red-500 transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-3xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <UserPlus size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Invite Member</h3>
                        </div>

                        <InviteMemberForm organizationId={league.id} leagueSlug={slug} />
                    </div>
                </div>
            </div>
        </div>
    );
}
