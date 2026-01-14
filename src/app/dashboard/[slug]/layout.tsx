import { getLeagueAdmin } from "@/lib/auth-utils";
import { DashboardSidebar } from "@/components/DashboardSidebar";

export default async function DashboardLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { slug: string };
}) {
    const { slug } = await params;

    // Ensure user has access and get league details for the sidebar title
    const league = await getLeagueAdmin(slug);

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
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
    );
}
