import { auth } from "@/auth";
import { db } from "@/db";
import { subRequests, matchPlayers, matches, rounds, courses, user, organizations, seasons, subRequestNotifications } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { acceptSubRequest } from "@/actions/sub-request";
import { Calendar, MapPin, CheckCircle, ShieldAlert } from "lucide-react";
import Image from "next/image";

import Link from "next/link";
import { Plus } from "lucide-react";
import { getLeagueMember } from "@/lib/auth-utils";

export default async function SubRequestsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const session = await auth();
    const currentUserId = session?.user?.id;

    const league = await getLeagueMember(slug);

    const openRequests = await db
        .select({
            id: subRequests.id,
            note: subRequests.note,
            createdAt: subRequests.createdAt,
            requesterId: subRequests.requestedByUserId,
            requesterName: user.name,
            requesterImage: user.image,
            requesterFirstName: user.firstName,
            requesterLastName: user.lastName,
            date: rounds.date,
            courseName: courses.name,
            holesCount: rounds.holesCount,
        })
        .from(subRequests)
        .innerJoin(matchPlayers, eq(subRequests.matchPlayerId, matchPlayers.id))
        .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
        .innerJoin(rounds, eq(matches.roundId, rounds.id))
        .innerJoin(seasons, eq(rounds.seasonId, seasons.id))
        .leftJoin(courses, eq(rounds.courseId, courses.id))
        .innerJoin(user, eq(subRequests.requestedByUserId, user.id))
        .where(
            and(
                eq(subRequests.status, "open"),
                eq(seasons.organizationId, league.id)
            )
        )
        .orderBy(desc(subRequests.createdAt));

    // Get requests the current user is notified for
    let notifiedRequestIds = new Set<string>();
    if (currentUserId && openRequests.length > 0) {
        const notifications = await db
            .select({ subRequestId: subRequestNotifications.subRequestId })
            .from(subRequestNotifications)
            .where(
                and(
                    eq(subRequestNotifications.userId, currentUserId),
                    inArray(subRequestNotifications.subRequestId, openRequests.map(r => r.id))
                )
            );
        notifiedRequestIds = new Set(notifications.map(n => n.subRequestId));
    }

    return (
        <div className="w-full py-12 px-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Sub Requests</h1>
                    <p className="text-zinc-400">Roster openings available for claim.</p>
                </div>
                <Link
                    href={`/dashboard/${slug}/sub-requests/new`}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
                >
                    <Plus size={20} />
                    <span>Request Sub</span>
                </Link>
            </div>

            {openRequests.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-zinc-800 rounded-3xl text-zinc-600">
                    <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-emerald-500" />
                    <h3 className="text-lg font-bold text-zinc-400">All Filled!</h3>
                    <p>No one is looking for a sub right now.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {openRequests.map((req) => (
                        <div key={req.id} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden relative flex-shrink-0">
                                    {req.requesterImage ? (
                                        <Image
                                            src={req.requesterImage}
                                            alt=""
                                            fill
                                            sizes="48px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                                            {req.requesterFirstName?.[0] || "?"}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {req.requesterFirstName} {req.requesterLastName}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-emerald-500" />
                                            {req.date.toLocaleDateString()}
                                        </div>
                                        {req.courseName && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={14} className="text-emerald-500" />
                                                {req.courseName}
                                            </div>
                                        )}
                                    </div>
                                    {req.note && (
                                        <p className="text-sm text-zinc-500 mt-2 italic">&quot;{req.note}&quot;</p>
                                    )}
                                </div>
                            </div>

                            {notifiedRequestIds.has(req.id) ? (
                                <form action={acceptSubRequest} className="w-full md:w-auto">
                                    <input type="hidden" name="leagueSlug" value={slug} />
                                    <input type="hidden" name="requestId" value={req.id} />
                                    <button className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                        Accept Spot
                                    </button>
                                </form>
                            ) : req.requesterId === currentUserId ? (
                                <div className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm font-medium border border-zinc-700">
                                    Your Request
                                </div>
                            ) : (
                                <div className="px-4 py-2 bg-zinc-800/50 text-zinc-500 rounded-lg text-sm font-medium border border-zinc-800 flex items-center gap-2">
                                    <ShieldAlert size={14} />
                                    Targeted Request
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
