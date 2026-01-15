import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createLeague } from "@/app/actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewLeaguePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/api/auth/signin");
    }

    return (
        <div className="min-h-screen bg-background text-white py-20 px-6">
            <div className="max-w-xl mx-auto">
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8">
                    <ArrowLeft size={20} />
                    Back to Dashboard
                </Link>
                <h1 className="text-4xl font-bold mb-4">Create Your League</h1>
                <form action={createLeague} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-zinc-300">League Name</label>
                        <input type="text" name="name" id="name" required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="slug" className="text-sm font-medium text-zinc-300">URL Slug</label>
                        <input type="text" name="slug" id="slug" required className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-emerald-500 text-black font-bold rounded-2xl">Launch League</button>
                </form>
            </div>
        </div>
    );
}
