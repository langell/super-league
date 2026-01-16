import { getLeagueAdmin } from "@/lib/auth-utils";
import { db } from "@/db";
import { leagueMembers, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { updateMember, removeMemberFromLeague } from "@/actions/member";
import { notFound } from "next/navigation";

const ICON_SIZE_SMALL = 16;
const ICON_SIZE_MEDIUM = 20;
const PAGE_PADDING_X = 6;
const PAGE_PADDING_Y = 12;
const SECTION_GAP = 8;
const FORM_GAP = 6;
const COL_GAP = 4;

export default async function EditMemberPage({ params }: { params: Promise<{ slug: string; memberId: string }> }) {
    const { slug, memberId } = await params;
    await getLeagueAdmin(slug);



    const [member] = await db
        .select({
            id: leagueMembers.id,
            role: leagueMembers.role,
            handicap: leagueMembers.handicap,
            userId: leagueMembers.userId,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            notificationPreference: user.notificationPreference,
            name: user.name, // Fallback
        })
        .from(leagueMembers)
        .innerJoin(user, eq(leagueMembers.userId, user.id))
        .where(eq(leagueMembers.id, memberId))
        .limit(1);

    if (!member) {
        notFound();
    }

    return (
        <div className={`min-h-screen bg-background text-white py-${PAGE_PADDING_Y} px-${PAGE_PADDING_X}`}>
            <div className="max-w-2xl mx-auto">
                <Link href={`/dashboard/${slug}/members`} className={`inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-${SECTION_GAP}`}>
                    <ArrowLeft size={ICON_SIZE_MEDIUM} />
                    Back to Members
                </Link>

                <div className={`mb-${SECTION_GAP}`}>
                    <h1 className="text-4xl font-bold mb-2">Edit Member</h1>
                    <p className="text-zinc-400">Update details for {member.firstName} {member.lastName}.</p>
                </div>

                <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden p-8 space-y-${SECTION_GAP}`}>
                    <form action={updateMember} className={`space-y-${FORM_GAP}`}>
                        <input type="hidden" name="leagueSlug" value={slug} />
                        <input type="hidden" name="memberId" value={memberId} />
                        <input type="hidden" name="userId" value={member.userId} />

                        <div className={`grid grid-cols-2 gap-${COL_GAP}`}>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">First Name</label>
                                <input
                                    name="firstName"
                                    type="text"
                                    defaultValue={member.firstName || ""}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Last Name</label>
                                <input
                                    name="lastName"
                                    type="text"
                                    defaultValue={member.lastName || ""}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Email (Cannot be changed)</label>
                            <input
                                type="email"
                                value={member.email}
                                disabled
                                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Phone Number</label>
                            <input
                                name="phone"
                                type="tel"
                                defaultValue={member.phone || ""}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Notification Preference</label>
                            <div className={`flex gap-${COL_GAP}`}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="notificationPreference" value="sms" defaultChecked={member.notificationPreference === 'sms'} className="accent-emerald-500 w-4 h-4" />
                                    <span className="text-sm">SMS</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="notificationPreference" value="email" defaultChecked={member.notificationPreference === 'email'} className="accent-emerald-500 w-4 h-4" />
                                    <span className="text-sm">Email</span>
                                </label>
                            </div>
                        </div>

                        <div className={`grid grid-cols-2 gap-${COL_GAP}`}>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Role</label>
                                <select
                                    name="role"
                                    defaultValue={member.role}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                >
                                    <option value="player">Player</option>
                                    <option value="sub">Substitute</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Handicap</label>
                                <input
                                    name="handicap"
                                    type="number"
                                    step="0.1"
                                    defaultValue={member.handicap?.toString() || "0.0"}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        </div>

                        <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex justify-center gap-2 items-center">
                            <Save size={ICON_SIZE_MEDIUM} />
                            Save Changes
                        </button>
                    </form>

                    <div className="pt-8 border-t border-zinc-800">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-red-500 font-bold mb-1">Danger Zone</h3>
                                <p className="text-xs text-zinc-500">Remove this member from the league.</p>
                            </div>
                            <form action={removeMemberFromLeague}>
                                <input type="hidden" name="memberId" value={member.id} />
                                <input type="hidden" name="leagueSlug" value={slug} />
                                <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold transition-colors flex items-center gap-2">
                                    <Trash2 size={ICON_SIZE_SMALL} />
                                    Remove Member
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
