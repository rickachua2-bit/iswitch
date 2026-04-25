import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BookingDialog } from "@/components/BookingDialog";
import { searchHotels, bookHotel } from "@/server/travsify";
import { usePriceFormat } from "@/lib/use-price-format";
import {
  Star, Loader2, MapPin, ThumbsUp, Heart, Tag, Search,
  Hotel, Plane, Home as HomeIcon, Briefcase, Compass, Car,
  Calendar as CalendarIcon, Users, Plus, ChevronDown, Check,
  Wifi, Coffee, Dumbbell, Waves, Utensils, ParkingCircle,
  BedDouble, Sparkles, ShieldCheck, Flame,
} from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import dubai from "@/assets/dest-dubai.jpg";
import london from "@/assets/dest-london.jpg";
import paris from "@/assets/dest-paris.jpg";
import newyork from "@/assets/dest-newyork.jpg";
import tokyo from "@/assets/dest-tokyo.jpg";

const searchSchema = z.object({
  destination: z.string().optional().default("Dubai"),
  checkIn: z.string().optional().default(""),
  checkOut: z.string().optional().default(""),
  guests: z.string().optional().default("2 Guests, 1 Room"),
});

const CITY_TO_CC: Record<string, string> = {
  dubai: "AE", "abu dhabi": "AE", paris: "FR", london: "GB", "new york": "US", tokyo: "JP",
  lagos: "NG", abuja: "NG", istanbul: "TR", rome: "IT", barcelona: "ES", madrid: "ES",
  bangkok: "TH", singapore: "SG", "kuala lumpur": "MY", nairobi: "KE", "cape town": "ZA",
  johannesburg: "ZA", accra: "GH", cairo: "EG", toronto: "CA", sydney: "AU", berlin: "DE",
};

function guessCC(s: string) {
  const k = s.trim().toLowerCase();
  if (CITY_TO_CC[k]) return CITY_TO_CC[k];
  if (/^[a-z]{2}$/i.test(s.trim())) return s.trim().toUpperCase();
  return "AE";
}

function adultsFromGuests(s: string) {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 2;
}

