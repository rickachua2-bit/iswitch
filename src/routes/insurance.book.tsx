import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  BookingShell, BookingSectionCard, Field, ConfirmButton, TrustStrip, SuccessCard,
  type BookingHeroProps,
} from "@/components/booking/BookingShell";
import { bookInsurance } from "@/server/travsify";
import { usePriceFormat } from "@/lib/use-price-format";
import {
  ShieldCheck, CheckCircle2, Heart, Briefcase, Plane, Stethoscope, Wallet, X, Calendar as CalendarIcon, Globe2, Users,
  User, Mail, Phone,
} from "lucide-react";

const searchSchema = z.object({
  plan_id: z.coerce.string(),
  destination: z.coerce.string().optional().default(""),
  start: z.coerce.string().optional().default(""),
  end: z.coerce.string().optional().default(""),
  travelers: z.coerce.string().optional().default("1"),
});

export const Route = createFileRoute("/insurance/book")({
  head: () => ({
    meta: [
      { title: "Review your insurance plan — iSwitch Insurance" },
      { name: "description", content: "Review coverage, benefits and exclusions before purchasing your travel insurance." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: InsuranceBookingPage,
});

const DEFAULT_BENEFITS = [
  { icon: Stethoscope, label: "Medical emergency", value: "Up to $250,000" },
  { icon: Plane, label: "Trip cancellation", value: "Up to $5,000" },
  { icon: Briefcase, label: "Lost baggage", value: "Up to $1,500" },
  { icon: Heart, label: "Personal accident", value: "Up to $25,000" },
  { icon: Wallet, label: "Emergency cash advance", value: "Up to $1,000" },
  { icon: ShieldCheck, label: "COVID-19 cover", value: "Included" },
];

function InsuranceBookingPage() {
  const { plan_id, destination, start, end, travelers } = Route.useSearch();
  const formatPrice = usePriceFormat();
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { recoverSelectedOffer } = await import("@/lib/select-offer");
      const payload = await recoverSelectedOffer({
        sessionPrefix: "plan",
        cachePrefix: "plan",
        id: plan_id,
      });
      if (!cancelled) {
        setPlan(payload);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [plan_id]);

  if (loading) {
    return (
      <BookingShell backTo="/insurance">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your selected plan…</p>
        </div>
      </BookingShell>
    );
  }

  if (!plan) {
    return (
      <BookingShell backTo="/insurance">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Quote session expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please return to insurance and choose your plan again.</p>
        </div>
      </BookingShell>
    );
  }

  const price = Number(plan.price ?? 0);
  const total = price * (Number(travelers) || 1);
  const currency = plan.currency ?? "USD";
  const benefits = plan.benefits ?? DEFAULT_BENEFITS;
  const exclusions: string[] = plan.exclusions ?? [
    "Pre-existing medical conditions (unless declared)",
    "Extreme sports without explicit add-on",
    "Travel against government advisories",
    "Losses due to alcohol or drug use",
  ];

  const hero: BookingHeroProps = {
    vertical: "insurance",
    eyebrow: plan.tier ?? "Travel insurance",
    title: plan.name,
    subtitle: `${destination || "Worldwide"} cover`,
    meta: [
      { icon: CalendarIcon, label: `${start || "—"} → ${end || "—"}` },
      { icon: Users, label: `${travelers} traveller${Number(travelers) > 1 ? "s" : ""}` },
      { icon: Globe2, label: destination || "Worldwide" },
    ],
    priceLabel: "Total premium",
    priceValue: formatPrice(total, currency),
    priceFootnote: `${formatPrice(price, currency)} per traveller`,
    backTo: "/insurance",
  };

  return (
    <BookingShell backTo="/insurance" hero={hero}>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> {plan.tier ?? "Travel insurance"}
                </div>
                <h1 className="mt-2 text-2xl font-extrabold text-foreground">{plan.name}</h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  {destination || "Worldwide"} · {start} → {end} · {travelers} traveller{Number(travelers) > 1 ? "s" : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Per traveller</div>
                <div className="text-2xl font-extrabold text-primary">{formatPrice(price, currency)}</div>
              </div>
            </div>
          </div>

          <BookingSectionCard title="What's covered" subtitle="Headline benefits — see policy wording for full limits.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {benefits.map((b: any, i: number) => {
                const Icon = b.icon ?? ShieldCheck;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                    <Icon className="h-5 w-5 flex-none text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-foreground">{b.label}</div>
                      <div className="text-xs text-muted-foreground">{b.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </BookingSectionCard>

          <BookingSectionCard title="What's not covered">
            <ul className="space-y-2 text-sm">
              {exclusions.map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <X className="mt-0.5 h-4 w-4 flex-none text-destructive" />
                  <span className="text-foreground">{e}</span>
                </li>
              ))}
            </ul>
          </BookingSectionCard>

          <BookingSectionCard title="24/7 emergency assistance">
            <p className="text-sm text-muted-foreground">
              Once your policy is active you get a 24/7 multilingual emergency hotline,
              direct hospital billing in 180+ countries, and concierge support for claims.
            </p>
          </BookingSectionCard>

          <PolicyForm plan={plan} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="text-xs text-muted-foreground">Order summary</div>
            <div className="mt-1 text-base font-extrabold text-foreground">{plan.name}</div>
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <Row label={`${formatPrice(price, currency)} × ${travelers}`} value={formatPrice(total, currency)} />
              <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-extrabold text-primary">{formatPrice(total, currency)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" /> Policy issued instantly after payment
            </div>
          </div>
          <TrustStrip />
        </aside>
      </main>
    </BookingShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

function PolicyForm({ plan }: { plan: any }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference?: string; status?: string } | null>(null);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", born_on: "", phone: "" });

  function set<K extends keyof typeof v>(k: K, val: string) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { startCheckout } = await import("@/lib/checkout");
      const res = await startCheckout({
        vertical: "insurance",
        provider_slug: plan.provider_slug ?? "travsify",
        amount: Number(plan.price ?? plan.premium ?? 0),
        currency: plan.currency ?? "USD",
        customer_name: `${v.firstName} ${v.lastName}`.trim(),
        customer_email: v.email,
        customer_phone: v.phone,
        payload: {
          plan_id: plan.id,
          holder: { firstName: v.firstName, lastName: v.lastName, email: v.email, born_on: v.born_on, phone: v.phone },
          plan_name: plan.name,
        },
      });
      if (!res.ok) { setError(res.error); return; }
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Could not bind policy. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SuccessCard
        title="You're covered!"
        reference={done.reference}
        status={done.status}
        email={v.email}
        backTo="/insurance"
        backLabel="Get another quote"
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <BookingSectionCard title="Policyholder details" subtitle="The lead traveller's details. Add additional travellers after purchase.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="First name" required>
            <input required value={v.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Last name" required>
            <input required value={v.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email" required>
            <input required type="email" value={v.email} onChange={(e) => set("email", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Phone" required>
            <input required type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+234…" />
          </Field>
          <Field label="Date of birth" required>
            <input required type="date" value={v.born_on} onChange={(e) => set("born_on", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </BookingSectionCard>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      <ConfirmButton submitting={submitting} label="Pay & activate cover" />
    </form>
  );
}
