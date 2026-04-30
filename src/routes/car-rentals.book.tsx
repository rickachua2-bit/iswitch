import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  BookingShell, BookingSectionCard, Field, ConfirmButton, TrustStrip, SuccessCard,
  type BookingHeroProps,
} from "@/components/booking/BookingShell";
import { usePriceFormat } from "@/lib/use-price-format";
import {
  Car, Users, Briefcase, Snowflake, MapPin, Clock, ShieldCheck, CheckCircle2, Settings2,
  User, Mail, Phone, Calendar as CalendarIcon, Fuel,
} from "lucide-react";

const searchSchema = z.object({
  car_id: z.coerce.string(),
  pickup_label: z.coerce.string().optional().default(""),
  dropoff_label: z.coerce.string().optional().default(""),
  pickup_date_time: z.coerce.string().optional().default(""),
  dropoff_date_time: z.coerce.string().optional().default(""),
});

export const Route = createFileRoute("/car-rentals/book")({
  head: () => ({
    meta: [
      { title: "Review your car rental — iSwitch Car Rentals" },
      { name: "description", content: "Review your selected car, supplier and total fare before paying." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: CarRentalBookingPage,
});

function CarRentalBookingPage() {
  const { car_id, pickup_label, dropoff_label, pickup_date_time, dropoff_date_time } = Route.useSearch();
  const formatPrice = usePriceFormat();
  const [car, setCar] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { recoverSelectedOffer } = await import("@/lib/select-offer");
      const payload = await recoverSelectedOffer({
        sessionPrefix: "car",
        cachePrefix: "car",
        id: car_id,
      });
      if (!cancelled) {
        setCar(payload);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [car_id]);

  if (loading) {
    return (
      <BookingShell backTo="/car-rentals">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Car className="mx-auto mb-3 h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your selected car…</p>
        </div>
      </BookingShell>
    );
  }
  if (!car) {
    return (
      <BookingShell backTo="/car-rentals">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Reservation session expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please return to car rentals and select your car again.</p>
        </div>
      </BookingShell>
    );
  }

  const total = Number(car.total_price ?? car.daily_price ?? 0);
  const currency = car.currency ?? "USD";

  const hero: BookingHeroProps = {
    vertical: "car_rentals" as any,
    eyebrow: car.carClass ?? "Car rental",
    title: car.name,
    subtitle: `${pickup_label || "Pick-up"} → ${dropoff_label || pickup_label || "Drop-off"}`,
    meta: [
      { icon: CalendarIcon, label: `${pickup_date_time || "Pick-up TBD"}` },
      { icon: CalendarIcon, label: `${dropoff_date_time || "Drop-off TBD"}` },
      { icon: Users, label: `${car.passengers ?? 4} seats` },
    ],
    priceLabel: "Total",
    priceValue: formatPrice(total, currency),
    priceFootnote: car.daily_price ? `${formatPrice(Number(car.daily_price), currency)} per day` : undefined,
    backTo: "/car-rentals",
  };

  return (
    <BookingShell backTo="/car-rentals" hero={hero}>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-24 w-32 flex-none items-center justify-center overflow-hidden rounded-xl bg-secondary">
                {car.image ? (
                  <img src={car.image} alt={car.name} className="h-full w-full object-contain" />
                ) : (
                  <Car className="h-12 w-12 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  {car.carClass ?? "Car rental"}
                </div>
                <h1 className="mt-2 text-2xl font-extrabold text-foreground">{car.name}</h1>
                {car.supplier && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    {car.supplier_logo && <img src={car.supplier_logo} alt={car.supplier} className="h-4" />}
                    <span>Supplier: {car.supplier}</span>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {car.passengers != null && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {car.passengers} seats</span>}
                  {car.bags != null && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {car.bags} bags</span>}
                  {car.transmission && <span className="flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" /> {car.transmission}</span>}
                  {car.air_conditioning && <span className="flex items-center gap-1"><Snowflake className="h-3.5 w-3.5" /> Air-conditioned</span>}
                  {car.mileage && <span className="flex items-center gap-1"><Fuel className="h-3.5 w-3.5" /> {car.mileage}</span>}
                </div>
              </div>
            </div>
          </div>

          <BookingSectionCard title="Your rental">
            <div className="space-y-3">
              <RouteRow label="Pick-up" value={pickup_label || "—"} icon={MapPin} />
              <RouteRow label="Drop-off" value={dropoff_label || pickup_label || "—"} icon={MapPin} />
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Clock} label="Pick-up date/time" value={pickup_date_time || "—"} />
                <Stat icon={Clock} label="Drop-off date/time" value={dropoff_date_time || "—"} />
              </div>
            </div>
          </BookingSectionCard>

          <BookingSectionCard title="What's included">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 text-sm">
              <Inc>Standard supplier insurance</Inc>
              <Inc>Roadside assistance</Inc>
              <Inc>{car.mileage ?? "Mileage as per supplier policy"}</Inc>
              <Inc>{car.cancellation ?? "Free cancellation on most cars"}</Inc>
            </div>
          </BookingSectionCard>

          <DriverForm car={car} pickup_label={pickup_label} dropoff_label={dropoff_label} pickup_date_time={pickup_date_time} dropoff_date_time={dropoff_date_time} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="text-xs text-muted-foreground">Rental summary</div>
            <div className="mt-1 text-base font-extrabold text-foreground">{car.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">{pickup_date_time} → {dropoff_date_time}</div>
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              {car.daily_price != null && <Row label="Daily rate" value={formatPrice(Number(car.daily_price), currency)} />}
              <Row label="Taxes & fees" value="Included" />
              <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-extrabold text-primary">{formatPrice(total, currency)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> Best-rate guarantee
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
      <span>{label}</span><span className="font-semibold text-foreground">{value}</span>
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
function RouteRow({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-primary" />
      <div className="flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value || "—"}</div>
      </div>
    </div>
  );
}
function Inc({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
      <span className="text-foreground">{children}</span>
    </div>
  );
}

function DriverForm({ car, pickup_label, dropoff_label, pickup_date_time, dropoff_date_time }: any) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference?: string; status?: string } | null>(null);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", age: "30" });

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
        vertical: "car_rentals" as any,
        provider_slug: car.provider_slug ?? "priceline",
        amount: Number(car.total_price ?? car.daily_price ?? 0),
        currency: car.currency ?? "USD",
        customer_name: `${v.firstName} ${v.lastName}`.trim(),
        customer_email: v.email,
        customer_phone: v.phone,
        payload: {
          car_id: car.id,
          driver: { firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone, age: Number(v.age) },
          pickup_location: pickup_label,
          dropoff_location: dropoff_label,
          pickup_date_time,
          dropoff_date_time,
        },
      });
      if (!res.ok) { setError(res.error); return; }
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Reservation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SuccessCard
        title="Reservation submitted!"
        reference={done.reference}
        status={done.status}
        email={v.email}
        backTo="/car-rentals"
        backLabel="Book another car"
      />
    );
  }

  return (
    <form onSubmit={submit} className="booking-form space-y-4">
      <BookingSectionCard title="Lead driver details" subtitle="The driver listed here must present a valid licence at pick-up." icon={User}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="First name" required icon={User}>
            <input required value={v.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </Field>
          <Field label="Last name" required icon={User}>
            <input required value={v.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
          <Field label="Email" required icon={Mail}>
            <input required type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Mobile" required icon={Phone}>
            <input required type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234…" />
          </Field>
          <Field label="Driver age" required icon={User}>
            <input required type="number" min={18} max={99} value={v.age} onChange={(e) => set("age", e.target.value)} />
          </Field>
        </div>
      </BookingSectionCard>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      <ConfirmButton submitting={submitting} label="Pay & reserve car" />
    </form>
  );
}
