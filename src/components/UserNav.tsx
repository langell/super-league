"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, User, Settings, ChevronDown } from "lucide-react";
import { signOutAction } from "@/actions/auth";

interface UserNavProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        firstName?: string | null;
        lastName?: string | null;
    };
}

export function UserNav({ user }: UserNavProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const displayName = user.firstName || user.name || "Golfer";
    const initials = (user.firstName?.[0] || "") + (user.lastName?.[0] || displayName?.[0] || "?");

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-800"
            >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold text-sm relative overflow-hidden">
                    {user.image ? (
                        <Image src={user.image} alt={displayName} fill className="object-cover" />
                    ) : (
                        <span>{initials}</span>
                    )}
                </div>
                <div className="hidden md:block text-left">
                    <p className="text-xs font-medium text-zinc-300 leading-none">{displayName}</p>
                    <p className="text-[10px] text-zinc-500 leading-none mt-1 truncate max-w-[120px]">
                        {user.email}
                    </p>
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1e1e1e] border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-zinc-800/50">
                        <p className="text-sm font-medium text-white">{displayName}</p>
                        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                    </div>

                    <div className="p-1">
                        {/* 
                            Note: Since we don't have a global dashboard profile page yet,
                            we can link to the first league profile if available, 
                            OR simply link to a general settings/profile placeholder.
                            For now, assuming context needs to be handled or we link to dashboard root or a standard page.
                        */}
                        {/* <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            <User size={16} />
                            Your Profile
                        </Link> */}
                        {/* 
                         Since we need a specific slug for /dashboard/[slug]/profile,
                         we might omit the link or require logic to find their "primary" league.
                         For now, let's keep it simple with Sign Out.
                        */}
                    </div>

                    <div className="p-1 border-t border-zinc-800/50">
                        <button
                            onClick={() => signOutAction()}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
