import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Loader2, GraduationCap, Clock, CheckCircle2, ArrowLeft, User,
  Sparkles, ShieldCheck, Headphones, Globe2, Calendar, Star, Zap, Users, Award,
  Briefcase, Plane, Building2, Heart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { formatSlot } from "@/lib/format";

type Service = { id: string; name: string; category: string; description: string | null };
type Tier = { id: string; service_id: string; duration_minutes: number; price_cents: number; currency: string };
type Slot = { id: string; service_id: string; starts_at: string; ends_at: string };

// Service-specific theming for visual variety
const SERVICE_THEMES: { match: RegExp; icon: typeof GraduationCap; grad: string; emoji: string }[] = [
  { match: /study|school|abroad|education/i, icon: GraduationCap, grad: "from-violet-500 via-purple-600 to-fuchsia-700", emoji: "🎓" },
  { match: /immigration|visa|relocat/i, icon: Plane, grad: "from-blue-500 via-indigo-600 to-violet-700", emoji: "✈️" },
  { match: /work|job|career/i, icon: Briefcase, grad: "from-amber-500 via-orange-600 to-red-700", emoji: "💼" },
  { match: /business|company|register|setup/i, icon: Building2, grad: "from-emerald-500 via-teal-600 to-cyan-700", emoji: "🏢" },
  { match: /health|medical|wellness/i, icon: Heart, grad: "from-rose-500 via-pink-600 to-fuchsia-700", emoji: "❤️" },
];

function themeFor(name: string) {
  return (
    SERVICE_THEMES.find((t) => t.match.test(name)) ?? {
      icon: GraduationCap,
      grad: "from-primary via-primary-glow to-accent",
      emoji: "✨",
    }
  );
}

export type ConsultationFlowProps = {
  /** Heading shown above the flow (omit when host page provides its own hero). */
  heading?: string;
  subheading?: string;
  /** Where to send the user after a confirmed booking (defaults to /dashboard for logged-in). */
  successHref?: string;
  /** When true, hides the marketing trust strip (use inside dashboard). */
  compact?: boolean;
};

