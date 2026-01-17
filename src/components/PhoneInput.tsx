"use client";

import { useState } from "react";

interface PhoneInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    defaultValue?: string;
}

export function PhoneInput({ defaultValue = "", className, ...props }: PhoneInputProps) {
    const formatPhoneNumber = (input: string) => {
        const phoneNumber = input.replace(/[^\d]/g, "");
        const phoneNumberLength = phoneNumber.length;
        if (phoneNumberLength < 4) return phoneNumber;
        if (phoneNumberLength < 7) {
            return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
        }
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    };

    const [value, setValue] = useState(formatPhoneNumber(defaultValue));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setValue(formatted);
        if (props.onChange) {
            props.onChange(e);
        }
    };

    return (
        <input
            {...props}
            type="tel"
            value={value}
            onChange={handleChange}
            placeholder="(555) 123-4567"
            className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-colors ${className || ""}`}
        />
    );
}
