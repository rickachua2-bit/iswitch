import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Receipt,
  Wallet,
  Calendar,
  Activity,
  TrendingUp,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Overview — Admin" }] }),
  component: AdminOverview,
});

type Stat = { label: string; value: string | number; icon: typeof Users; tone: string; to: string; sub?: string };

function AdminOverview() {
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [pendingApps, setPendingApps] = useState<number>(0);

  useEffect(() => {
    void (async () => {
      const [usersRes, agentsRes, bookingsRes, walletRes, consultRes, recentRes, providersRes] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("agent_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("bookings_unified").select("amount, status", { count: "exact" }),
        supabase.from("wallet_balances").select("balance, currency"),
        supabase.from("consultation_bookings").select("id", { count: "exact", head: true }),
        supabase.from("bookings_unified").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.from("providers").select("enabled, total_errors, total_calls"),
      ]);

      const totalRev = (bookingsRes.data ?? []).filter((b: any) => b.status === "confirmed").reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
      const wallets = (walletRes.data ?? []).reduce((s: number, w: any) => s + Number(w.balance || 0), 0);
      const providers = providersRes.data ?? [];
      const errorRate = providers.reduce((s: number, p: any) => s + Number(p.total_errors || 0), 0);

      setStats([
        { label: "Registered users", value: usersRes.count ?? 0, icon: Users, tone: "from-primary to-primary-glow", to: "/admin/users" },
        { label: "Agent applications", value: agentsRes.count ?? 0, sub: "pending review", icon: Briefcase, tone: "from-amber-500 to-orange-600", to: "/admin/agents" },
        { label: "Total bookings", value: bookingsRes.count ?? 0, icon: Receipt, tone: "from-emerald-500 to-teal-600", to: "/admin/bookings" },
        { label: "Confirmed revenue", value: `$${totalRev.toFixed(2)}`, icon: TrendingUp, tone: "from-success to-emerald-600", to: "/admin/bookings" },
        { label: "Wallet float", value: `$${wallets.toFixed(2)}`, icon: Wallet, tone: "from-violet-500 to-fuchsia-600", to: "/admin/wallets" },
        { label: "Consultations", value: consultRes.count ?? 0, icon: Calendar, tone: "from-sky-500 to-blue-600", to: "/admin/consultations" },
        { label: "Active providers", value: providers.filter((p: any) => p.enabled).length, sub: `${providers.length} total`, icon: Activity, tone: "from-cyan-500 to-blue-500", to: "/admin/operations" },
        { label: "Provider errors (lifetime)", value: errorRate, icon: AlertCircle, tone: "from-destructive to-rose-600", to: "/admin/operations" },
      ]);
      setRecentBookings(recentRes.data ?? []);
      setPendingApps(agentsRes.count ?? 0);
    })();
  }, []);

  return (
    <div>
      <AdminPageHeader
        icon={LayoutDashboard}
        title="Command Center"
        description="A real-time view of your platform's health, growth, and operations."
      />

      {pendingApps > 0 && (
        <Link to="/admin/agents" className="mb-6 flex items-center gap-3 rounded-xl border-l-4 border-amber-500 bg-amber-500/10 p-4 hover:bg-amber-500/15">
          <Briefcase className="h-5 w-5 text-amber-600" />
          <div className="flex-1 text-sm">
            <span className="font-bold text-foreground">{pendingApps} agent application{pendingApps > 1 ? "s" : ""}</span>{" "}
            <span className="text-muted-foreground">awaiting your review.</span>
          </div>
          <span className="text-xs font-bold text-amber-700">Review now →</span>
        </Link>
      )}

      {!stats ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {stats.map((s) => (
            <Link key={s.label} to={s.to} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elegant">
              <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${s.tone} opacity-15 blur-xl transition group-hover:opacity-30`} />
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${s.tone} text-white shadow`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="mt-1 font-display text-2xl font-extrabold tracking-tight">{s.value}</div>
              {s.sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</div>}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-extrabold">Recent bookings</h2>
            <Link to="/admin/bookings" className="text-xs font-bold text-primary hover:underline">View all →</Link>
          </div>
          {recentBookings.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No bookings yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{b.customer_name || b.customer_email}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{b.vertical} · {b.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold">{b.currency} {Number(b.amount).toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-accent/10 p-5 shadow-card">
          <h2 className="font-display text-base font-extrabold">Quick actions</h2>
          <p className="mt-1 text-xs text-muted-foreground">Jump to the most common admin tasks.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { to: "/admin/users", label: "Manage users", icon: Users },
              { to: "/admin/agents", label: "Review agents", icon: Briefcase },
              { to: "/admin/markups", label: "Edit markups", icon: TrendingUp },
              { to: "/admin/operations", label: "Provider health", icon: Activity },
            ].map((a) => (
              <Link key={a.to} to={a.to} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-bold hover:border-primary hover:text-primary">
                <a.icon className="h-3.5 w-3.5" /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
