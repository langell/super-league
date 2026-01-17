"use client";

import { useState } from "react";
import { User } from "lucide-react";

interface ProfileFormProps {
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        ghinId: string | null;
        venmoHandle: string | null;
    };
    action: (userId: string, formData: FormData) => Promise<void>;
}

export function ProfileForm({ user, action }: ProfileFormProps) {
    const [isPending, setIsPending] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        try {
            await action(user.id, formData);
        } finally {
            setIsPending(false);
        }
    }

    return (
        <form action={handleSubmit} className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="firstName" className="text-xs font-bold text-zinc-500 uppercase">First Name</label>
                    <input
                        type="text"
                        name="firstName"
                        id="firstName"
                        defaultValue={user.firstName || ""}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="lastName" className="text-xs font-bold text-zinc-500 uppercase">Last Name</label>
                    <input
                        type="text"
                        name="lastName"
                        id="lastName"
                        defaultValue={user.lastName || ""}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-bold text-zinc-500 uppercase">Email Address</label>
                <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed">
                    {user.email}
                </div>
                <p className="text-xs text-zinc-600">Email cannot be changed directly.</p>
            </div>

            <div className="space-y-2">
                <label htmlFor="phone" className="text-xs font-bold text-zinc-500 uppercase">Phone Number</label>
                <input
                    type="tel"
                    name="phone"
                    id="phone"
                    placeholder="(555) 123-4567"
                    defaultValue={user.phone || ""}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label htmlFor="ghinId" className="text-xs font-bold text-zinc-500 uppercase">GHIN ID</label>
                    <input
                        type="text"
                        name="ghinId"
                        id="ghinId"
                        defaultValue={user.ghinId || ""}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="venmoHandle" className="text-xs font-bold text-zinc-500 uppercase">Venmo Handle</label>
                    <input
                        type="text"
                        name="venmoHandle"
                        id="venmoHandle"
                        placeholder="@username"
                        defaultValue={user.venmoHandle || ""}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isPending ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
