import { auth, signIn, signOut } from "@/auth";
import Link from "next/link";
import { Trophy, Users, Calendar, MapPin, Activity, LayoutDashboard, Database, Shield, LogIn, LogOut } from "lucide-react";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Hero Section */}
      <section className="relative py-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              <Activity size={14} />
              API is Live & Running
            </div>

            {session ? (
              <div className="flex items-center gap-4">
                <span className="text-zinc-400 text-sm">Signed in as <span className="text-white font-medium">{session.user?.email}</span></span>
                <form action={async () => { "use server"; await signOut(); }}>
                  <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-sm transition-all">
                    <LogOut size={14} /> Sign Out
                  </button>
                </form>
              </div>
            ) : (
              <form action={async () => { "use server"; await signIn(); }}>
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg text-sm transition-all">
                  <LogIn size={14} /> Sign In
                </button>
              </form>
            )}
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            Golf League API <br />
            <span className="text-emerald-500">Engineered for Match Play.</span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
            A robust, multitenant backend architecture for managing golf leagues,
            automated WHS handicapping, and hole-by-hole match play orchestration.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/api/leagues"
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              Explore API Reference
            </Link>
            <button className="px-8 py-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-semibold rounded-xl transition-all">
              View Schema Design
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-zinc-950/50 border-y border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="text-emerald-500" />}
              title="Multitenant Architecture"
              description="Isolate leagues, players, and data with built-in multitenancy for scalable league platforms."
            />
            <FeatureCard
              icon={<Activity className="text-emerald-500" />}
              title="Automated Handicapping"
              description="Integrated WHS-compliant index calculation based on hole-by-hole gross scores and course ratings."
            />
            <FeatureCard
              icon={<Trophy className="text-emerald-500" />}
              title="Match Play Engine"
              description="Dynamic stroke distribution and real-time net-score calculations for match play pairings."
            />
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-16">Powered by a Modern Stack</h2>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex flex-col items-center gap-2">
              <LayoutDashboard size={40} />
              <span className="font-medium">Next.js 15</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Database size={40} />
              <span className="font-medium">Drizzle ORM</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Users size={40} />
              <span className="font-medium">PostgreSQL</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Calendar size={40} />
              <span className="font-medium">TypeScript</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-900 text-center text-zinc-500 text-sm">
        &copy; 2026 Golf League API. Developed with focus on performance and precision.
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition-all group">
      <div className="mb-4 p-3 bg-emerald-500/10 rounded-lg w-fit group-hover:bg-emerald-500/20 transition-all">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}
