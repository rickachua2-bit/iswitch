import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plane, Hotel, FileCheck, Key, Map, Car, Search, ListChecks, Wallet, ArrowRight, GraduationCap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/")({
  component: OverviewPage,
});

const VERTICALS = [
  { id: "flights",  label: "Flights",   icon: Plane,     to: "/flights"   as const, tint: "from-sky-500 to-blue-600" },
  { id: "stays",    label: "Hotels",    icon: Hotel,     to: "/stays"     as const, tint: "from-fuchsia-500 to-purple-600" },
  { id: "visas",    label: "Visas",     icon: FileCheck, to: "/visas"     as const, tint: "from-emerald-500 to-teal-600" },
  { id: "car_rentals", label: "Car Rentals", icon: Key, to: "/car-rentals" as const, tint: "from-amber-500 to-orange-600" },
  { id: "tours",    label: "Tours",     icon: Map,       to: "/tours"     as const, tint: "from-rose-500 to-pink-600" },
  { id: "pickups",  label: "Airport Transfers", icon: Car, to: "/pickups" as const, tint: "from-indigo-500 to-violet-600" },
];

function OverviewPage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ unified: 0, consultations: 0 });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [u, c] = await Promise.all([
        supabase.from("bookings_unified").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("consultation_bookings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setCounts({ unified: u.count ?? 0, consultations: c.count ?? 0 });
    })();
  }, [user]);

  const name = user?.email?.split("@")[0] ?? "traveler";

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-3xl border-2 border-primary/20 p-7 text-primary-foreground shadow-xl shadow-primary/20 md:p-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-primary-glow/40 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-accent-foreground shadow">
            <Sparkles className="h-3 w-3" /> Welcome back
          </div>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Hey {name} 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed opacity-90 md:text-base">
            Search flights, hotels, visas, car rentals, tours and airport transfers — and manage every booking from this dashboard. No tabs, no friction.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/dashboard/book" className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-extrabold text-accent-foreground shadow-lg shadow-accent/30 transition hover:scale-[1.03]">
              <Search className="h-4 w-4" /> Start a booking
            </Link>
            <Link to="/dashboard/bookings" className="inline-flex items-center gap-1.5 rounded-xl border-2 border-primary-foreground/30 bg-primary-foreground/10 px-4 py-2.5 text-sm font-extrabold backdrop-blur transition hover:bg-primary-foreground/20">
              <ListChecks className="h-4 w-4" /> My bookings
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={ListChecks} label="Travel bookings" value={counts.unified} to="/dashboard/bookings"
                  gradient="from-primary to-primary-glow" />
        <StatCard icon={GraduationCap} label="Consultations" value={counts.consultations} to="/dashboard/bookings"
                  gradient="from-fuchsia-500 to-purple-600" />
        <StatCard icon={Wallet} label="Wallet balance" value="$0.00" to="/dashboard/wallet"
                  gradient="from-amber-400 to-orange-500" foreground="text-amber-950" />
      </div>

      {/* Verticals */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold text-foreground">Start a new booking</h2>
            <p className="text-xs text-muted-foreground">Pick a vertical to launch the search.</p>
          </div>
          <Link to="/dashboard/book" className="text-xs font-extrabold text-primary hover:underline">All search tools →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {VERTICALS.map((v) => (
            <Link key={v.id} to={v.to}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-center shadow-card transition hover:-translate-y-1 hover:shadow-xl">
              <div className={`absolute inset-0 -z-0 bg-gradient-to-br ${v.tint} opacity-0 transition-opacity group-hover:opacity-100`} />
              <div className={`relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${v.tint} text-white shadow-lg`}>
                <v.icon className="h-6 w-6" />
              </div>
              <div className="relative mt-3 text-sm font-extrabold text-foreground transition-colors group-hover:text-white">
                {v.label}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link to="/dashboard/book"
              className="group relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl transition group-hover:bg-primary/20" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-md" style={{ background: "var(--gradient-primary)" }}>
              <Search className="h-6 w-6" />
            </div>
            <div className="mt-4 font-display text-lg font-extrabold text-foreground">Search & book in dashboard</div>
            <p className="mt-1 text-sm text-muted-foreground">All six verticals in one unified search.</p>
            <ArrowRight className="mt-3 h-4 w-4 text-primary transition group-hover:translate-x-1" />
          </div>
        </Link>
        <Link to="/dashboard/bookings"
              className="group relative overflow-hidden rounded-3xl border-2 border-accent/30 bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/20 blur-2xl transition group-hover:bg-accent/40" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-md">
              <ListChecks className="h-6 w-6" />
            </div>
            <div className="mt-4 font-display text-lg font-extrabold text-foreground">View all bookings</div>
            <p className="mt-1 text-sm text-muted-foreground">Status, receipts, and trip details.</p>
            <ArrowRight className="mt-3 h-4 w-4 text-primary transition group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, to, gradient, foreground = "text-white" }:
  { icon: typeof Plane; label: string; value: number | string; to: string; gradient: string; foreground?: string }) {
  return (
    <Link to={to}
          className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 shadow-lg ${foreground} transition hover:-translate-y-1 hover:shadow-xl`}>
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <Icon className="h-6 w-6" />
        <ArrowRight className="h-4 w-4 opacity-70 transition group-hover:translate-x-1" />
      </div>
      <div className="relative mt-4 text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="relative text-xs font-bold uppercase tracking-wider opacity-90">{label}</div>
    </Link>
  );
}
