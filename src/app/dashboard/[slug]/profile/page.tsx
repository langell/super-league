import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogOut, Home } from "lucide-react";
import Link from "next/link";
import { updateUserProfile } from "@/actions/user";
import { ProfileForm } from "@/components/ProfileForm";

export default async function ProfilePage({ params }: { params: { slug: string } }) {
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const [userInfo] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

    if (!userInfo) return <div>User not found</div>;

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            {/* Google-Style Profile Card */}
            <div className="w-full max-w-2xl bg-[#1e1e1e] rounded-[28px] overflow-hidden shadow-2xl border border-zinc-800/50">

                <ProfileForm
                    user={{
                        id: userInfo.id,
                        firstName: userInfo.firstName,
                        lastName: userInfo.lastName,
                        email: userInfo.email,
                        phone: userInfo.phone,
                        image: userInfo.image,
                        notificationPreference: userInfo.notificationPreference,
                    }}
                    leagueSlug={params.slug}
                    action={updateUserProfile}
                />

                {/* Sign Out */}
                <div className="border-t border-zinc-800">
                    <form action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/login" });
                    }} className="w-full block">
                        <button className="w-full flex items-center gap-4 px-8 py-5 hover:bg-zinc-800/50 transition-colors text-left group">
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
