import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Plane, Hotel, FileCheck, Shield, Map, Car, GraduationCap,
  Search, Receipt, Wallet, CalendarClock, CheckCircle2, XCircle, Clock,
  TrendingUp, Sparkles, ArrowUpRight, Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice, formatSlot } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/dashboard/bookings")({
  head: () => ({ meta: [{ title: "My bookings — iSwitch" }] }),
  component: BookingsPage,
});

type UnifiedRow = {
  id: string; vertical: string; status: string; amount: number; currency: string;
  external_reference: string | null; customer_name: string; created_at: string;
};
type ConsultRow = {
  id: string; status: string; amount_cents: number; currency: string; created_at: string;
  consultation_services: { name: string; category: string | null } | null;
  consultation_tiers: { duration_minutes: number } | null;
  consultation_slots: { starts_at: string } | null;
};

type FeedItem = {
  id: string;
  kind: "travel" | "consultation";
  vertical: string;
  title: string;
  subtitle: string;
  amountLabel: string;
  amountUSD: number;
  status: string;
  reference: string;
  createdAt: string;
  scheduledAt?: string | null;
};

const VERT_ICON: Record<string, typeof Plane> = {
  flights: Plane, stays: Hotel, visas: FileCheck, insurance: Shield,
  tours: Map, pickups: Car, consultation: GraduationCap,
};
const VERT_GRAD: Record<string, string> = {
  flights: "from-sky-500 to-indigo-600",
  stays: "from-emerald-500 to-teal-600",
  visas: "from-amber-500 to-orange-600",
  insurance: "from-rose-500 to-pink-600",
  tours: "from-fuchsia-500 to-purple-600",
  pickups: "from-cyan-500 to-blue-600",
  consultation: "from-violet-500 to-indigo-600",
};

