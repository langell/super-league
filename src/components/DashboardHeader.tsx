import { Trophy } from "lucide-react";
import Link from "next/link";
import { UserNav } from "@/components/UserNav";

interface DashboardHeaderProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        firstName?: string | null;
        lastName?: string | null;
    };
    slug?: string;
}

export function DashboardHeader({ user, slug }: DashboardHeaderProps) {
    return (
        <nav className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
            <div className="w-full px-6 h-16 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Trophy className="text-emerald-500" size={24} />
                    <span className="font-bold text-xl tracking-tight text-white">Leaguely</span>
                </Link>
                <div className="flex items-center gap-4">
                    <UserNav user={user} slug={slug} />
                </div>
            </div>
        </nav>
    );
}
