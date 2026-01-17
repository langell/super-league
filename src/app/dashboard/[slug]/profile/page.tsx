import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogOut, Mail, Phone, Bell } from "lucide-react";
import Image from "next/image";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user?.id) return <div>Unauthorized</div>;

    const [userInfo] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

    if (!userInfo) return <div>User not found</div>;

    return (
        <div className="max-w-2xl mx-auto py-12 px-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">My Profile</h1>
                <p className="text-zinc-400">Manage your account settings.</p>
            </div>

            {/* Profile Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 mb-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden relative flex-shrink-0">
                        {userInfo.image ? (
                            <Image src={userInfo.image} alt="Profile" fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-2xl">
                                {userInfo.firstName?.[0] || userInfo.name?.[0] || "?"}
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{userInfo.firstName} {userInfo.lastName}</h2>
                        <p className="text-zinc-500 text-sm">Member since {new Date().getFullYear()}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                        <Mail className="text-zinc-500" size={20} />
                        <div>
                            <p className="text-xs uppercase font-bold text-zinc-500">Email Address</p>
                            <p className="text-zinc-300 font-medium">{userInfo.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                        <Phone className="text-zinc-500" size={20} />
                        <div>
                            <p className="text-xs uppercase font-bold text-zinc-500">Phone Number</p>
                            <p className="text-zinc-300 font-medium">{userInfo.phone || "Not set"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                        <Bell className="text-zinc-500" size={20} />
                        <div>
                            <p className="text-xs uppercase font-bold text-zinc-500">Notification Preference</p>
                            <p className="text-zinc-300 font-medium capitalize">{userInfo.notificationPreference || "Email"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Logout Action */}
            <form action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
            }}>
                <button className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl border border-red-500/20 transition-all">
                    <LogOut size={20} />
                    Sign Out
                </button>
            </form>
        </div>
    )
}
