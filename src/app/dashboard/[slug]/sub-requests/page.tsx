// import { auth } from "@/auth"; // Not used currently
import { db } from "@/db";
import { subRequests, matchPlayers, matches, rounds, courses, user, organizations, seasons } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { acceptSubRequest } from "@/actions/sub-request";
import { Calendar, MapPin, CheckCircle } from "lucide-react";
import Image from "next/image";

export default async function SubRequestsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // Removed unused session

    const [league] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);

    if (!league) return <div className="p-8">League not found</div>;

    const openRequests = await db
        .select({
            id: subRequests.id,
            note: subRequests.note,
            createdAt: subRequests.createdAt,
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

    return (
        <div className="w-full py-12 px-8">
            <h1 className="text-3xl font-bold mb-2">Sub Requests</h1>
            <p className="text-zinc-400 mb-8">Roster openings available for claim.</p>

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
                                        <Image src={req.requesterImage} alt="" fill className="object-cover" />
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

                            <form action={acceptSubRequest} className="w-full md:w-auto">
                                <input type="hidden" name="leagueSlug" value={slug} />
                                <input type="hidden" name="requestId" value={req.id} />
                                <button className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                    Accept Spot
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
