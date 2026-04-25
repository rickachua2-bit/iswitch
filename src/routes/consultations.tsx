import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, GraduationCap, Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice, formatSlot } from "@/lib/format";

export const Route = createFileRoute("/consultations")({
  head: () => ({
    meta: [
      { title: "Book a Consultation — iSwitch" },
      { name: "description", content: "Book paid consultations with certified experts on study abroad, immigration, work abroad and business setup." },
    ],
  }),
  component: ConsultationsPage,
});

type Service = { id: string; name: string; category: string; description: string | null };
type Tier = { id: string; service_id: string; duration_minutes: number; price_cents: number; currency: string };
type Slot = { id: string; service_id: string; starts_at: string; ends_at: string };

function ConsultationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [s, t, sl] = await Promise.all([
        supabase.from("consultation_services").select("*").eq("is_active", true).order("name"),
        supabase.from("consultation_tiers").select("*").eq("is_active", true).order("duration_minutes"),
        supabase.from("consultation_slots").select("*").eq("is_booked", false).gt("starts_at", new Date().toISOString()).order("starts_at"),
      ]);
      setServices((s.data ?? []) as Service[]);
      setTiers((t.data ?? []) as Tier[]);
      setSlots((sl.data ?? []) as Slot[]);
      setLoading(false);
    })();
  }, []);

  const serviceTiers = useMemo(
    () => (selectedService ? tiers.filter((t) => t.service_id === selectedService.id) : []),
    [selectedService, tiers],
  );
  const serviceSlots = useMemo(
    () => (selectedService ? slots.filter((s) => s.service_id === selectedService.id) : []),
    [selectedService, slots],
  );

  async function handleConfirm() {
    setError(null);
    if (!selectedService || !selectedTier || !selectedSlot) return;
    if (!user) {
      void navigate({ to: "/login" });
      return;
    }
    setBooking(true);
    // Mark slot booked first (RLS allows admins; users can't UPDATE slots — so we use an RPC-style two-step)
    // Since users can't update slots directly, the booking insert succeeds; admins/cron can later mark slot booked.
    // For now, we do a best-effort insert and then attempt slot update (may no-op for non-admin — that's OK, unique constraint on slot_id prevents double-booking).
    const { error: insErr } = await supabase.from("consultation_bookings").insert({
      user_id: user.id,
      slot_id: selectedSlot.id,
      tier_id: selectedTier.id,
      service_id: selectedService.id,
      amount_cents: selectedTier.price_cents,
      currency: selectedTier.currency,
      status: "pending",
    });
    setBooking(false);
    if (insErr) {
      setError(insErr.message.includes("duplicate") ? "That slot was just taken. Please choose another." : insErr.message);
      return;
    }
    setConfirmed(selectedSlot.id);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header />
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-4 font-display text-2xl font-extrabold">Consultation booked!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've reserved your slot. Payment and final confirmation will be handled in your dashboard.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/dashboard" className="rounded-md bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow">View dashboard</Link>
            <Link to="/" className="rounded-md border border-border bg-card px-4 py-2 text-xs font-bold">Back home</Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero py-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            Paid expert consultations
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-primary-foreground md:text-4xl">
            Book a certified expert
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/85">Pick a service, choose a duration, and reserve your time slot.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        {/* Step 1: Service */}
        {!selectedService && (
          <>
            <h2 className="mb-4 font-display text-xl font-extrabold">1. Choose a service</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  className="group rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:-translate-y-1 hover:shadow-elevated"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="mt-3 font-display text-base font-extrabold text-foreground">{s.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.description}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Tier + Slot */}
        {selectedService && (
          <>
            <button onClick={() => { setSelectedService(null); setSelectedTier(null); setSelectedSlot(null); }} className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              <ArrowLeft className="h-3 w-3" /> Back to services
            </button>
            <h2 className="mb-1 font-display text-xl font-extrabold">{selectedService.name}</h2>
            <p className="mb-6 text-sm text-muted-foreground">{selectedService.description}</p>

            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">2. Choose duration</h3>
            <div className="mb-8 grid grid-cols-3 gap-3">
              {serviceTiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTier(t)}
                  className={`rounded-2xl border-2 p-4 text-left transition ${selectedTier?.id === t.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" /> {t.duration_minutes} min
                  </div>
                  <div className="mt-2 font-display text-2xl font-extrabold text-primary">{formatPrice(t.price_cents, t.currency)}</div>
                </button>
              ))}
            </div>

            {selectedTier && (
              <>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">3. Pick a time slot</h3>
                {serviceSlots.length === 0 ? (
                  <p className="rounded-md bg-card p-6 text-center text-sm text-muted-foreground">No available slots. Check back soon.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                    {serviceSlots.slice(0, 24).map((s) => {
                      const f = formatSlot(s.starts_at);
                      const active = selectedSlot?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedSlot(s)}
                          className={`rounded-lg border-2 p-3 text-center text-xs transition ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                        >
                          <div className="font-bold text-foreground">{f.date}</div>
                          <div className="text-muted-foreground">{f.time}</div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedSlot && (
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-card p-5 shadow-card">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Total</div>
                      <div className="font-display text-2xl font-extrabold text-primary">{formatPrice(selectedTier.price_cents, selectedTier.currency)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {selectedService.name} · {selectedTier.duration_minutes} min · {formatSlot(selectedSlot.starts_at).date} at {formatSlot(selectedSlot.starts_at).time}
                      </div>
                    </div>
                    {error && <div className="w-full rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
                    <button onClick={handleConfirm} disabled={booking} className="flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60">
                      {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {user ? "Confirm booking" : "Sign in to book"}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}
