
import { signIn } from "@/auth";
import { LogIn } from "lucide-react";

export default function LoginPage() {
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Blur */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                        <LogIn size={24} />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">Welcome Back</h1>
                    <p className="text-zinc-500 mt-2">Sign in to your account</p>
                </div>

                <div className="space-y-4">
                    {/* Google */}
                    <form action={async () => {
                        "use server";
                        await signIn("google", { redirectTo: "/dashboard" });
                    }}>
                        <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Sign in with Google
                        </button>
                    </form>

                    {/* Facebook */}
                    <form action={async () => {
                        "use server";
                        await signIn("facebook", { redirectTo: "/dashboard" });
                    }}>
                        <button className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1877F2] text-white font-semibold rounded-xl hover:bg-[#166fe5] transition-all">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v2.225l-1.542.01c-1.344 0-1.789.67-1.789 1.986v3.038h4.437l-.768 3.667h-3.669v7.98C23.016 23.082 23.957 23.153 24 23.167v-24H0v24c0 .01.99-.074 9.101-.309z" />
                            </svg>
                            Sign in with Facebook
                        </button>
                    </form>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900/80 px-2 text-zinc-500">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email Magic Link */}
                    <form action={async (formData) => {
                        "use server";
                        await signIn("resend", formData, { redirectTo: "/dashboard" });
                    }} className="space-y-4">
                        <div>
                            <input
                                type="email"
                                name="email"
                                placeholder="name@example.com"
                                required
                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 text-white placeholder-zinc-600 transition-all"
                            />
                        </div>
                        <button className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                            Send Magic Link
                        </button>
                    </form>
                </div>
            </div>

            <div className="absolute bottom-6 text-center w-full text-zinc-600 text-sm">
                Protected by Leaguely Security.
            </div>
        </div>
    );
}