function BookingsPage() {
  const { user } = useAuth();
  const [unified, setUnified] = useState<UnifiedRow[]>([]);
  const [consults, setConsults] = useState<ConsultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [u, c] = await Promise.all([
        supabase.from("bookings_unified")
          .select("id, vertical, status, amount, currency, external_reference, customer_name, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("consultation_bookings")
          .select("id, status, amount_cents, currency, created_at, consultation_services(name, category), consultation_tiers(duration_minutes), consultation_slots(starts_at)")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setUnified((u.data ?? []) as UnifiedRow[]);
      setConsults((c.data ?? []) as ConsultRow[]);
      setLoading(false);
    })();
  }, [user]);

  const feed: FeedItem[] = useMemo(() => {
    const a: FeedItem[] = unified.map((b) => ({
      id: b.id,
      kind: "travel",
      vertical: b.vertical,
      title: `${cap(b.vertical)} · ${b.customer_name}`,
      subtitle: `Booked ${new Date(b.created_at).toLocaleDateString()}`,
      amountLabel: formatPrice(Math.round(Number(b.amount) * 100), b.currency),
      amountUSD: Number(b.amount) || 0,
      status: b.status,
      reference: b.external_reference ?? b.id.slice(0, 8).toUpperCase(),
      createdAt: b.created_at,
    }));
    const d: FeedItem[] = consults.map((b) => {
      const slot = b.consultation_slots?.starts_at ? formatSlot(b.consultation_slots.starts_at) : null;
      return {
        id: b.id,
        kind: "consultation",
        vertical: "consultation",
        title: b.consultation_services?.name ?? "Expert consultation",
        subtitle: `${b.consultation_tiers?.duration_minutes ?? 30} min · ${slot ? `${slot.date} at ${slot.time}` : "Time TBD"}`,
        amountLabel: formatPrice(b.amount_cents, b.currency),
        amountUSD: (b.amount_cents || 0) / 100,
        status: b.status,
        reference: b.id.slice(0, 8).toUpperCase(),
        createdAt: b.created_at,
        scheduledAt: b.consultation_slots?.starts_at ?? null,
      };
    });
    return [...a, ...d].sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt));
  }, [unified, consults]);

  const stats = useMemo(() => {
    const total = feed.length;
    const upcoming = feed.filter((f) => isUpcoming(f)).length;
    const completed = feed.filter((f) => f.status === "completed").length;
    const spent = feed.reduce((s, f) => s + (f.amountUSD || 0), 0);
    return { total, upcoming, completed, spent };
  }, [feed]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return feed.filter((f) => {
      if (tab === "upcoming" && !isUpcoming(f)) return false;
      if (tab === "completed" && f.status !== "completed") return false;
      if (tab === "cancelled" && !["cancelled", "failed", "refunded"].includes(f.status)) return false;
      if (!q) return true;
      return (
        f.title.toLowerCase().includes(q) ||
        f.reference.toLowerCase().includes(q) ||
        f.vertical.toLowerCase().includes(q) ||
        f.status.toLowerCase().includes(q)
      );
    });
  }, [feed, tab, search]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* HERO */}
      <section
        className="relative overflow-hidden rounded-3xl text-primary-foreground shadow-elevated"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-primary-glow/40 blur-3xl" />
        </div>
        <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur">
              <Sparkles className="h-3 w-3 text-accent" /> Your travel ledger
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-4xl">
              My bookings — at a glance
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-primary-foreground/85">
              Track every flight, stay, visa, insurance plan and consultation in one beautiful timeline.
            </p>
          </div>
          <Link
            to="/dashboard/book"
            className="inline-flex items-center gap-2 self-start rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-accent-foreground shadow-lg transition-transform hover:scale-105"
          >
            <Plane className="h-4 w-4" /> New booking <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* STAT STRIP */}
        <div className="relative grid grid-cols-2 gap-px overflow-hidden border-t border-primary-foreground/15 bg-primary-foreground/10 backdrop-blur md:grid-cols-4">
          <Stat icon={<Receipt className="h-4 w-4" />} label="Total bookings" value={String(stats.total)} />
          <Stat icon={<CalendarClock className="h-4 w-4" />} label="Upcoming" value={String(stats.upcoming)} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={String(stats.completed)} />
          <Stat
            icon={<Wallet className="h-4 w-4" />}
            label="Lifetime spend"
            value={`$${stats.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            trend
          />
        </div>
      </section>

      {/* CONTROLS */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-muted/60">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Completed
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Cancelled
            </TabsTrigger>
          </TabsList>
          {/* spacers to satisfy Tabs API */}
          <TabsContent value="all" />
          <TabsContent value="upcoming" />
          <TabsContent value="completed" />
          <TabsContent value="cancelled" />
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by reference, type, name…"
            className="pl-9"
          />
        </div>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState hasAny={feed.length > 0} />
      ) : (
        <div className="grid gap-3">
          {visible.map((item) => <BookingCard key={`${item.kind}-${item.id}`} item={item} />)}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend?: boolean }) {
  return (
    <div className="bg-primary/40 px-5 py-4">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground/80">
        <span className="text-accent">{icon}</span>{label}
      </div>
      <div className="mt-1 flex items-end gap-2">
        <span className="font-display text-2xl font-extrabold text-primary-foreground">{value}</span>
        {trend && (
          <span className="mb-0.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-300">
            <TrendingUp className="h-3 w-3" /> all-time
          </span>
        )}
      </div>
    </div>
  );
}

function BookingCard({ item }: { item: FeedItem }) {
  const Icon = VERT_ICON[item.vertical] ?? Plane;
  const grad = VERT_GRAD[item.vertical] ?? "from-primary to-primary-glow";
  const upcoming = isUpcoming(item);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated">
      {/* left accent */}
      <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${grad}`} />
      <div className="flex flex-col gap-4 p-4 pl-5 md:flex-row md:items-center md:justify-between md:p-5 md:pl-6">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-md`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-display text-base font-extrabold text-foreground">{item.title}</h3>
              <StatusPill status={item.status} />
              {upcoming && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-foreground">
                  <CalendarClock className="h-3 w-3" /> Upcoming
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="font-mono font-semibold text-foreground/70">#{item.reference}</span>
              <span>·</span>
              <span>{item.subtitle}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-center">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</div>
            <div className="font-display text-lg font-extrabold text-primary">{item.amountLabel}</div>
          </div>
          <Button size="sm" variant="outline" className="gap-1 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground">
            View <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    confirmed: { cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" />, label: "Confirmed" },
    completed: { cls: "bg-primary/15 text-primary", icon: <CheckCircle2 className="h-3 w-3" />, label: "Completed" },
    pending: { cls: "bg-accent/25 text-accent-foreground", icon: <Clock className="h-3 w-3" />, label: "Pending" },
    cancelled: { cls: "bg-destructive/15 text-destructive", icon: <XCircle className="h-3 w-3" />, label: "Cancelled" },
    failed: { cls: "bg-destructive/15 text-destructive", icon: <XCircle className="h-3 w-3" />, label: "Failed" },
    refunded: { cls: "bg-muted text-muted-foreground", icon: <Receipt className="h-3 w-3" />, label: "Refunded" },
  };
  const m = map[status] ?? { cls: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" />, label: status };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="rounded-3xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Filter className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-extrabold text-foreground">
        {hasAny ? "No bookings match this filter" : "Your story starts here"}
      </h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {hasAny
          ? "Try a different tab or clear your search to see all bookings."
          : "Book a flight, stay, visa or expert consultation to see your trips appear here."}
      </p>
      <Link
        to="/dashboard/book"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-extrabold text-primary-foreground shadow hover:bg-primary-dark"
      >
        <Plane className="h-4 w-4" /> Start a booking
      </Link>
    </div>
  );
}

function isUpcoming(f: FeedItem) {
  if (f.scheduledAt) return new Date(f.scheduledAt) > new Date();
  return ["confirmed", "pending"].includes(f.status);
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
