import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  BookingShell, SectionCard, Field, inputCls, ConfirmButton, TrustStrip, SuccessCard,
} from "@/components/booking/BookingShell";
import { bookTransfer } from "@/server/travsify";
import {
  Car, Users, Briefcase, Snowflake, MapPin, Clock, ShieldCheck, CheckCircle2, Plane, Phone,
} from "lucide-react";

const searchSchema = z.object({
  vehicle_id: z.coerce.string(),
  pickup: z.coerce.string().optional().default(""),
  drop: z.coerce.string().optional().default(""),
  date: z.coerce.string().optional().default(""),
  time: z.coerce.string().optional().default(""),
});

export const Route = createFileRoute("/pickups/book")({
  head: () => ({
    meta: [
      { title: "Review your transfer — iSwitch Pickups" },
      { name: "description", content: "Review your vehicle, route and pickup details before paying." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: TransferBookingPage,
});

function TransferBookingPage() {
  const { vehicle_id, pickup, drop, date, time } = Route.useSearch();
  const [vehicle, setVehicle] = useState<any | null>(null);

  useEffect(() => {
    try {
      const o = sessionStorage.getItem(`vehicle:${vehicle_id}`);
      if (o) setVehicle(JSON.parse(o));
    } catch {}
  }, [vehicle_id]);

  if (!vehicle) {
    return (
      <BookingShell backTo="/pickups">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Transfer session expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please return to transfers and select your vehicle again.</p>
        </div>
      </BookingShell>
    );
  }

  const price = Number(vehicle.price ?? 0);
  const currency = vehicle.currency ?? "USD";

  return (
    <BookingShell backTo="/pickups">
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-28 flex-none items-center justify-center rounded-xl bg-secondary">
                {vehicle.image ? (
                  <img src={vehicle.image} alt="" className="h-full w-full rounded-xl object-cover" />
                ) : (
                  <Car className="h-10 w-10 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                  Private transfer
                </div>
                <h1 className="mt-2 text-2xl font-extrabold text-foreground">{vehicle.name ?? vehicle.type ?? "Vehicle"}</h1>
                <div className="mt-1 text-sm text-muted-foreground">
                  {vehicle.description ?? vehicle.desc ?? "Door-to-door transfer with a professional driver."}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {vehicle.passengers ?? vehicle.pax ?? 3} passengers</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {vehicle.bags ?? 2} bags</span>
                  <span className="flex items-center gap-1"><Snowflake className="h-3.5 w-3.5" /> Air-conditioned</span>
                  <span className="flex items-center gap-1"><Plane className="h-3.5 w-3.5" /> Flight tracking</span>
                </div>
              </div>
            </div>
          </div>

          <SectionCard title="Your route">
            <div className="space-y-3">
              <RouteRow label="Pickup" value={pickup} icon={MapPin} />
              <RouteRow label="Drop-off" value={drop} icon={MapPin} />
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={Clock} label="Date" value={date || "—"} />
                <Stat icon={Clock} label="Time" value={time || "12:00"} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="What's included">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 text-sm">
              <Inc>Meet & greet by name board</Inc>
              <Inc>Free 60 min waiting time at airport</Inc>
              <Inc>All taxes, tolls and fuel</Inc>
              <Inc>English-speaking professional driver</Inc>
              <Inc>Free cancellation up to 24h before pickup</Inc>
              <Inc>24/7 customer support hotline</Inc>
            </div>
          </SectionCard>

          <SectionCard title="Driver assignment">
            <p className="text-sm text-muted-foreground">
              Your driver's name, photo and phone number will be sent by email and SMS
              <strong className="text-foreground"> 24 hours before pickup</strong>. They'll
              monitor your flight and adjust the pickup time automatically if needed.
            </p>
          </SectionCard>

          <PassengerForm vehicle={vehicle} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="text-xs text-muted-foreground">Trip summary</div>
            <div className="mt-1 text-base font-extrabold text-foreground">{vehicle.name ?? vehicle.type ?? "Vehicle"}</div>
            <div className="mt-1 text-xs text-muted-foreground">{date} · {time || "12:00"}</div>
            <div className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
              <Row label="Vehicle fare" value={`${currency} ${price.toFixed(2)}`} />
              <Row label="Tolls & fees" value="Included" />
              <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-extrabold text-primary">{currency} {price.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-3 w-3" /> Fixed price · no surge
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

function PassengerForm({ vehicle }: { vehicle: any }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference?: string; status?: string } | null>(null);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", flight: "", notes: "" });

  function set<K extends keyof typeof v>(k: K, val: string) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await bookTransfer({
        data: {
          vehicle_id: vehicle.id,
          passenger: { firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone },
        },
      });
      setDone({ reference: res?.data?.reference, status: res?.data?.status ?? "confirmed" });
    } catch (err: any) {
      setError(err?.message ?? "Booking failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SuccessCard
        title="Transfer booked!"
        reference={done.reference}
        status={done.status}
        email={v.email}
        backTo="/pickups"
        backLabel="Book another transfer"
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <SectionCard title="Lead passenger details">
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
          <Field label="Mobile (used by driver)" required>
            <input required type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+234…" />
          </Field>
        </div>
      </SectionCard>
      <SectionCard title="Flight details (recommended)" subtitle="So your driver can track delays automatically.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Flight number">
            <input value={v.flight} onChange={(e) => set("flight", e.target.value)} className={inputCls} placeholder="e.g. EK783" />
          </Field>
          <Field label="Driver instructions">
            <input value={v.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} placeholder="Child seat, large luggage…" />
          </Field>
        </div>
      </SectionCard>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
      <ConfirmButton submitting={submitting} label="Pay & confirm transfer" />
    </form>
  );
}
