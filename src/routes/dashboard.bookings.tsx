import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plane, Hotel, FileCheck, Shield, Map, Car, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice, formatSlot } from "@/lib/format";

export const Route = createFileRoute("/dashboard/bookings")({
  head: () => ({ meta: [{ title: "My bookings — iSwitch" }] }),
  component: BookingsPage,
});

type UnifiedRow = {
  id: string; vertical: string; status: string; amount: number; currency: string;
  external_reference: string | null; customer_name: string; created_at: string;
};
type ConsultRow = {
  id: string; status: string; amount_cents: number; currency: string;
  consultation_services: { name: string } | null;
  consultation_tiers: { duration_minutes: number } | null;
  consultation_slots: { starts_at: string } | null;
};

const VERT_ICON: Record<string, typeof Plane> = {
  flights: Plane, stays: Hotel, visas: FileCheck, insurance: Shield, tours: Map, pickups: Car,
};

function BookingsPage() {
  const { user } = useAuth();
  const [unified, setUnified] = useState<UnifiedRow[]>([]);
  const [consults, setConsults] = useState<ConsultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [u, c] = await Promise.all([
        supabase.from("bookings_unified")
          .select("id, vertical, status, amount, currency, external_reference, customer_name, created_at")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("consultation_bookings")
          .select("id, status, amount_cents, currency, consultation_services(name), consultation_tiers(duration_minutes), consultation_slots(starts_at)")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setUnified((u.data ?? []) as UnifiedRow[]);
      setConsults((c.data ?? []) as ConsultRow[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">My bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">All your trips and consultations in one list.</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Section title="Travel bookings" empty="No travel bookings yet." emptyCta={{ to: "/dashboard/book", label: "Start a search" }}>
            {unified.map((b) => {
              const Icon = VERT_ICON[b.vertical] ?? Plane;
              return (
                <Row key={b.id} icon={Icon} title={`${cap(b.vertical)} · ${b.customer_name}`}
                     subtitle={`Ref ${b.external_reference ?? b.id.slice(0, 8)} · ${new Date(b.created_at).toLocaleDateString()}`}
                     amount={formatPrice(Math.round(Number(b.amount) * 100), b.currency)} status={b.status} />
              );
            })}
          </Section>

          <Section title="Consultations" empty="No consultations booked." emptyCta={{ to: "/consultations", label: "Browse consultations" }}>
            {consults.map((b) => {
              const slot = b.consultation_slots?.starts_at ? formatSlot(b.consultation_slots.starts_at) : null;
              return (
                <Row key={b.id} icon={GraduationCap}
                     title={b.consultation_services?.name ?? "Consultation"}
                     subtitle={`${b.consultation_tiers?.duration_minutes ?? 30} min · ${slot ? `${slot.date} at ${slot.time}` : "Time TBD"}`}
                     amount={formatPrice(b.amount_cents, b.currency)} status={b.status} />
              );
            })}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children, empty, emptyCta }: { title: string; children: React.ReactNode; empty: string; emptyCta: { to: string; label: string } }) {
  const arr = Array.isArray(children) ? children : [children];
  const has = arr.filter(Boolean).length > 0;
  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-extrabold">{title}</h2>
      {has ? <div className="space-y-2">{children}</div> : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">{empty}</p>
          <Link to={emptyCta.to} className="mt-3 inline-block rounded-md bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">{emptyCta.label}</Link>
        </div>
      )}
    </div>
  );
}

function Row({ icon: Icon, title, subtitle, amount, status }: { icon: typeof Plane; title: string; subtitle: string; amount: string; status: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div>
          <div className="font-bold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-extrabold text-primary">{amount}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badge(status)}`}>{status}</span>
      </div>
    </div>
  );
}

function badge(s: string) {
  switch (s) {
    case "confirmed": return "bg-success/10 text-success";
    case "completed": return "bg-primary/10 text-primary";
    case "cancelled": case "failed": return "bg-destructive/10 text-destructive";
    default: return "bg-accent/20 text-accent-foreground";
  }
}
function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
