import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  BookingShell, BookingSectionCard, Field, ConfirmButton, TrustStrip, SuccessCard,
  type BookingHeroProps,
} from "@/components/booking/BookingShell";
import { bookVisa } from "@/server/travsify";
import { usePriceFormat } from "@/lib/use-price-format";
import {
  Briefcase, Globe2, Clock, FileCheck2, ShieldCheck, CheckCircle2, Stamp, ScrollText,
  User, Mail, Phone, Calendar as CalendarIcon, IdCard,
} from "lucide-react";

const searchSchema = z.object({
  visa_id: z.coerce.string(),
  nationality: z.coerce.string().optional().default(""),
  destination: z.coerce.string().optional().default(""),
});

export const Route = createFileRoute("/visas/book")({
  head: () => ({
    meta: [
      { title: "Review your visa application — iSwitch Visas" },
      { name: "description", content: "Review eligibility, requirements and fees before submitting your visa application." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: VisaBookingPage,
});

function VisaBookingPage() {
  const { visa_id, nationality, destination } = Route.useSearch();
  const formatPrice = usePriceFormat();
  const [visa, setVisa] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { recoverSelectedOffer } = await import("@/lib/select-offer");
      const payload = await recoverSelectedOffer({
        sessionPrefix: "visa",
        cachePrefix: "visa",
        id: visa_id,
      });
      if (!cancelled) {
        setVisa(payload);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visa_id]);

  if (loading) {
    return (
      <BookingShell backTo="/visas">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Briefcase className="mx-auto mb-3 h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your selected visa option…</p>
        </div>
      </BookingShell>
    );
  }

  if (!visa) {
    return (
      <BookingShell backTo="/visas">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Briefcase className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Application session expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please return to visas and select your option again.
          </p>
        </div>
      </BookingShell>
    );
  }

  const fee = Number(visa.price ?? 0);
  const service = Math.round(fee * 0.1 * 100) / 100;
  const total = fee + service;
  const currency = visa.currency ?? "USD";
  const requirements: string[] =
    visa.requirements ?? visa.documents ?? [
      "Valid passport with at least 6 months remaining validity",
      "Recent passport-size photograph (white background)",
      "Proof of accommodation for the entire stay",
      "Return or onward travel ticket",
      "Bank statements for the last 3 months",
      "Travel insurance covering the trip",
    ];

  const hero: BookingHeroProps = {
    vertical: "visas",
    eyebrow: visa.type ?? "Visa",
    title: visa.name,
    subtitle: `${nationality || "—"} → ${destination || "—"}`,
    meta: [
      { icon: Clock, label: visa.processing_time ?? visa.processing ?? "5–15 days" },
      { icon: FileCheck2, label: visa.validity ?? "90 days validity" },
      { icon: Briefcase, label: visa.stay ?? visa.duration ?? "Up to 30 days" },
    ],
    priceLabel: "Total fee",
    priceValue: formatPrice(total, currency),
    priceFootnote: `Govt ${formatPrice(fee, currency)} + service ${formatPrice(service, currency)}`,
    backTo: "/visas",
  };

  return (
    <BookingShell backTo="/visas" hero={hero}>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  <Stamp className="h-3 w-3" /> {visa.type ?? "Visa"}
                </div>
                <h1 className="mt-2 text-2xl font-extrabold text-foreground">{visa.name}</h1>
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe2 className="h-4 w-4" />
                  {nationality || "—"} → {destination || "—"}
                </div>
              </div>
              <ShieldCheck className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Stat icon={Clock} label="Processing" value={visa.processing_time ?? visa.processing ?? "5–15 days"} />
              <Stat icon={FileCheck2} label="Validity" value={visa.validity ?? "90 days"} />
              <Stat icon={Briefcase} label="Stay duration" value={visa.stay ?? visa.duration ?? "Up to 30 days"} />
            </div>
          </div>

          <BookingSectionCard title="What you'll need to provide" subtitle="Have these ready before you submit. Our concierge reviews everything.">
            <ul className="space-y-2 text-sm">
              {requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                  <span className="text-foreground">{r}</span>
                </li>
              ))}
            </ul>
          </BookingSectionCard>

          <BookingSectionCard title="How it works">
            <ol className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <Step n={1} title="Submit details" body="Fill in applicant info and pay the fee." />
              <Step n={2} title="Document review" body="Our concierge checks your file and submits." />
              <Step n={3} title="Receive visa" body="We email your e-visa or appointment slip." />
            </ol>
          </BookingSectionCard>

          <ApplicationForm visa={visa} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="text-xs text-muted-foreground">Fee summary</div>
            <div className="mt-1 text-base font-extrabold text-foreground">{visa.name}</div>
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <Row label="Government fee" value={`${currency} ${fee.toFixed(2)}`} />
              <Row label="iSwitch service fee" value={`${currency} ${service.toFixed(2)}`} />
              <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-extrabold text-primary">{currency} {total.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-secondary/60 p-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-bold text-foreground">
                <ScrollText className="h-3 w-3" /> Refund policy
              </span>
              Service fee is non-refundable once concierge review begins.
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

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-extrabold text-foreground">{value}</div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">{n}</div>
      <div className="mt-2 font-bold text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{body}</div>
    </li>
  );
}

function ApplicationForm({ visa }: { visa: any }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference?: string; status?: string } | null>(null);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", passport: "", dob: "", phone: "" });

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
        vertical: "visas",
        provider_slug: visa.provider_slug ?? "travsify",
        amount: Number(visa.price ?? visa.fee ?? 0),
        currency: visa.currency ?? "USD",
        customer_name: `${v.firstName} ${v.lastName}`.trim(),
        customer_email: v.email,
        customer_phone: v.phone,
        payload: {
          visa_id: visa.id,
          applicant: { firstName: v.firstName, lastName: v.lastName, email: v.email, passport: v.passport, dob: v.dob, phone: v.phone },
          country: visa.country,
          type: visa.type,
        },
      });
      if (!res.ok) { setError(res.error); return; }
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SuccessCard
        title="Application submitted!"
        reference={done.reference}
        status={done.status}
        email={v.email}
        backTo="/visas"
        backLabel="Apply for another visa"
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <BookingSectionCard title="Applicant details" subtitle="Enter exactly as on your passport.">
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
          <Field label="Passport number" required>
            <input required value={v.passport} onChange={(e) => set("passport", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Date of birth" required>
            <input required type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} className={inputCls} />
          </Field>
        </div>
      </BookingSectionCard>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      <ConfirmButton submitting={submitting} label="Pay & submit application" />
    </form>
  );
}
