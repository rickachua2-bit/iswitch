import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  BookingShell, BookingSectionCard, Field, ConfirmButton, TrustStrip,
  type BookingHeroProps,
} from "@/components/booking/BookingShell";
import { bookHotel } from "@/server/travsify";
import { getBookingHotelFull } from "@/server/booking.functions";
import type { BookingNormalizedRoom } from "@/server/booking.server";
import { getUserCurrencyCode } from "@/lib/user-currency";
import { usePriceFormat } from "@/lib/use-price-format";
import { HotelGallery } from "@/components/stays/HotelGallery";
import { RoomList } from "@/components/stays/RoomList";
import {
  Star, MapPin, Hotel as HotelIcon, BedDouble, Wifi, Coffee, Waves, Dumbbell,
  Utensils, ParkingCircle, Sparkles, ShieldCheck, Calendar as CalendarIcon, Users,
  CheckCircle2, Tag, User, Mail, Phone, MessageSquare,
} from "lucide-react";

function parseGuests(guests: string): { adults: number; rooms: number } {
  const adults = Number((guests.match(/(\d+)\s*Guest/i) || [])[1]) || 2;
  const rooms = Number((guests.match(/(\d+)\s*Room/i) || [])[1]) || 1;
  return { adults, rooms };
}

function bookingHotelId(hotel: any): string | null {
  const raw = String(hotel?.hotelId ?? hotel?.id ?? hotel?.offer_id ?? "");
  const stripped = raw.startsWith("booking-") ? raw.slice("booking-".length) : raw;
  return stripped || null;
}

const searchSchema = z.object({
  offer_id: z.coerce.string(),
  destination: z.coerce.string().optional().default(""),
  checkIn: z.coerce.string().optional().default(""),
  checkOut: z.coerce.string().optional().default(""),
  guests: z.coerce.string().optional().default("2 Guests, 1 Room"),
});

