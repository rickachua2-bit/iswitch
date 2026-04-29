import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  BookingShell, BookingSectionCard, Field, ConfirmButton, TrustStrip, SuccessCard,
  type BookingHeroProps,
} from "@/components/booking/BookingShell";
import { bookTour } from "@/server/travsify";
import { usePriceFormat } from "@/lib/use-price-format";
import {
  Compass, MapPin, Clock, Users, Languages, CheckCircle2, X, Calendar as CalendarIcon, Star,
  User, Mail, Phone, MapPinned,
} from "lucide-react";

const searchSchema = z.object({
  tour_id: z.coerce.string(),
  destination: z.coerce.string().optional().default(""),
  date: z.coerce.string().optional().default(""),
  guests: z.coerce.string().optional().default("2"),
});

export const Route = createFileRoute("/tours/book")({
  head: () => ({
    meta: [
      { title: "Review your experience — iSwitch Tours" },
      { name: "description", content: "Review highlights, inclusions and meeting point before booking your tour." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: TourBookingPage,
});

function pickImages(t: any): string[] {
  const out = new Set<string>();
  const direct = t?.image ?? t?.thumbnail ?? t?.photo ?? t?.cover;
  if (typeof direct === "string" && direct) out.add(direct);
  for (const arr of [t?.images, t?.photos, t?.gallery, t?.media]) {
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (typeof it === "string") out.add(it);
        else if (it && typeof it === "object") {
          const u = it.url ?? it.src ?? it.href;
          if (u) out.add(u);
        }
      }
    }
  }
  return Array.from(out).slice(0, 5);
}

function TourBookingPage() {
  const { tour_id, destination, date, guests } = Route.useSearch();
  const formatPrice = usePriceFormat();
  const [tour, setTour] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { recoverSelectedOffer } = await import("@/lib/select-offer");
      const payload = await recoverSelectedOffer({
        sessionPrefix: "tour",
        cachePrefix: "tour",
        id: tour_id,
      });
      if (!cancelled) {
        setTour(payload);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tour_id]);

  if (loading) {
    return (
      <BookingShell backTo="/tours">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Compass className="mx-auto mb-3 h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your selected experience…</p>
        </div>
      </BookingShell>
    );
  }

  if (!tour) {
    return (
      <BookingShell backTo="/tours">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Compass className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Tour session expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please return to tours and select your experience again.</p>
        </div>
      </BookingShell>
    );
  }

  const images = pickImages(tour);
  const cover = images[0];
  const pax = Math.max(1, Number(guests) || 1);
  const price = Number(tour.price ?? 0);
  const total = price * pax;
  const currency = tour.currency ?? "USD";
  const includes: string[] = tour.includes ?? tour.inclusions ?? [
    "Professional licensed guide",
    "Hotel pickup & drop-off (selected zones)",
    "All entrance fees & taxes",
    "Bottled water during the tour",
  ];
  const excludes: string[] = tour.excludes ?? tour.exclusions ?? [
    "Personal expenses & gratuities",
    "Meals not specified in itinerary",
  ];

  const hero: BookingHeroProps = {
    vertical: "tours",
    eyebrow: "Step 2 of 3",
    title: tour.title,
    subtitle: destination ? `Experience in ${destination}` : undefined,
    meta: [
      { icon: CalendarIcon, label: date || "Date TBD" },
      { icon: Users, label: `${pax} guest${pax > 1 ? "s" : ""}` },
      { icon: Clock, label: tour.duration ?? "Approx. 4 hours" },
    ],
    priceLabel: "Total",
    priceValue: formatPrice(total, currency),
    priceFootnote: `${formatPrice(price, currency)} × ${pax} guest${pax > 1 ? "s" : ""}`,
    backTo: "/tours",
  };

  return (
    <BookingShell backTo="/tours" hero={hero}>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="aspect-[16/9] bg-secondary">
              {cover ? (
                <img src={cover} alt={tour.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-primary">
                  <Compass className="h-14 w-14 text-primary-foreground/70" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-1 p-1">
                {images.slice(1).map((src, i) => (
                  <img key={i} src={src} alt="" className="aspect-[4/3] h-full w-full object-cover" />
                ))}
              </div>
            )}
            <div className="p-5">
              <div className="flex items-center gap-1 text-xs text-primary">
                <MapPin className="h-3 w-3" /> {destination}
              </div>
              <h1 className="mt-1 text-2xl font-extrabold text-foreground">{tour.title}</h1>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {tour.duration ?? "Approx. 4 hours"}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {tour.group_size ?? "Small group · max 12"}</span>
                <span className="flex items-center gap-1"><Languages className="h-3.5 w-3.5" /> {tour.language ?? "English"}</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {tour.rating ?? "4.8"} ({tour.review_count ?? "1,240"} reviews)</span>
              </div>
              {tour.description && <p className="mt-4 text-sm text-muted-foreground">{tour.description}</p>}
            </div>
          </div>

          <BookingSectionCard title="What's included">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {includes.map((it, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                  <span className="text-foreground">{it}</span>
                </div>
              ))}
              {excludes.map((it, i) => (
                <div key={`x-${i}`} className="flex items-start gap-2 text-sm">
                  <X className="mt-0.5 h-4 w-4 flex-none text-destructive" />
                  <span className="text-muted-foreground line-through">{it}</span>
                </div>
              ))}
            </div>
          </BookingSectionCard>

          <BookingSectionCard title="Meeting point & logistics">
            <p className="text-sm text-muted-foreground">
              {tour.meeting_point ?? "Hotel pickup is included from most central districts. After booking, we'll confirm the exact pickup window and address by email."}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" /> Selected date: <span className="font-bold text-foreground">{date || "—"}</span>
            </div>
          </BookingSectionCard>

          <BookingSectionCard title="Cancellation policy">
            <ul className="space-y-1 text-sm text-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" /> Free cancellation up to 24 hours before the experience</li>
              <li className="flex items-start gap-2"><X className="mt-0.5 h-4 w-4 flex-none text-destructive" /> Less than 24 hours: non-refundable</li>
            </ul>
          </BookingSectionCard>

          <ParticipantsForm tour={tour} pax={pax} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {cover && <img src={cover} alt={tour.title} className="h-32 w-full object-cover" />}
            <div className="p-4">
              <div className="text-xs text-muted-foreground">Your booking</div>
              <div className="mt-1 text-base font-extrabold text-foreground">{tour.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{date} · {pax} guest{pax > 1 ? "s" : ""}</div>
              <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
                <Row label={`${formatPrice(price, currency)} × ${pax}`} value={formatPrice(total, currency)} />
                <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-xl font-extrabold text-primary">{formatPrice(total, currency)}</span>
                </div>
              </div>
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

function ParticipantsForm({ tour }: { tour: any; pax: number }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference?: string; status?: string } | null>(null);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", pickup: "" });

  function set<K extends keyof typeof v>(k: K, val: string) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { startCheckout } = await import("@/lib/checkout");
      const unit = Number(tour.price ?? 0);
      const res = await startCheckout({
        vertical: "tours",
        provider_slug: tour.provider_slug ?? "travsify",
        amount: unit,
        currency: tour.currency ?? "USD",
        customer_name: `${v.firstName} ${v.lastName}`.trim(),
        customer_email: v.email,
        customer_phone: v.phone,
        payload: {
          tour_id: tour.id,
          participants: [{ firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone }],
          pickup: v.pickup,
          tour_name: tour.title ?? tour.name,
        },
      });
      if (!res.ok) { setError(res.error); return; }
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SuccessCard
        title="Experience booked!"
        reference={done.reference}
        status={done.status}
        email={v.email}
        backTo="/tours"
        backLabel="Find another experience"
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <BookingSectionCard title="Lead traveller details">
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
        </div>
      </BookingSectionCard>
      <BookingSectionCard title="Pickup location" subtitle="Hotel name and address — leave blank if you'll meet at the start point.">
        <input value={v.pickup} onChange={(e) => set("pickup", e.target.value)} className={inputCls} placeholder="e.g. Atlantis The Palm, Dubai" />
      </BookingSectionCard>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      <ConfirmButton submitting={submitting} label="Pay & confirm experience" />
    </form>
  );
}
