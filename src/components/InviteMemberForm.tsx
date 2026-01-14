"use client";

import { useActionState, useEffect, useRef } from "react";
import { addMemberToLeague } from "@/app/actions";
import { UserPlus } from "lucide-react";

const initialState = {
    message: "",
    errors: {} as Record<string, string[]>,
};

export function InviteMemberForm({ organizationId, leagueSlug }: { organizationId: string, leagueSlug: string }) {
    const [state, formAction] = useActionState(addMemberToLeague, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.message === "success") {
            formRef.current?.reset();
        }
    }, [state.message]);

    return (
        <form ref={formRef} action={formAction} className="space-y-4">
            <input type="hidden" name="organizationId" value={organizationId} />
            <input type="hidden" name="leagueSlug" value={leagueSlug} />

            {state.message && state.message !== "success" && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm font-bold">
                    {state.message}
                </div>
            )}

            {state.message === "success" && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-sm font-bold">
                    Member added successfully!
                </div>
            )}

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Full Name</label>
                <input
                    name="name"
                    type="text"
                    placeholder="Tiger Woods"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Email Address</label>
                <input
                    name="email"
                    type="email"
                    placeholder="player@example.com"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Phone Number</label>
                <input
                    name="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    // Simple regex pattern for US phone numbers validation (optional on client side, but good for UX)
                    pattern="^(\+1)?[ -]?\(?(\d{3})\)?[ -]?(\d{3})[ -]?(\d{4})$"
                    title="Please enter a valid phone number, e.g. (555) 123-4567"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Notification Preference</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="notificationPreference" value="sms" defaultChecked className="accent-emerald-500 w-4 h-4" />
                        <span className="text-sm">SMS (Default)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="notificationPreference" value="email" className="accent-emerald-500 w-4 h-4" />
                        <span className="text-sm">Email</span>
                    </label>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Role</label>
                <select
                    name="role"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                >
                    <option value="player">Player</option>
                    <option value="sub">Substitute</option>
                    <option value="admin">Administrator</option>
                </select>
            </div>

            <button
                type="submit"
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex justify-center items-center gap-2"
            >
                <UserPlus size={20} />
                Add to League
            </button>
        </form>
    );
}