export const Route = createFileRoute("/stays/book")({
  head: () => ({
    meta: [
      { title: "Review your stay — iSwitch Hotels" },
      { name: "description", content: "Review your hotel, room and price before payment." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  component: HotelBookingPage,
});

function pickImage(h: any): string | null {
  if (!h) return null;
  const direct = h.image ?? h.thumbnail ?? h.photo ?? h.picture ?? h.image_url ?? h.cover;
  if (typeof direct === "string" && direct) return direct;
  for (const arr of [h.images, h.photos, h.gallery, h.pictures, h.media]) {
    if (Array.isArray(arr) && arr.length) {
      const first = arr[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object")
        return first.url ?? first.src ?? first.href ?? first.image ?? null;
    }
  }
  return null;
}

function pickAllImages(h: any): string[] {
  const out = new Set<string>();
  const main = pickImage(h);
  if (main) out.add(main);
  for (const arr of [h.images, h.photos, h.gallery, h.pictures, h.media]) {
    if (Array.isArray(arr)) {
      for (const it of arr) {
        if (typeof it === "string" && it) out.add(it);
        else if (it && typeof it === "object") {
          const u = it.url ?? it.src ?? it.href ?? it.image;
          if (u) out.add(u);
        }
      }
    }
  }
  return Array.from(out).slice(0, 6);
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 1;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

const AMENITIES = [
  { label: "Free Wi-Fi", icon: Wifi },
  { label: "Breakfast available", icon: Coffee },
  { label: "Swimming pool", icon: Waves },
  { label: "Fitness center", icon: Dumbbell },
  { label: "Restaurant on-site", icon: Utensils },
  { label: "Free parking", icon: ParkingCircle },
  { label: "Spa & wellness", icon: Sparkles },
  { label: "24/7 reception", icon: ShieldCheck },
];

function HotelBookingPage() {
  const { offer_id, checkIn, checkOut, guests } = Route.useSearch();
  const navigate = useNavigate();
  const formatPrice = usePriceFormat();

  const [hotel, setHotel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [extraPhotos, setExtraPhotos] = useState<string[]>([]);
  const [rooms, setRooms] = useState<BookingNormalizedRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { recoverSelectedOffer } = await import("@/lib/select-offer");
      const payload = await recoverSelectedOffer({
        sessionPrefix: "hotel",
        cachePrefix: "hotel",
        id: offer_id,
        retries: 5,
        retryDelayMs: 700,
      });
      if (!cancelled) {
        setHotel(payload);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [offer_id]);

  // For Booking.com hotels, pull the FULL gallery + every available room
  // directly from the RapidAPI detail endpoints.
  useEffect(() => {
    if (!hotel) return;
    if (hotel.source !== "booking") return;
    const id = bookingHotelId(hotel);
    const ci = checkIn || hotel.checkIn || "";
    const co = checkOut || hotel.checkOut || "";
    if (!id || !ci || !co) return;
    const { adults, rooms: roomQty } = parseGuests(guests || hotel.guests || "2 Guests, 1 Room");
    const currency = (hotel.currency || getUserCurrencyCode() || "USD").toUpperCase();
    let cancelled = false;
    setRoomsLoading(true);
    getBookingHotelFull({
      data: { hotelId: id, checkin: ci, checkout: co, adults, rooms: roomQty, currency },
    })
      .then((res) => {
        if (cancelled) return;
        if (res.photos?.length) setExtraPhotos(res.photos);
        if (res.rooms?.length) setRooms(res.rooms);
      })
      .catch(() => { /* graceful fallback to cached payload */ })
      .finally(() => { if (!cancelled) setRoomsLoading(false); });
    return () => { cancelled = true; };
  }, [hotel, checkIn, checkOut, guests]);

  if (loading) {
    return (
      <BookingShell backTo="/stays">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <HotelIcon className="mx-auto mb-3 h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading your selected hotel…</p>
        </div>
      </BookingShell>
    );
  }

  if (!hotel) {
    return (
      <BookingShell backTo="/stays">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <HotelIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <h1 className="text-xl font-bold">Booking session expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please return to results and select your hotel again.
          </p>
        </div>
      </BookingShell>
    );
  }

  const images = pickAllImages(hotel);
  const cover = images[0];
  // Fall back to values stored inside the cached hotel payload when URL params are missing
  const effCheckIn = checkIn || hotel.checkIn || "";
  const effCheckOut = checkOut || hotel.checkOut || "";
  const effGuests = guests || hotel.guests || "2 Guests, 1 Room";
  const nights = nightsBetween(effCheckIn, effCheckOut);
  const pricePerNight = Number(hotel.price ?? 0);
  const subtotal = pricePerNight * nights;
  const taxes = Math.round(subtotal * 0.1 * 100) / 100;
  const total = subtotal + taxes;
  const currency = hotel.currency ?? "USD";
  const score = Number(hotel.review_score ?? hotel.score ?? 8.6);

  const hero: BookingHeroProps = {
    vertical: "stays",
    eyebrow: "Step 2 of 3",
    title: hotel.name,
    subtitle: hotel.address ?? hotel.location ?? "City center",
    meta: [
      { icon: CalendarIcon, label: `${effCheckIn || "—"} → ${effCheckOut || "—"}` },
      { icon: Users, label: effGuests },
      { icon: BedDouble, label: `${nights} night${nights > 1 ? "s" : ""}` },
    ],
    priceLabel: `Total for ${nights} night${nights > 1 ? "s" : ""}`,
    priceValue: formatPrice(total, currency),
    priceFootnote: `${formatPrice(pricePerNight, currency)} / night incl. taxes`,
    backTo: "/stays",
  };

  return (
    <BookingShell backTo="/stays" hero={hero}>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Header card with gallery */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="grid grid-cols-1 gap-1 md:grid-cols-4">
              <div className="md:col-span-3 aspect-[16/10] bg-secondary md:aspect-auto md:h-80">
                {cover ? (
                  <img src={cover} alt={hotel.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-primary">
                    <HotelIcon className="h-14 w-14 text-primary-foreground/70" />
                  </div>
                )}
              </div>
              <div className="hidden grid-rows-3 gap-1 md:grid">
                {images.slice(1, 4).map((src, i) => (
                  <img key={i} src={src} alt={`${hotel.name} ${i + 2}`} className="h-full w-full object-cover" />
                ))}
                {Array.from({ length: Math.max(0, 3 - Math.max(0, images.length - 1)) }).map((_, i) => (
                  <div key={`ph-${i}`} className="bg-secondary" />
                ))}
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-1 text-accent-foreground">
                {Array.from({ length: Number(hotel.stars) || 0 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                ))}
              </div>
              <h1 className="mt-1 text-2xl font-extrabold text-foreground">{hotel.name}</h1>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {hotel.address ?? hotel.location ?? "City center"}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1.5 text-xs">
                <span className="rounded bg-primary px-2 py-0.5 font-extrabold text-primary-foreground">
                  {score.toFixed(1)}
                </span>
                <span className="font-bold text-foreground">
                  {score >= 9 ? "Exceptional" : score >= 8 ? "Excellent" : "Very good"}
                </span>
                <span className="text-muted-foreground">· Verified guest reviews</span>
              </div>
            </div>
          </div>

          {/* Stay details */}
          <BookingSectionCard title="Your stay" subtitle={`${nights} night${nights > 1 ? "s" : ""} · ${effGuests}`}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Stat icon={CalendarIcon} label="Check-in" value={effCheckIn || "—"} sub="From 3:00 PM" />
              <Stat icon={CalendarIcon} label="Check-out" value={effCheckOut || "—"} sub="Until 12:00 PM" />
              <Stat icon={Users} label="Guests" value={effGuests} sub="1 room" />
            </div>
            <div className="mt-4 rounded-lg bg-secondary/60 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <BedDouble className="h-4 w-4 text-primary" />
                {hotel.room_name ?? "Standard double room"}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Free Wi-Fi</span>
                <span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> Breakfast available</span>
                <span className="flex items-center gap-1 text-primary"><ShieldCheck className="h-3 w-3" /> Free cancellation until 48h before</span>
              </div>
            </div>
          </BookingSectionCard>

          {/* Amenities */}
          <BookingSectionCard title="What this property offers">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {AMENITIES.map((a) => (
                <div key={a.label} className="flex items-center gap-2 text-sm text-foreground">
                  <a.icon className="h-4 w-4 text-primary" /> {a.label}
                </div>
              ))}
            </div>
          </BookingSectionCard>

          {/* Policies */}
          <BookingSectionCard title="House rules & policies">
            <ul className="space-y-2 text-sm text-foreground">
              <Policy>Check-in from 3:00 PM · Check-out by 12:00 PM</Policy>
              <Policy>Free cancellation up to 48 hours before arrival</Policy>
              <Policy>Government-issued photo ID required at check-in</Policy>
              <Policy>Children of all ages are welcome · Cribs on request</Policy>
              <Policy>No smoking inside rooms · Pets not allowed</Policy>
            </ul>
          </BookingSectionCard>

          {/* Form */}
          <BookingForm hotel={{ ...hotel, checkIn: effCheckIn, checkOut: effCheckOut, guests: effGuests }} navigate={navigate} />
        </div>

        {/* Right: sticky price summary */}
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            {cover && <img src={cover} alt={hotel.name} className="h-32 w-full object-cover" />}
            <div className="p-4">
              <div className="text-xs text-muted-foreground">Your booking</div>
              <div className="mt-1 text-base font-extrabold text-foreground">{hotel.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {effCheckIn} → {effCheckOut} · {nights} night{nights > 1 ? "s" : ""}
              </div>

              <div className="mt-4 rounded-lg bg-secondary/60 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Daily rate</span>
                  <span className="text-base font-extrabold text-primary">
                    {formatPrice(pricePerNight, currency)}
                    <span className="ml-1 text-[11px] font-semibold text-muted-foreground">/ night</span>
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                <Row
                  label={`${formatPrice(pricePerNight, currency)} × ${nights} night${nights > 1 ? "s" : ""}`}
                  value={formatPrice(subtotal, currency)}
                />
                <Row label="Taxes & fees (est.)" value={formatPrice(taxes, currency)} />
                <div className="flex items-center justify-between border-t border-border pt-3 text-base">
                  <span className="font-bold text-foreground">
                    Total for {nights} night{nights > 1 ? "s" : ""}
                  </span>
                  <span className="text-xl font-extrabold text-primary">{formatPrice(total, currency)}</span>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="flex items-center gap-1 font-bold"><Tag className="h-3 w-3" /> Best price guarantee</span>
                Found it cheaper elsewhere? We'll match it.
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

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 text-sm font-extrabold text-foreground">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Policy({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
      <span className="text-foreground">{children}</span>
    </li>
  );
}

function BookingForm({ hotel }: { hotel: any; navigate: any }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", requests: "" });

  function set<K extends keyof typeof v>(k: K, val: string) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { startCheckout } = await import("@/lib/checkout");
      const nights = nightsBetween(
        (hotel.checkIn ?? "") as string,
        (hotel.checkOut ?? "") as string
      );
      const pricePerNight = Number(hotel.price ?? 0);
      const subtotal = pricePerNight * nights;
      const taxes = Math.round(subtotal * 0.1 * 100) / 100;
      const total = subtotal + taxes;

      const res = await startCheckout({
        vertical: "stays",
        provider_slug: hotel.provider_slug ?? "liteapi",
        amount: total,
        currency: hotel.currency ?? "USD",
        customer_name: `${v.firstName} ${v.lastName}`.trim(),
        customer_email: v.email,
        customer_phone: v.phone,
        payload: {
          lite_rate_id: hotel.rate_id ?? hotel.offer_id ?? hotel.id,
          holder: { firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone },
          guests: [{ firstName: v.firstName, lastName: v.lastName }],
          requests: v.requests,
          hotel_name: hotel.name,
          hotel_id: hotel.hotelId ?? hotel.id,
        },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Checkout failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="booking-form space-y-4">
      <BookingSectionCard title="Lead guest details" subtitle="Enter the primary guest's information for the reservation." icon={User}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="First name" required icon={User}>
            <input required value={v.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jane" />
          </Field>
          <Field label="Last name" required icon={User}>
            <input required value={v.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Doe" />
          </Field>
          <Field label="Email" required icon={Mail}>
            <input required type="email" value={v.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
          </Field>
          <Field label="Phone (with country code)" required icon={Phone}>
            <input required type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+2348012345678" />
          </Field>
        </div>
      </BookingSectionCard>
      <BookingSectionCard title="Special requests" subtitle="Optional — the property will do their best to accommodate." icon={MessageSquare}>
        <textarea
          value={v.requests}
          onChange={(e) => set("requests", e.target.value)}
          className="min-h-[88px]"
          placeholder="Late check-in, high floor, twin beds…"
        />
      </BookingSectionCard>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
      )}
      <ConfirmButton submitting={submitting} label="Continue to secure payment" />
    </form>
  );
}
