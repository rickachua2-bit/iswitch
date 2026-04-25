import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Clock, GraduationCap, ShieldCheck, ArrowRight, Loader2, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice, formatSlot } from "@/lib/format";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "My dashboard — iSwitch" }] }),
  component: DashboardPage,
});

type Booking = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  consultation_services: { name: string } | null;
  consultation_tiers: { duration_minutes: number } | null;
  consultation_slots: { starts_at: string } | null;
};

function DashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, hasRole, roles } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from("consultation_bookings")
        .select(`
          id, status, amount_cents, currency,
          consultation_services(name),
          consultation_tiers(duration_minutes),
          consultation_slots(starts_at)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!error) setBookings((data ?? []) as Booking[]);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-foreground">Hi, {user.email}</h1>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {roles.length === 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">No active role</span>}
              {roles.map((r) => (
                <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 font-bold uppercase tracking-wider text-primary">
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {hasRole("admin") && (
              <Link to="/admin" className="flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-bold text-background hover:opacity-90">
                <Settings className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <button onClick={() => { void signOut().then(() => navigate({ to: "/" })); }} className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-secondary">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link to="/consultations" className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
            <GraduationCap className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-base font-extrabold">Book a consultation</div>
            <div className="mt-1 text-xs text-muted-foreground">Talk to a certified expert.</div>
            <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/agents/apply" className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-base font-extrabold">Agent application</div>
            <div className="mt-1 text-xs text-muted-foreground">Apply or check your status.</div>
            <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground" />
          </Link>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <Clock className="h-6 w-6 text-primary" />
            <div className="mt-3 font-display text-base font-extrabold">{bookings.length} bookings</div>
            <div className="mt-1 text-xs text-muted-foreground">Across all services.</div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-extrabold">My consultation bookings</h2>
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">You haven't booked any consultations yet.</p>
              <Link to="/consultations" className="mt-4 inline-flex items-center gap-1 rounded-md bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                Browse consultations <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const slot = b.consultation_slots?.starts_at ? formatSlot(b.consultation_slots.starts_at) : null;
                return (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{b.consultation_services?.name ?? "Consultation"}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.consultation_tiers?.duration_minutes ?? 30} min · {slot ? `${slot.date} at ${slot.time}` : "Time TBD"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-extrabold text-primary">{formatPrice(b.amount_cents, b.currency)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function statusBadge(s: string) {
  switch (s) {
    case "confirmed": return "bg-success/10 text-success";
    case "completed": return "bg-primary/10 text-primary";
    case "cancelled": return "bg-destructive/10 text-destructive";
    default: return "bg-accent/20 text-accent-foreground";
  }
}

void Calendar;
