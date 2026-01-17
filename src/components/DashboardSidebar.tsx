"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutGrid,
    Calendar,
    Users,
    Flag,
    MapPin,
    Settings,
    LogOut,
    Trophy,
    UserCheck
} from "lucide-react";

interface DashboardSidebarProps {
    slug: string;
    leagueName: string;
}

export function DashboardSidebar({ slug, leagueName }: DashboardSidebarProps) {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: `/dashboard/${slug}`, icon: LayoutGrid, exact: true },
        { name: "Schedule", href: `/dashboard/${slug}/schedule`, icon: Calendar, exact: false },
        { name: "Sub Requests", href: `/dashboard/${slug}/sub-requests`, icon: UserCheck, exact: false },
        { name: "Leaderboard", href: `/dashboard/${slug}/leaderboard`, icon: Trophy, exact: false },
        { name: "Members", href: `/dashboard/${slug}/members`, icon: Users, exact: false },
        { name: "Teams", href: `/dashboard/${slug}/teams`, icon: Flag, exact: false },
        { name: "Courses", href: `/dashboard/${slug}/courses`, icon: MapPin, exact: false },
        { name: "Settings", href: `/dashboard/${slug}/settings`, icon: Settings, exact: false },
    ];

    const isActive = (href: string, exact: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    return (
        <aside className="w-64 flex-shrink-0 border-r border-zinc-900 bg-zinc-950 flex flex-col h-full">
            {/* League Header */}
            <div className="h-20 flex items-center px-6 border-b border-zinc-900">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-black shadow-lg shadow-emerald-500/20">
                        <Trophy size={20} className="fill-black" />
                    </div>
                    <div className="overflow-hidden">
                        <h1 className="font-bold text-sm truncate">{leagueName}</h1>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Admin Console</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                <div className="px-2 mb-4">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Main Menu</p>
                </div>
                {navItems.map((item) => {
                    const active = isActive(item.href, item.exact);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                                }`}
                        >
                            <item.icon size={18} className={active ? "text-emerald-500" : "text-zinc-500"} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer / User Profile stub */}
            <div className="p-4 border-t border-zinc-900">
                <Link href={`/dashboard/${slug}/profile`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all">
                    <UserCheck size={18} />
                    My Profile
                </Link>
            </div>
        </aside>
    );
}