export const Route = createFileRoute("/stays")({
  head: () => ({
    meta: [
      { title: "Hotels & Homes — See the world for less | iSwitch" },
      { name: "description", content: "Compare 2M+ hotels, apartments and homes worldwide. Real-time prices, instant confirmation, free cancellation on most rooms." },
      { property: "og:title", content: "Hotels & Homes | iSwitch" },
      { property: "og:description", content: "Find your next stay with confidence — best price guarantee on every booking." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.checkIn || !deps.checkOut) return { hotels: [], query: deps, error: null as string | null };
    try {
      const res = await searchHotels({
        data: {
          country_code: guessCC(deps.destination),
          checkin: deps.checkIn,
          checkout: deps.checkOut,
          adults: adultsFromGuests(deps.guests),
          currency: "USD",
        },
      });
      return { hotels: res?.data?.hotels ?? [], query: deps, error: null };
    } catch (e: any) {
      return { hotels: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: StaysPage,
});

const TABS = [
  { id: "stays", label: "Hotels", icon: Hotel, route: "/stays" as const, active: true },
  { id: "flights", label: "Flights", icon: Plane, route: "/flights" as const },
  { id: "homes", label: "Homes & Apts", icon: HomeIcon, route: "/stays" as const },
  { id: "package", label: "Flight + Hotel", icon: Briefcase, route: "/flights" as const },
  { id: "tours", label: "Activities", icon: Compass, route: "/tours" as const },
  { id: "pickups", label: "Airport transfer", icon: Car, route: "/pickups" as const },
];

const TOP_DESTINATIONS = [
  { city: "Dubai", country: "United Arab Emirates", img: dubai, count: "12,408" },
  { city: "London", country: "United Kingdom", img: london, count: "9,114" },
  { city: "Paris", country: "France", img: paris, count: "8,275" },
  { city: "New York", country: "United States", img: newyork, count: "3,049" },
  { city: "Tokyo", country: "Japan", img: tokyo, count: "5,116" },
];

const PROMO_TILES = [
  { tag: "Limited deal", title: "Up to 30% off", subtitle: "Citywide hotel sale" },
  { tag: "Worldwide", title: "Last-minute escapes", subtitle: "Book today, leave tomorrow" },
  { tag: "New", title: "Member rewards", subtitle: "Up to 20% bonus on app" },
];

function StaysPage() {
  const { hotels, query, error } = Route.useLoaderData() as any;
  const [selected, setSelected] = useState<any | null>(null);
  const formatPrice = usePriceFormat();
  const navigate = useNavigate();
  const hasSearched = !!(query.checkIn && query.checkOut);

  // Search form local state — seeded from URL
  const [destination, setDestination] = useState(query.destination ?? "Dubai");
  const [checkIn, setCheckIn] = useState(query.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(query.checkOut ?? "");
  const [guests, setGuests] = useState(query.guests ?? "2 Guests, 1 Room");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/stays", search: { destination, checkIn, checkOut, guests } });
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />

      {/* Agoda-style hero — pale brand tint with white search card on top */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-primary via-primary-glow to-primary-glow/60 pb-32 pt-10 md:pb-40">
        {/* soft top vignette */}
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,oklch(1_0_0/0.18),transparent_60%)]" />

        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.18em] text-primary-foreground drop-shadow md:text-3xl">
            See the world for less
          </h1>
        </div>

        {/* White search card — tabs INSIDE the card */}
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="rounded-3xl bg-card shadow-elevated">
            {/* Tab strip inside the card (Agoda style) */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border px-2 pt-1 scrollbar-hide md:gap-0 md:px-4">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <Link
                    key={t.id}
                    to={t.route}
                    {...(t.route === "/stays"
                      ? { search: { destination, checkIn, checkOut, guests } }
                      : {})}
                    className={`flex min-w-fit items-center gap-1.5 px-3 py-3 text-sm font-semibold transition md:px-5 md:py-4 ${
                      t.active
                        ? "border-b-2 border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                    <span className="whitespace-nowrap">{t.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Form body */}
            <form onSubmit={onSubmit} className="p-4 md:p-5">
              {/* Destination — full-width row like Agoda */}
              <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Enter a destination or property"
                  className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </label>

              {/* Dates + guests row */}
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1.2fr]">
                <DateField icon={CalendarIcon} label="Check-in" value={checkIn} onChange={setCheckIn} />
                <DateField icon={CalendarIcon} label="Check-out" value={checkOut} onChange={setCheckOut} />
                <label className="flex flex-col gap-0.5 rounded-xl border border-border bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Users className="h-3 w-3" /> Guests / Rooms
                  </span>
                  <input
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none"
                  />
                </label>
              </div>

              {/* Add a flight inline link (Agoda) */}
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add a flight
              </button>

              {/* Floating SEARCH pill */}
              <div className="-mb-12 mt-5 flex justify-center md:-mb-16">
                <button
                  type="submit"
                  className="rounded-full bg-gradient-primary px-12 py-4 text-sm font-extrabold uppercase tracking-widest text-primary-foreground shadow-glow transition hover:opacity-95 md:px-16 md:py-5 md:text-base"
                >
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Spacer for floating button */}
      <div className="h-10 md:h-14" />

      {/* Live results — Agoda-style: sticky filter sidebar + horizontal cards */}
      {hasSearched && (
        <ResultsBoard
          hotels={hotels}
          error={error}
          query={query}
          formatPrice={formatPrice}
          onSelect={setSelected}
        />
      )}

      {/* Discovery — only show when no active search */}
      {!hasSearched && (
        <>
          <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
                Top destinations worldwide
              </h2>
              <Link
                to="/stays"
                search={{ destination: "Dubai", checkIn: "", checkOut: "", guests: "2 Guests, 1 Room" }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {TOP_DESTINATIONS.map((d) => (
                <Link
                  key={d.city}
                  to="/stays"
                  search={{ destination: d.city, checkIn: "", checkOut: "", guests: "2 Guests, 1 Room" }}
                  className="group block"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl shadow-card transition group-hover:shadow-elevated">
                    <img
                      src={d.img}
                      alt={d.city}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="mt-3 px-1">
                    <div className="text-base font-extrabold text-foreground">{d.city}</div>
                    <div className="text-xs text-muted-foreground">{d.count} accommodations</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
                Accommodation promotions
              </h2>
              <span className="text-sm font-semibold text-primary">View all →</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {PROMO_TILES.map((p) => (
                <div
                  key={p.title}
                  className="relative overflow-hidden rounded-2xl bg-gradient-primary p-6 text-primary-foreground shadow-card"
                >
                  <Tag className="absolute -right-4 -top-4 h-24 w-24 text-accent opacity-20" />
                  <div className="text-[11px] font-bold uppercase tracking-wider text-accent">{p.tag}</div>
                  <div className="mt-1 font-display text-2xl font-extrabold">{p.title}</div>
                  <div className="mt-1 text-sm opacity-95">{p.subtitle}</div>
                  <button className="mt-4 rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground shadow-glow transition hover:opacity-90">
                    See deals
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {selected && (
        <BookingDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          title={`Book ${selected.name}`}
          summary={`${formatPrice(Number(selected.price), selected.currency ?? "USD")} · ${query.checkIn} → ${query.checkOut}`}
          fields={[
            { name: "firstName", label: "First name", required: true },
            { name: "lastName", label: "Last name", required: true },
            { name: "email", label: "Email", type: "email", required: true },
          ]}
          onSubmit={async (v) => {
            const res = await bookHotel({
              data: {
                offer_id: selected.offer_id ?? selected.id,
                holder: { firstName: v.firstName, lastName: v.lastName, email: v.email },
                guests: [{ firstName: v.firstName, lastName: v.lastName }],
              },
            });
            return { reference: res?.data?.reference, status: res?.data?.status };
          }}
        />
      )}
      <Footer />
    </div>
  );
}

function DateField({
  icon: Icon, label, value, onChange,
}: {
  icon: typeof CalendarIcon;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5 rounded-xl border border-border bg-background px-4 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none"
      />
    </label>
  );
}
