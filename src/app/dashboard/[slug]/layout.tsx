import { getLeagueAdmin } from "@/lib/auth-utils";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { auth } from "@/auth";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    // Get session/user for header
    const session = await auth();
    // getLeagueAdmin likely checks session internally or assumes valid session, 
    // but we need the user object for the header.
    // Ideally getLeagueAdmin could return the user too, but let's fetch it explicitly or default to session.user logic.

    // Re-fetching user to be consistent with main dashboard logic (getting latest image/name)
    // Note: getLeagueAdmin will throw if not authed/authorized, so we are safe to proceed if it passes.
    const league = await getLeagueAdmin(slug);

    let userInfo = session?.user;
    if (session?.user?.id) {
        const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);
        if (dbUser) {
            userInfo = dbUser;
        }
    }

    // Default to a safe fallback object if somehow session is missing but getLeagueAdmin passed (unlikely)
    // or just rely on optional chaining in the component.
    const headerUser = userInfo || {};

    return (
        <div className="flex flex-col h-screen bg-background text-white font-sans overflow-hidden">
            <DashboardHeader user={headerUser} slug={slug} />

            <div className="flex flex-1 overflow-hidden">
                <DashboardSidebar slug={slug} leagueName={league.name} />

                <main className="flex-1 overflow-y-auto">
                    {/* 
                       We remove the fixed width container here to allow pages to control their own width 
                       or we can enforce a max-width here. 
                       Let's give it a reasonable container but allow full width backgrounds.
                    */}
                    <div className="min-h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
