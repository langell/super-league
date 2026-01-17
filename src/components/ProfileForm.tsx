"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import Link from "next/link";
import { PhoneInput } from "@/components/PhoneInput";

interface ProfileFormProps {
    user: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        phone: string | null;
        image: string | null;
        notificationPreference: string | null;
    };
    leagueSlug?: string;
    action: (userId: string, formData: FormData) => Promise<void>;
}

export function ProfileForm({ user, leagueSlug, action }: ProfileFormProps) {
    const [isPending, setIsPending] = useState(false);
    const [preview, setPreview] = useState<string | null>(user.image);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const displayName = user.firstName || "Golfer";
    const initials = (user.firstName?.[0] || "") + (user.lastName?.[0] || displayName?.[0] || "?");

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Limit to 2MB
            if (file.size > 2 * 1024 * 1024) {
                alert("File size must be less than 2MB");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        try {
            // If we have a preview that is distinct from original (and is base64 data url), append it
            if (preview && preview !== user.image && preview.startsWith("data:")) {
                formData.set("image", preview);
            }
            await action(user.id, formData);
        } finally {
            setIsPending(false);
        }
    }

    const cancelHref = leagueSlug ? `/dashboard/${leagueSlug}` : "/dashboard";

    return (
        <form action={handleSubmit}>
            {leagueSlug && <input type="hidden" name="leagueSlug" value={leagueSlug} />}
            {/* Header (Email) */}
            <div className="pt-8 pb-1 text-center text-sm font-medium text-zinc-400">
                {user.email}
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center py-6">
                <div onClick={handleImageClick} className="relative group cursor-pointer mb-4">
                    <div className="w-28 h-28 rounded-full bg-zinc-700 border-[3px] border-[#1e1e1e] ring-2 ring-zinc-700/50 overflow-hidden relative flex items-center justify-center text-3xl font-bold text-zinc-300">
                        {preview ? (
                            <Image src={preview} alt="Profile" fill className="object-cover" />
                        ) : (
                            <span>{initials}</span>
                        )}
                    </div>

                    {/* Camera Icon Badge */}
                    <div className="absolute bottom-1 right-1 bg-zinc-800 p-2 rounded-full border border-[#1e1e1e] text-white shadow-lg group-hover:bg-zinc-700 transition-colors">
                        <Camera size={16} />
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                <h1 className="text-[22px] font-normal text-white">Hi, {displayName}!</h1>
            </div>

            <div className="px-6 py-4 space-y-6 border-t border-zinc-800">
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
                    <PhoneInput
                        name="phone"
                        id="phone"
                        defaultValue={user.phone || ""}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Notification Preference</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="notificationPreference"
                                value="sms"
                                defaultChecked={user.notificationPreference === 'sms' || !user.notificationPreference}
                                className="accent-emerald-500 w-4 h-4"
                            />
                            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">SMS</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="notificationPreference"
                                value="email"
                                defaultChecked={user.notificationPreference === 'email'}
                                className="accent-emerald-500 w-4 h-4"
                            />
                            <span className="text-sm text-zinc-400 group-hover:text-white transition-colors">Email</span>
                        </label>
                    </div>
                </div>

                <div className="pt-4 flex justify-between gap-3">
                    <Link
                        href={cancelHref}
                        className="flex-1 text-center py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors border border-zinc-700"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </form>
    );
}
