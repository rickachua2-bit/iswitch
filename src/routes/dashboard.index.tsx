import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plane, Hotel, FileCheck, Shield, Map, Car, Search, ListChecks, Wallet, ArrowRight, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/")({
  component: OverviewPage,
});

const VERTICALS = [
  { id: "flights", label: "Flights", icon: Plane, to: "/flights" as const },
  { id: "stays", label: "Hotels", icon: Hotel, to: "/stays" as const },
  { id: "visas", label: "Visas", icon: FileCheck, to: "/visas" as const },
  { id: "insurance", label: "Insurance", icon: Shield, to: "/insurance" as const },
  { id: "tours", label: "Tours", icon: Map, to: "/tours" as const },
  { id: "pickups", label: "Transfers", icon: Car, to: "/pickups" as const },
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search, book, and manage all your travel without leaving this page.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard icon={ListChecks} label="Travel bookings" value={counts.unified} to="/dashboard/bookings" />
        <StatCard icon={GraduationCap} label="Consultations" value={counts.consultations} to="/dashboard/bookings" />
        <StatCard icon={Wallet} label="Wallet" value="—" to="/dashboard/wallet" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold">Start a new booking</h2>
          <Link to="/dashboard/book" className="text-xs font-bold text-primary hover:underline">All search tools →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {VERTICALS.map((v) => (
            <Link key={v.id} to={v.to} className="group rounded-2xl border border-border bg-card p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <v.icon className="h-5 w-5" />
              </div>
              <div className="mt-2 text-xs font-extrabold text-foreground">{v.label}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link to="/dashboard/book" className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-accent/10 p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
          <Search className="h-6 w-6 text-primary" />
          <div className="mt-3 font-display text-base font-extrabold">Search & book in dashboard</div>
          <div className="mt-1 text-xs text-muted-foreground">All six verticals in one unified search.</div>
          <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground" />
        </Link>
        <Link to="/dashboard/bookings" className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
          <ListChecks className="h-6 w-6 text-primary" />
          <div className="mt-3 font-display text-base font-extrabold">View all bookings</div>
          <div className="mt-1 text-xs text-muted-foreground">Status, receipts, and trip details.</div>
          <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, to }: { icon: typeof Plane; label: string; value: number | string; to: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}
