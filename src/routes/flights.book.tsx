import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft, Plane, ShieldCheck, CreditCard, Lock,
  Briefcase, Luggage, Loader2, Clock, Calendar as CalendarIcon, Users,
} from "lucide-react";
import { bookFlight } from "@/server/travsify";
import { usePriceFormat } from "@/lib/use-price-format";
import { FareAndTransitRules } from "@/components/flights/FareAndTransitRules";
import {
  BookingShell, SectionCard, Field, ConfirmButton, type BookingHeroProps,
} from "@/components/booking/BookingShell";

const bookSchema = z.object({
  offer_id: z.string(),
  fare_id: z.string().optional(),
});

export const Route = createFileRoute("/flights/book")({
  head: () => ({
    meta: [
      { title: "Complete your booking — iSwitch Flights" },
      { name: "description", content: "Enter passenger details and complete your flight booking securely." },
    ],
  }),
  validateSearch: (s) => bookSchema.parse(s),
  component: BookingPage,
});

/* ------------ helpers (mirrors result card) ------------ */

function fmtTime(iso?: string) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(11, 16) || "--:--";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}
function parseDuration(d?: string | number): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}
function fmtDuration(min: number) {
  if (!min) return "--";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
function currencySymbol(cur: string) {
  const c = (cur || "USD").toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  if (c === "NGN") return "₦";
  return c + " ";
}

/* ------------ page ------------ */

function BookingPage() {
  const { offer_id, fare_id } = Route.useSearch();
  const navigate = useNavigate();

  const [offer, setOffer] = useState<any | null>(null);
  const [fare, setFare] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Try sessionStorage first (fastest, same-tab path)
      try {
        const o = sessionStorage.getItem(`offer:${offer_id}`);
        if (o) {
          const parsed = JSON.parse(o);
          if (!cancelled) setOffer(parsed);
          if (fare_id) {
            const f = sessionStorage.getItem(`fare:${offer_id}:${fare_id}`);
            if (f && !cancelled) setFare(JSON.parse(f));
          }
          if (!cancelled) setLoading(false);
          return;
        }
      } catch { /* ignore */ }

      // 2. Fall back to server-persisted cache (survives refresh / redirects).
      // Retry once after a short delay to cover the race where saveOffer is
      // still in-flight at the moment the booking page mounts.
      const { getOffer } = await import("@/server/offer-cache.functions");
      for (let attempt = 0; attempt < 2 && !cancelled; attempt++) {
        try {
          const res = await getOffer({ data: { id: `flight:${offer_id}` } });
          if (!cancelled && res.ok) {
            const p: any = res.payload;
            setOffer(p?.offer ?? null);
            if (fare_id && p?.fares?.[fare_id]) setFare(p.fares[fare_id]);
            break;
          }
        } catch { /* ignore */ }
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [offer_id, fare_id]);

  if (loading) {
    return (
      <BookingShell backTo="/flights">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your selected flight…</p>
        </div>
      </BookingShell>
    );
  }

  if (!offer) {
    return (
      <BookingShell backTo="/flights">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Plane className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold text-foreground">Booking session expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please return to the flight results and select your fare again.
          </p>
          <Link
            to="/flights"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-glow"
          >
            <ArrowLeft className="h-4 w-4" /> Back to flights
          </Link>
        </div>
      </BookingShell>
    );
  }

  // Derive hero summary from offer
  const slices: any[] = offer?.slices ?? offer?.itineraries ?? [];
  const firstSlice = slices[0];
  const segs = firstSlice?.segments ?? [];
  const firstSeg = segs[0];
  const lastSeg = segs[segs.length - 1];
  const oCode = firstSeg?.origin?.iata_code ?? firstSlice?.origin?.iata_code ?? firstSlice?.origin ?? "—";
  const dCode = lastSeg?.destination?.iata_code ?? firstSlice?.destination?.iata_code ?? firstSlice?.destination ?? "—";
  const carrier = firstSeg?.marketing_carrier?.name ?? firstSeg?.marketing_carrier?.iata_code ?? offer?.owner?.name ?? "Airline";
  const totalAmount = Number(fare?.total_amount ?? offer?.total_amount ?? offer?.price ?? 0);
  const currency = fare?.total_currency ?? offer?.total_currency ?? offer?.currency ?? "USD";
  const sym = currencySymbol(currency);
  const heroDate = fmtDate(firstSeg?.departing_at);
  const tripType = slices.length > 1 ? "Round-trip" : "One-way";

  const hero: BookingHeroProps = {
    vertical: "flights",
    eyebrow: tripType,
    title: `${oCode} → ${dCode}`,
    subtitle: carrier,
    meta: [
      heroDate ? { icon: CalendarIcon, label: heroDate } : null,
      { icon: Users, label: "1 adult" },
      fare?.name ? { icon: Briefcase, label: `${fare.name} fare` } : null,
    ].filter(Boolean) as BookingHeroProps["meta"],
    priceLabel: "Total fare",
    priceValue: `${sym}${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    priceFootnote: "All taxes & airline fees included",
    backTo: "/flights",
  };

  return (
    <BookingShell backTo="/flights" hero={hero}>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
        <BookingForm offer={offer} fare={fare} navigate={navigate} />
        <PriceSummary offer={offer} fare={fare} />
      </main>
    </BookingShell>
  );
}

/* ------------ left column: forms ------------ */

function BookingForm({ offer, fare, navigate }: { offer: any; fare: any; navigate: any }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference?: string; status?: string } | null>(null);

  const [pax, setPax] = useState({
    title: "mr",
    given_name: "",
    family_name: "",
    born_on: "",
    gender: "m",
    email: "",
    phone_number: "",
    nationality: "",
  });

  function update<K extends keyof typeof pax>(k: K, v: string) {
    setPax((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { startCheckout } = await import("@/lib/checkout");
      const total = Number(fare?.total_amount ?? offer?.total_amount ?? offer?.price ?? 0);
      const currency = fare?.total_currency ?? offer?.total_currency ?? offer?.currency ?? "USD";
      const res = await startCheckout({
        vertical: "flights",
        provider_slug: "duffel",
        amount: total,
        currency,
        customer_name: `${pax.given_name} ${pax.family_name}`.trim(),
        customer_email: pax.email,
        customer_phone: pax.phone_number,
        payload: {
          duffel_offer_id: offer.id,
          fare_id: fare?.id ?? null,
          passengers: [pax],
          slices: offer?.slices ?? [],
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.checkoutUrl;
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return null;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FlightSummaryCard offer={offer} fare={fare} />

      <FareAndTransitRules offer={offer} fare={fare} />

      <SectionCard
        title="Passenger details"
        subtitle="Enter the lead traveller's information exactly as on their passport."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Title">
            <select
              value={pax.title}
              onChange={(e) => update("title", e.target.value)}
              className="form-input"
            >
              <option value="mr">Mr</option>
              <option value="mrs">Mrs</option>
              <option value="ms">Ms</option>
              <option value="mstr">Master</option>
            </select>
          </Field>
          <Field label="Gender">
            <select
              value={pax.gender}
              onChange={(e) => update("gender", e.target.value)}
              className="form-input"
            >
              <option value="m">Male</option>
              <option value="f">Female</option>
            </select>
          </Field>
          <Field label="First name (given names)" required>
            <input
              required
              value={pax.given_name}
              onChange={(e) => update("given_name", e.target.value)}
              className="form-input"
              placeholder="As on passport"
            />
          </Field>
          <Field label="Last name (surname)" required>
            <input
              required
              value={pax.family_name}
              onChange={(e) => update("family_name", e.target.value)}
              className="form-input"
              placeholder="As on passport"
            />
          </Field>
          <Field label="Date of birth" required>
            <input
              required
              type="date"
              value={pax.born_on}
              onChange={(e) => update("born_on", e.target.value)}
              className="form-input"
            />
          </Field>
          <Field label="Nationality">
            <input
              value={pax.nationality}
              onChange={(e) => update("nationality", e.target.value)}
              className="form-input"
              placeholder="e.g. Nigerian"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Contact information"
        subtitle="We'll send your e-ticket and any flight updates here."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Email" required>
            <input
              required
              type="email"
              value={pax.email}
              onChange={(e) => update("email", e.target.value)}
              className="form-input"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Phone number" required>
            <input
              required
              value={pax.phone_number}
              onChange={(e) => update("phone_number", e.target.value)}
              className="form-input"
              placeholder="+2348012345678"
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Add-ons"
        subtitle="Optional protections — you can also add these after checkout."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Addon
            icon={ShieldCheck}
            title="Travel insurance"
            description="Cancellations, delays and medical cover from $12"
          />
          <Addon
            icon={Briefcase}
            title="Extra checked bag"
            description="Add a 23 kg bag for a discounted rate at checkout"
          />
        </div>
      </SectionCard>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-card transition hover:bg-primary-glow disabled:cursor-wait disabled:opacity-80"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Confirming your booking…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" /> Confirm and pay
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          By continuing you agree to iSwitch's terms & the airline's fare rules.
        </p>
      </div>
    </form>
  );
}

/* ------------ small UI primitives ------------ */

function SectionCard({
  title, subtitle, children,
}: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-5">
      <div className="mb-3">
        <div className="text-sm font-bold text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </div>
      {children}
    </label>
  );
}

function Addon({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
        on ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <Icon className="mt-0.5 h-5 w-5 text-primary" />
      <div className="flex-1">
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div
        className={`mt-1 h-4 w-4 rounded-full border ${
          on ? "border-primary bg-primary" : "border-border"
        }`}
      />
    </button>
  );
}

/* ------------ flight summary inside form column ------------ */

function FlightSummaryCard({ offer, fare }: { offer: any; fare: any }) {
  const slices: any[] = offer?.slices ?? offer?.itineraries ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-bold text-foreground">Your flight</div>
        {fare && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {fare.name} fare
          </span>
        )}
      </div>
      <div className="space-y-3">
        {slices.map((s: any, i: number) => (
          <SliceLine key={i} slice={s} />
        ))}
      </div>
      {fare && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <Tag icon={Luggage}>{fare.carryOn}</Tag>
          <Tag icon={Briefcase}>{fare.checked}</Tag>
          <Tag icon={Clock}>{fare.changeable}</Tag>
          <Tag icon={ShieldCheck}>{fare.refundable}</Tag>
        </div>
      )}
    </div>
  );
}

function Tag({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1">
      <Icon className="h-3 w-3 text-primary" /> {children}
    </span>
  );
}

function SliceLine({ slice }: { slice: any }) {
  const segs = slice?.segments ?? [];
  const first = segs[0];
  const last = segs[segs.length - 1];
  const stops = Math.max(0, segs.length - 1);
  const duration =
    parseDuration(slice.duration) || segs.reduce((s: number, x: any) => s + parseDuration(x.duration), 0);
  const oCode = first?.origin?.iata_code ?? slice.origin?.iata_code ?? slice.origin ?? "---";
  const dCode = last?.destination?.iata_code ?? slice.destination?.iata_code ?? slice.destination ?? "---";

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      <Plane className="h-4 w-4 text-primary" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          <div className="text-base font-extrabold text-foreground">{fmtTime(first?.departing_at)}</div>
          <div className="text-[11px] text-muted-foreground">{oCode} · {fmtDate(first?.departing_at)}</div>
        </div>
        <div className="px-1 text-center">
          <div className="text-[11px] font-bold text-muted-foreground">{fmtDuration(duration)}</div>
          <div className="my-1 h-px w-16 bg-border" />
          <div className="text-[10px] font-semibold text-muted-foreground">
            {stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-extrabold text-foreground">{fmtTime(last?.arriving_at)}</div>
          <div className="text-[11px] text-muted-foreground">{dCode} · {fmtDate(last?.arriving_at)}</div>
        </div>
      </div>
      <div className="hidden text-right text-[11px] text-muted-foreground md:block">
        {(first?.marketing_carrier?.iata_code ?? "")} {first?.flight_number ?? ""}
      </div>
    </div>
  );
}

/* ------------ right column: sticky price summary ------------ */

function PriceSummary({ offer, fare }: { offer: any; fare: any }) {
  const formatPrice = usePriceFormat();

  const baseAmount = Number(
    fare?.price ?? offer?.total_amount ?? offer?.price?.total ?? 0,
  );
  const cur =
    fare?.currency ?? offer?.total_currency ?? offer?.price?.currency ?? "USD";

  const breakdown = useMemo(() => {
    // Trip.com style breakdown — derive components if API didn't return one.
    const provBase = Number(
      offer?.price_breakdown?.provider_base ?? offer?.base_amount ?? baseAmount * 0.85,
    );
    const taxes = Math.max(0, baseAmount - provBase);
    return { fareTotal: provBase, taxes, total: baseAmount };
  }, [offer, baseAmount]);

  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border p-4">
          <div className="text-sm font-bold text-foreground">Price details</div>
          <div className="text-[11px] text-muted-foreground">For 1 adult</div>
        </div>
        <div className="space-y-2 px-4 py-3 text-sm">
          <Row label="Base fare" value={formatPrice(breakdown.fareTotal, cur)} />
          <Row label="Taxes & fees" value={formatPrice(breakdown.taxes, cur)} />
          <Row label="Service fee" value="Included" muted />
        </div>
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold text-foreground">Total</span>
            <span className="text-2xl font-extrabold text-primary">
              {formatPrice(breakdown.total, cur)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Includes all taxes & airline fees
          </div>
        </div>

        <div className="space-y-2 border-t border-border bg-secondary/30 p-4 text-[11px] text-muted-foreground">
          <div className="flex items-start gap-2">
            <Lock className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            <span>Secure payment — your data is encrypted end-to-end.</span>
          </div>
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            <span>Best price guarantee — refund the difference within 24h.</span>
          </div>
          <div className="flex items-start gap-2">
            <CreditCard className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            <span>We accept Visa, Mastercard, Verve & bank transfer.</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-semibold text-foreground"}>
        {value}
      </span>
    </div>
  );
}
