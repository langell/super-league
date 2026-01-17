import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, user, verificationTokens } from "@/db/schema";
import { authConfig } from "./auth.config";
import Resend from "next-auth/providers/resend";

import logger from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        ...authConfig.providers,
        Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
            sendVerificationRequest: async ({ identifier: to, url, provider }) => {
                if (process.env.NODE_ENV === "development") {
                    logger.info({ to, url }, "✨ [DEV] Magic Link");
                }

                const res = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${provider.apiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: provider.from,
                        to,
                        subject: `Sign in to Leaguely`,
                        html: `
                        <div style="background-color: #f4f4f5; padding: 20px; font-family: sans-serif;">
                            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e4e4e7;">
                                <h1 style="color: #18181b; font-size: 24px; font-weight: bold; text-align: center; margin: 0 0 20px;">Welcome to Leaguely</h1>
                                <p style="color: #52525b; font-size: 16px; line-height: 24px; text-align: center; margin-bottom: 30px;">
                                    Click the button below to sign in to your account. This link will expire in 24 hours.
                                </p>
                                <div style="text-align: center; margin-bottom: 30px;">
                                    <a href="${url}" style="display: inline-block; background-color: #10b981; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                                        Sign In
                                    </a>
                                </div>
                                <p style="color: #71717a; font-size: 14px; margin-top: 40px; text-align: center;">
                                    If you didn't request this email, you can safely ignore it.
                                </p>
                            </div>
                        </div>
                        `,
                        text: `Sign in to Leaguely: ${url}`,
                    }),
                });

                if (!res.ok) {
                    throw new Error("Resend error: " + JSON.stringify(await res.json()));
                }
            }
        }),
    ],
    adapter: DrizzleAdapter(db, {
        usersTable: user,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
    }),
    session: { strategy: "jwt" },
    trustHost: true,
});
