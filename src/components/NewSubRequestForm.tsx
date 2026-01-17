"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, CheckCircle2, Circle, ArrowLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface MatchOption {
    matchId: string;
    date: Date;
    courseName: string | null;
}

interface SubOption {
    userId: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
}

interface NewSubRequestFormProps {
    matches: MatchOption[];
    subs: SubOption[];
    leagueSlug: string;
    action: (formData: FormData) => Promise<void>;
}

export function NewSubRequestForm({ matches, subs, leagueSlug, action }: NewSubRequestFormProps) {
    const [selectedMatchId, setSelectedMatchId] = useState<string>(matches[0]?.matchId || "");
    const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [isPending, setIsPending] = useState(false);
    const router = useRouter();

    const handleToggleSub = (userId: string) => {
        const next = new Set(selectedSubIds);
        if (next.has(userId)) {
            next.delete(userId);
        } else {
            next.add(userId);
        }
        setSelectedSubIds(next);
    };

    const handleSelectAll = () => {
        if (selectedSubIds.size === filteredSubs.length) {
            setSelectedSubIds(new Set());
        } else {
            setSelectedSubIds(new Set(filteredSubs.map(s => s.userId)));
        }
    };

    const filteredSubs = subs.filter(sub => {
        const name = (sub.name || `${sub.firstName} ${sub.lastName}`).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    async function handleSubmit(formData: FormData) {
        if (!selectedMatchId) return alert("Please select a match");
        if (selectedSubIds.size === 0) return alert("Please select at least one sub");

        setIsPending(true);
        try {
            // Append selected sub IDs manually since they aren't in inputs
            selectedSubIds.forEach(id => formData.append("subIds", id));
            await action(formData);
            router.push(`/dashboard/${leagueSlug}/sub-requests`);
        } catch (error) {
            console.error(error);
            alert("Failed to create request");
        } finally {
            setIsPending(false);
        }
    }

    if (matches.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400 mb-6">You have no upcoming matches scheduled.</p>
                <Link href={`/dashboard/${leagueSlug}/sub-requests`} className="text-emerald-500 hover:underline">
                    Go Back
                </Link>
            </div>
        );
    }

    return (
        <form action={handleSubmit} className="space-y-8">
            <input type="hidden" name="leagueSlug" value={leagueSlug} />

            {/* Step 1: Select Match */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-500 uppercase">1. Select Match</label>
                </div>
                <div className="grid gap-3">
                    {matches.map((match) => (
                        <label
                            key={match.matchId}
                            className={`relative flex items-center p-4 rounded-xl border cursor-pointer transition-all ${selectedMatchId === match.matchId
                                    ? "bg-emerald-500/10 border-emerald-500"
                                    : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                                }`}
                        >
                            <input
                                type="radio"
                                name="matchId"
                                value={match.matchId}
                                checked={selectedMatchId === match.matchId}
                                onChange={(e) => setSelectedMatchId(e.target.value)}
                                className="absolute opacity-0 w-full h-full cursor-pointer"
                            />
                            <div className={`w-5 h-5 rounded-full border mr-4 flex items-center justify-center ${selectedMatchId === match.matchId ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"
                                }`}>
                                {selectedMatchId === match.matchId && <CheckCircle2 size={16} className="text-black" />}
                            </div>
                            <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                    <Calendar size={16} className="text-emerald-500" />
                                    {match.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </div>
                                <div className="text-sm text-zinc-400 mt-1">{match.courseName}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Step 2: Select Subs */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-zinc-500 uppercase">2. Select Subs to Notify</label>
                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-emerald-500 hover:text-emerald-400"
                    >
                        {selectedSubIds.size === filteredSubs.length ? "Deselect All" : "Select All"}
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search subs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                    {filteredSubs.map((sub) => {
                        const isSelected = selectedSubIds.has(sub.userId);
                        return (
                            <div
                                key={sub.userId}
                                onClick={() => handleToggleSub(sub.userId)}
                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                        ? "bg-emerald-500/10 border-emerald-500"
                                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                                    }`}
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border ${isSelected ? "border-emerald-500" : "border-zinc-700"}`}>
                                    {sub.image ? (
                                        <Image src={sub.image} alt="" width={40} height={40} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                                            {(sub.firstName?.[0] || sub.name?.[0] || "?")}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white truncate">
                                        {sub.firstName} {sub.lastName}
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">{sub.name || "Sub"}</div>
                                </div>
                                {isSelected ? (
                                    <CheckCircle2 size={20} className="text-emerald-500" />
                                ) : (
                                    <Circle size={20} className="text-zinc-700" />
                                )}
                            </div>
                        );
                    })}
                    {filteredSubs.length === 0 && (
                        <div className="col-span-full text-center py-8 text-zinc-500">
                            No subs found.
                        </div>
                    )}
                </div>
                <div className="text-xs text-zinc-500 text-right">
                    Selected: {selectedSubIds.size}
                </div>
            </div>

            {/* Step 3: Note */}
            <div className="space-y-2">
                <label htmlFor="note" className="text-sm font-bold text-zinc-500 uppercase">3. Add a Note (Optional)</label>
                <textarea
                    name="note"
                    id="note"
                    rows={3}
                    placeholder="e.g. Can't make it this week, work conflict."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors resize-none"
                />
            </div>

            {/* Footer Actions */}
            <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <Link
                    href={`/dashboard/${leagueSlug}/sub-requests`}
                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl border border-zinc-700 transition-colors flex justify-center items-center"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={isPending || !selectedMatchId || selectedSubIds.size === 0}
                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl shadow-xl shadow-emerald-500/10 transition-all flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? "Sending..." : "Send Request"}
                </button>
            </div>
        </form>
    );
}