export function ConsultationFlow({
  heading,
  subheading,
  successHref,
  compact = false,
}: ConsultationFlowProps) {
  const { user } = useAuth();
  const { format: formatMoney } = useCurrency();

  const [services, setServices] = useState<Service[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

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
      if (!guestName.trim()) return setError("Please enter your name.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) return setError("Please enter a valid email address.");
    }
    setBooking(true);
    const payload = user
      ? {
          user_id: user.id,
          slot_id: selectedSlot.id,
          tier_id: selectedTier.id,
          service_id: selectedService.id,
          amount_cents: selectedTier.price_cents,
          currency: selectedTier.currency,
          status: "pending" as const,
        }
      : {
          user_id: null,
          slot_id: selectedSlot.id,
          tier_id: selectedTier.id,
          service_id: selectedService.id,
          amount_cents: selectedTier.price_cents,
          currency: selectedTier.currency,
          status: "pending" as const,
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim() || null,
        };

    const { error: insErr } = await supabase.from("consultation_bookings").insert(payload);
    setBooking(false);
    if (insErr) {
      setError(insErr.message.includes("duplicate") ? "That slot was just taken. Please choose another." : insErr.message);
      return;
    }
    setConfirmed(true);
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-elevated">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-glow">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-extrabold">You're booked! 🎉</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user
            ? "Your slot is reserved. We'll send a calendar invite and meeting link to your inbox shortly."
            : `We've reserved your slot and emailed details to ${guestEmail}. Create an account to track future bookings.`}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {user ? (
            <Link to={successHref ?? "/dashboard/bookings"} className="rounded-full bg-gradient-to-r from-primary to-primary-glow px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-glow">
              View my bookings
            </Link>
          ) : (
            <Link to="/signup" className="rounded-full bg-gradient-to-r from-primary to-primary-glow px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-glow">
              Create account
            </Link>
          )}
          <button
            onClick={() => {
              setConfirmed(false);
              setSelectedService(null);
              setSelectedTier(null);
              setSelectedSlot(null);
            }}
            className="rounded-full border border-border bg-card px-5 py-2.5 text-xs font-bold"
          >
            Book another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {heading && (
        <div>
          <h2 className="font-display text-2xl font-extrabold text-foreground">{heading}</h2>
          {subheading && <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>}
        </div>
      )}

      {/* Trust strip (hidden in compact dashboard mode) */}
      {!compact && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Award, label: "Certified experts", grad: "from-amber-500 to-orange-600" },
            { icon: Zap, label: "Same-week slots", grad: "from-violet-500 to-purple-600" },
            { icon: Globe2, label: "50+ destinations", grad: "from-blue-500 to-indigo-600" },
            { icon: ShieldCheck, label: "Money-back guarantee", grad: "from-emerald-500 to-teal-600" },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-card">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${t.grad} text-white`}>
                <t.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-extrabold text-foreground md:text-sm">{t.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Service */}
      {!selectedService && (
        <div>
          <StepHeader index={1} label="Pick a consultation service" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const t = themeFor(s.name);
              const Icon = t.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedService(s)}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:-translate-y-1 hover:shadow-elevated"
                >
                  <div className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${t.grad} opacity-20 blur-2xl transition group-hover:opacity-40`} />
                  <div className="relative flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.grad} text-white shadow-glow`}>
                      <Icon className="h-6 w-6" strokeWidth={2.4} />
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-base font-extrabold text-foreground">{s.name}</div>
                      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.category}</div>
                      {s.description && <p className="mt-2 text-xs text-muted-foreground">{s.description}</p>}
                      <div className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-primary">
                        Book now <ArrowLeft className="h-3 w-3 rotate-180" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Social proof */}
          {!compact && services.length > 0 && (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { quote: "Got my UK study visa approved in 3 weeks. The 60-min session was worth every naira.", name: "Adaeze · Lagos → Manchester", grad: "from-violet-500 to-purple-600" },
                { quote: "Their immigration expert mapped out my Canada PR step by step. So clear.", name: "Tunde · Abuja → Toronto", grad: "from-blue-500 to-indigo-600" },
                { quote: "Registered my UK Ltd company in days. Loved the follow-up email.", name: "Chiamaka · Founder", grad: "from-emerald-500 to-teal-600" },
              ].map((t) => (
                <div key={t.name} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[0,1,2,3,4].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">"{t.quote}"</p>
                  <div className={`mt-3 inline-block bg-gradient-to-r ${t.grad} bg-clip-text text-xs font-extrabold text-transparent`}>
                    {t.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2+: Tier + Slot + Checkout */}
      {selectedService && (
        <div>
          <button
            onClick={() => { setSelectedService(null); setSelectedTier(null); setSelectedSlot(null); }}
            className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft className="h-3 w-3" /> Back to services
          </button>

          {/* Service banner */}
          <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${themeFor(selectedService.name).grad} p-6 text-white shadow-elevated`}>
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                <Sparkles className="h-3 w-3" /> Selected
              </span>
              <h3 className="mt-2 font-display text-2xl font-extrabold">{selectedService.name}</h3>
              {selectedService.description && (
                <p className="mt-1 max-w-2xl text-sm opacity-90">{selectedService.description}</p>
              )}
            </div>
          </div>

          {/* Step 2: Duration tiers */}
          <div className="mt-6">
            <StepHeader index={2} label="Choose duration" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {serviceTiers.map((t, i) => {
                const isPopular = i === 1;
                const active = selectedTier?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTier(t)}
                    className={`relative overflow-hidden rounded-2xl border-2 p-5 text-left transition ${
                      active
                        ? "border-primary bg-gradient-to-br from-primary/10 to-accent/10 shadow-glow"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-glow">
                        Most popular
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Clock className="h-3 w-3" /> {t.duration_minutes} minutes
                    </div>
                    <div className="mt-3 font-display text-3xl font-extrabold text-primary">{formatMoney(t.price_cents)}</div>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> 1-on-1 expert call
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Action plan via email
                      </div>
                      {t.duration_minutes >= 45 && (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Document review
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Slot picker */}
          {selectedTier && (
            <div className="mt-8">
              <StepHeader index={3} label="Pick a time slot" />
              {serviceSlots.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                  No available slots. Check back soon or contact support.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                  {serviceSlots.slice(0, 24).map((s) => {
                    const f = formatSlot(s.starts_at);
                    const active = selectedSlot?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedSlot(s)}
                        className={`rounded-xl border-2 p-3 text-center text-xs transition ${
                          active
                            ? "border-primary bg-gradient-to-br from-primary/15 to-accent/10 shadow-glow"
                            : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40"
                        }`}
                      >
                        <Calendar className={`mx-auto mb-1 h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="font-extrabold text-foreground">{f.date}</div>
                        <div className="text-muted-foreground">{f.time}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Guest details + checkout */}
          {selectedSlot && selectedTier && (
            <div className="mt-8 space-y-4">
              {!user && (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <StepHeader index={4} label="Your details" inline />
                    <Link to="/login" search={{ redirect: "/consultations" }} className="text-xs font-bold text-primary hover:underline">
                      Have an account? Sign in
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Full name *" className="rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                    <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="Email address *" className="rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                    <input type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none" />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Booking confirmation will be sent to your email. No account required.
                  </p>
                </div>
              )}

              {/* Sticky-feeling summary */}
              <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 shadow-elevated">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total today</div>
                    <div className="font-display text-3xl font-extrabold text-primary">{formatMoney(selectedTier.price_cents)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {selectedService.name} · {selectedTier.duration_minutes} min · {formatSlot(selectedSlot.starts_at).date} at {formatSlot(selectedSlot.starts_at).time}
                    </div>
                    {user && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <User className="h-3 w-3" /> Booking as {user.email}
                      </div>
                    )}
                  </div>
                  {error && <div className="w-full rounded-xl bg-destructive/10 p-2.5 text-xs font-bold text-destructive">{error}</div>}
                  <button
                    onClick={handleConfirm}
                    disabled={booking}
                    className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-primary-glow px-7 py-3 text-sm font-extrabold text-primary-foreground shadow-glow transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm booking
                  </button>
                </div>
                <div className="relative mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Secure checkout</span>
                  <span className="inline-flex items-center gap-1"><Headphones className="h-3 w-3 text-blue-500" /> 24/7 support</span>
                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3 text-violet-500" /> 12,000+ travelers helped</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepHeader({ index, label, inline = false }: { index: number; label: string; inline?: boolean }) {
  return (
    <div className={inline ? "flex items-center gap-2" : "mb-3 flex items-center gap-2"}>
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-xs font-extrabold text-primary-foreground shadow-glow">
        {index}
      </span>
      <h3 className="font-display text-lg font-extrabold text-foreground">{label}</h3>
    </div>
  );
}
