import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogOut, Camera, UserPlus, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function ProfilePage({ params }: { params: { slug: string } }) {
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const [userInfo] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

    if (!userInfo) return <div>User not found</div>;

    const displayName = userInfo.firstName || userInfo.name || "Golfer";
    const initials = (userInfo.firstName?.[0] || "") + (userInfo.lastName?.[0] || displayName?.[0] || "?");

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            {/* Google-Style Profile Card */}
            <div className="w-full max-w-[400px] bg-[#1e1e1e] rounded-[28px] overflow-hidden shadow-2xl border border-zinc-800/50">

                {/* Header (Email) */}
                <div className="pt-8 pb-1 text-center text-sm font-medium text-zinc-400">
                    {userInfo.email}
                </div>

                {/* Avatar Section */}
                <div className="flex flex-col items-center py-6">
                    <div className="relative group cursor-pointer mb-4">
                        <div className="w-28 h-28 rounded-full bg-zinc-700 border-[3px] border-[#1e1e1e] ring-2 ring-zinc-700/50 overflow-hidden relative flex items-center justify-center text-3xl font-bold text-zinc-300">
                            {userInfo.image ? (
                                <Image src={userInfo.image} alt="Profile" fill className="object-cover" />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                        {/* Camera Icon Badge */}
                        <div className="absolute bottom-1 right-1 bg-zinc-800 p-2 rounded-full border border-[#1e1e1e] text-white shadow-lg group-hover:bg-zinc-700 transition-colors">
                            <Camera size={16} />
                        </div>
                    </div>

                    <h1 className="text-[22px] font-normal text-white">Hi, {displayName}!</h1>
                </div>

                {/* Manage Button */}
                <div className="px-10 pb-8 flex justify-center">
                    <Link
                        href={`/dashboard/${params.slug}/settings`}
                        className="inline-block px-6 py-2.5 rounded-full border border-zinc-600/80 text-zinc-300 font-medium text-sm hover:bg-zinc-800 hover:border-zinc-500 hover:text-white transition-all"
                    >
                        Manage your Leaguely Account
                    </Link>
                </div>

                {/* List Actions */}
                <div className="border-t border-zinc-800">
                    <button className="w-full flex items-center gap-4 px-8 py-5 hover:bg-zinc-800/50 transition-colors text-left group">
                        <div className="w-6 text-zinc-400 group-hover:text-white transition-colors flex justify-center">
                            <UserPlus size={20} />
                        </div>
                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Add another account</span>
                    </button>

                    <form action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/login" });
                    }} className="w-full block">
                        <button className="w-full flex items-center gap-4 px-8 py-5 hover:bg-zinc-800/50 transition-colors text-left group border-t border-zinc-800/50">
                            <div className="w-6 text-zinc-400 group-hover:text-white transition-colors flex justify-center">
                                <LogOut size={20} />
                            </div>
                            <span className="text-sm font-medium text-zinc-300 group-hover:text-white">Sign out</span>
                        </button>
                    </form>
                </div>

                {/* Footer Links (Visual Only) */}
                <div className="bg-zinc-900/30 py-4 text-center border-t border-zinc-800">
                    <div className="text-[11px] text-zinc-600 font-medium flex gap-4 justify-center">
                        <span className="cursor-pointer hover:text-zinc-400">Privacy Policy</span>
                        <span>•</span>
                        <span className="cursor-pointer hover:text-zinc-400">Terms of Service</span>
                    </div>
                </div>
            </div>

            {/* Back to Home Link */}
            <div className="mt-8">
                <Link href={`/dashboard/${params.slug}`} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors px-4 py-2 hover:bg-zinc-900/50 rounded-lg">
                    <Home size={16} />
                    <span className="text-sm font-medium">Back to Home</span>
                </Link>
            </div>
        </div>
    )
}
