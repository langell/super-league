import { getLeagueAdmin } from "@/lib/auth-utils";
import { updateLeagueSettings } from "@/app/actions";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default async function LeagueSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const league = await getLeagueAdmin(slug);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white py-20 px-6">
            <div className="max-w-xl mx-auto">
                <Link href={`/dashboard/${slug}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to Console
                </Link>
                <h1 className="text-4xl font-bold mb-4">League Settings</h1>
                <form action={updateLeagueSettings} className="space-y-8">
                    <input type="hidden" name="leagueId" value={league.id} />
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-zinc-300">League Name</label>
                        <input type="text" name="name" id="name" required defaultValue={league.name} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="slug" className="text-sm font-medium text-zinc-300">URL Slug</label>
                        <input type="text" name="slug" id="slug" required defaultValue={league.slug} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="handicapPercentage" className="text-sm font-medium text-zinc-300">Handicap %</label>
                            <select name="handicapPercentage" id="handicapPercentage" defaultValue={league.handicapPercentage || "1.00"} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none">
                                <option value="1.00">100%</option>
                                <option value="0.95">95%</option>
                                <option value="0.90">90%</option>
                                <option value="0.85">85%</option>
                                <option value="0.80">80%</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="minScoresToCalculate" className="text-sm font-medium text-zinc-300">Min Scores to Calc</label>
                            <input
                                type="number"
                                name="minScoresToCalculate"
                                id="minScoresToCalculate"
                                required
                                min={1}
                                max={20}
                                defaultValue={league.minScoresToCalculate || 3}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none"
                            />
                        </div>
                    </div>
                    <button type="submit" className="flex items-center justify-center gap-3 w-full py-4 bg-emerald-500 text-black font-bold rounded-2xl">
                        <Save size={20} />
                        Save Settings
                    </button>
                </form>
            </div>
        </div>
    );
}
