import { createFileRoute, Link } from "@tanstack/react-router";
import { useSelectOffer } from "@/lib/use-select-offer";
import { ErrorToast } from "@/components/booking/ErrorToast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { searchHotels } from "@/server/travsify";
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
  destination: z.coerce.string().optional().default("Dubai"),
  checkIn: z.coerce.string().optional().default(""),
  checkOut: z.coerce.string().optional().default(""),
  guests: z.coerce.string().optional().default("2 Guests, 1 Room"),
});

const CITY_TO_CC: Record<string, string> = {
  dubai: "AE", "abu dhabi": "AE", paris: "FR", london: "GB", "new york": "US", tokyo: "JP",
  lagos: "NG", abuja: "NG", istanbul: "TR", rome: "IT", barcelona: "ES", madrid: "ES",
  bangkok: "TH", singapore: "SG", "kuala lumpur": "MY", nairobi: "KE", "cape town": "ZA",
  johannesburg: "ZA", accra: "GH", cairo: "EG", toronto: "CA", sydney: "AU", berlin: "DE",
};

const COUNTRY_TO_CC: Record<string, string> = {
  "united arab emirates": "AE", uae: "AE", france: "FR", "united kingdom": "GB", uk: "GB",
  "great britain": "GB", "united states": "US", usa: "US", japan: "JP", nigeria: "NG",
  turkey: "TR", italy: "IT", spain: "ES", thailand: "TH", malaysia: "MY", kenya: "KE",
  "south africa": "ZA", ghana: "GH", egypt: "EG", canada: "CA", australia: "AU", germany: "DE",
};

function guessCC(s: string) {
  const raw = s.trim();
  const parts = raw.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean);
  const candidates = [raw.toLowerCase(), ...parts];
  for (const candidate of candidates) {
    if (CITY_TO_CC[candidate]) return CITY_TO_CC[candidate];
    if (COUNTRY_TO_CC[candidate]) return COUNTRY_TO_CC[candidate];
  }
  if (/^[a-z]{2}$/i.test(raw)) return raw.toUpperCase();
  return "AE";
}

function adultsFromGuests(s: string) {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 2;
}

export const Route = createFileRoute("/stays/")({
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
          destination: deps.destination,
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
  { id: "visas", label: "Visas", icon: Briefcase, route: "/visas" as const },
  { id: "insurance", label: "Insurance", icon: ShieldCheck, route: "/insurance" as const },
  { id: "tours", label: "Tours", icon: Compass, route: "/tours" as const },
  { id: "pickups", label: "Car transfer", icon: Car, route: "/pickups" as const },
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

function nightsBetween(a?: string, b?: string) {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function StaysPage() {
  const { hotels, query, error } = Route.useLoaderData() as any;
  const formatPrice = usePriceFormat();
  const hasSearched = !!(query.checkIn && query.checkOut);
  const nights = nightsBetween(query.checkIn, query.checkOut);
  const { select, isSelecting, selecting, error: selectError, clearError } = useSelectOffer();

  function goToBooking(h: any) {
    const id = String(h.offer_id ?? h.rate_id ?? h.id ?? h.hotelId);
    void select({
      vertical: "stays",
      sessionPrefix: "hotel",
      cachePrefix: "hotel",
      id,
      payload: { ...h, checkIn: query.checkIn, checkOut: query.checkOut, guests: query.guests, destination: query.destination, nights },
      to: "/stays/book",
      search: {
        destination: query.destination,
        offer_id: id,
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        guests: query.guests,
      },
    });
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <Header />
      <SearchingOverlay match="/stays" label="Searching for stays…" category="stays" />

      <UnifiedSearchBar
        active="stays"
        title="See the world for less"
        subtitle="Compare 2M+ hotels and homes worldwide · Best price guarantee"
        initial={query}
      />

      {/* Live results — Agoda-style: sticky filter sidebar + horizontal cards */}
      {hasSearched && (
        <ResultsBoard
          hotels={hotels}
          error={error}
          query={query}
          nights={nights}
          formatPrice={formatPrice}
          onSelect={goToBooking}
          isSelecting={isSelecting}
          selecting={selecting}
        />
      )}

      <ErrorToast message={selectError} onDismiss={clearError} />

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

/* ====================== Agoda-style results board ====================== */

const SORT_TABS = [
  { id: "best", label: "Best match" },
  { id: "lowest", label: "Lowest price" },
  { id: "stars", label: "Stars" },
  { id: "score", label: "Top reviewed" },
  { id: "distance", label: "Distance" },
] as const;

const POPULAR_FILTERS = [
  { label: "Free cancellation", icon: ShieldCheck },
  { label: "Breakfast included", icon: Coffee },
  { label: "Instant confirmation", icon: Check },
  { label: "Hot deals", icon: Flame },
];

/** Pull the best available hotel image from Travsify's many possible field names. */
function pickHotelImage(h: any): string | null {
  if (!h) return null;
  const direct = h.image ?? h.thumbnail ?? h.photo ?? h.picture ?? h.image_url ?? h.thumbnail_url ?? h.cover ?? h.cover_image;
  if (typeof direct === "string" && direct) return direct;
  const arrays = [h.images, h.photos, h.gallery, h.pictures, h.media];
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length) {
      const first = arr[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        return first.url ?? first.src ?? first.href ?? first.image ?? first.thumbnail ?? null;
      }
    }
  }
  return null;
}

const PROPERTY_TYPES = ["Hotel", "Apartment", "Resort", "Villa", "Hostel", "Guest house"];

const AMENITIES = [
  { label: "Free Wi-Fi", icon: Wifi },
  { label: "Swimming pool", icon: Waves },
  { label: "Fitness center", icon: Dumbbell },
  { label: "Restaurant", icon: Utensils },
  { label: "Free parking", icon: ParkingCircle },
  { label: "Spa", icon: Sparkles },
];

function scoreLabel(s: number) {
  if (s >= 9) return "Exceptional";
  if (s >= 8.5) return "Excellent";
  if (s >= 8) return "Very good";
  if (s >= 7) return "Good";
  if (s >= 6) return "Pleasant";
  return "Reviewed";
}

function ResultsBoard({
  hotels, error, query, nights, formatPrice, onSelect, isSelecting, selecting,
}: {
  hotels: any[];
  error: string | null;
  query: { destination: string; checkIn: string; checkOut: string; guests: string };
  nights: number;
  formatPrice: (n: number, c: string) => string;
  onSelect: (h: any) => void;
  isSelecting: (id: string) => boolean;
  selecting: boolean;
}) {
  const [sort, setSort] = useState<typeof SORT_TABS[number]["id"]>("best");
  const [maxPrice, setMaxPrice] = useState(1000);
  const [minStars, setMinStars] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [popular, setPopular] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, v: string) =>
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtered = useMemo(() => {
    const list = (hotels ?? []).filter((h) => {
      if (Number(h.price ?? 0) > maxPrice) return false;
      if ((h.stars ?? 0) < minStars) return false;
      if (Number(h.review_score ?? h.score ?? 0) < minScore) return false;
      return true;
    });
    const sorted = [...list];
    if (sort === "lowest") sorted.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    else if (sort === "stars") sorted.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
    else if (sort === "score")
      sorted.sort((a, b) => Number(b.review_score ?? b.score ?? 0) - Number(a.review_score ?? a.score ?? 0));
    return sorted;
  }, [hotels, maxPrice, minStars, minScore, sort]);

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* ============ Sidebar ============ */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Map card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,oklch(1_0_0/0.5),transparent_50%)]" />
              <MapPin className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 fill-primary text-primary-foreground drop-shadow" />
            </div>
            <button className="block w-full px-4 py-3 text-left text-xs font-bold text-primary hover:bg-secondary/60">
              Show on map →
            </button>
          </div>

          <FilterGroup title="Your budget per night">
            <div className="px-1">
              <input
                type="range"
                min={20}
                max={2000}
                step={10}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[hsl(var(--primary))]"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                <span>Up to</span>
                <span className="rounded-md bg-primary px-2 py-0.5 text-primary-foreground">
                  {formatPrice(maxPrice, "USD")}
                </span>
              </div>
            </div>
          </FilterGroup>

          <FilterGroup title="Popular filters">
            <div className="space-y-2">
              {POPULAR_FILTERS.map((p) => (
                <CheckRow
                  key={p.label}
                  label={p.label}
                  Icon={p.icon}
                  checked={popular.includes(p.label)}
                  onChange={() => toggle(popular, setPopular, p.label)}
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Star rating">
            <div className="flex flex-wrap gap-2">
              {[5, 4, 3, 2, 1].map((s) => (
                <button
                  key={s}
                  onClick={() => setMinStars(minStars === s ? 0 : s)}
                  className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    minStars === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                >
                  {s} <Star className="h-3 w-3 fill-current" />
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Review score">
            <div className="space-y-2">
              {[
                { v: 9, l: "Exceptional 9+" },
                { v: 8, l: "Excellent 8+" },
                { v: 7, l: "Very good 7+" },
                { v: 6, l: "Good 6+" },
              ].map((r) => (
                <label key={r.v} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="score"
                    checked={minScore === r.v}
                    onChange={() => setMinScore(r.v)}
                    className="accent-[hsl(var(--primary))]"
                  />
                  <span className="text-foreground">{r.l}</span>
                </label>
              ))}
              {minScore > 0 && (
                <button
                  onClick={() => setMinScore(0)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </FilterGroup>

          <FilterGroup title="Property type">
            <div className="space-y-2">
              {PROPERTY_TYPES.map((t) => (
                <CheckRow
                  key={t}
                  label={t}
                  checked={types.includes(t)}
                  onChange={() => toggle(types, setTypes, t)}
                />
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Amenities">
            <div className="space-y-2">
              {AMENITIES.map((a) => (
                <CheckRow
                  key={a.label}
                  label={a.label}
                  Icon={a.icon}
                  checked={amenities.includes(a.label)}
                  onChange={() => toggle(amenities, setAmenities, a.label)}
                />
              ))}
            </div>
          </FilterGroup>
        </aside>

        {/* ============ Results column ============ */}
        <div>
          {/* Heading */}
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
                <span className="text-primary">{query.destination}</span>:{" "}
                {error ? "0" : filtered.length} hotel stays found
              </h2>
              <p className="text-xs text-muted-foreground">
                {query.checkIn} → {query.checkOut} · {query.guests}
              </p>
            </div>
          </div>

          {/* Sort tabs (Agoda style) */}
          <div className="mb-4 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
            <div className="flex min-w-max">
              {SORT_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSort(t.id)}
                  className={`flex-1 px-4 py-3 text-xs font-bold transition md:text-sm ${
                    sort === t.id
                      ? "border-b-2 border-primary bg-secondary/60 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* States */}
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-sm shadow-card">
              <div className="font-bold text-destructive">Hotels are temporarily unavailable</div>
              <div className="mt-1 text-muted-foreground">
                We couldn't load hotel inventory right now
                {error.includes("522") ? " (upstream timeout)" : ` (${error})`}.
                Flights and other services are unaffected. Please try again in a minute.
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-card">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No hotels match your filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((h: any) => {
                const id = String(h.offer_id ?? h.rate_id ?? h.id ?? h.hotelId);
                return (
                  <HotelResultCard
                    key={h.id}
                    hotel={h}
                    nights={nights}
                    formatPrice={formatPrice}
                    onSelect={onSelect}
                    loading={isSelecting(id)}
                    disabled={selecting && !isSelecting(id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-extrabold text-foreground"
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function CheckRow({
  label, Icon, checked, onChange,
}: {
  label: string;
  Icon?: typeof Wifi;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]"
      />
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      <span className="text-foreground">{label}</span>
    </label>
  );
}

function HotelResultCard({
  hotel: h, nights, formatPrice, onSelect, loading, disabled,
}: {
  hotel: any;
  nights: number;
  formatPrice: (n: number, c: string) => string;
  onSelect: (h: any) => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const score = Number(h.review_score ?? h.score ?? 0);
  const original = h.original_price ? Number(h.original_price) : null;
  const nightly = Number(h.price ?? 0);
  const stayTotal = nights > 0 ? nightly * nights : 0;
  const discount = original && original > nightly ? Math.round(((original - nightly) / original) * 100) : 0;
  const img = pickHotelImage(h);
  const currency = h.currency ?? "USD";

  return (
    <article className="group grid grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-elevated md:grid-cols-[280px_1fr]">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary md:aspect-auto md:h-full">
        {img ? (
          <img
            src={img}
            alt={h.name}
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-primary">
            <MapPin className="h-10 w-10 text-primary-foreground/70" />
          </div>
        )}
        <button
          aria-label="Save"
          className="absolute right-3 top-3 rounded-full bg-card/95 p-2 text-foreground shadow-card transition hover:bg-card"
        >
          <Heart className="h-4 w-4" />
        </button>
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-md bg-destructive px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-destructive-foreground shadow">
            -{discount}% Hot deal
          </span>
        )}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_200px]">
        {/* Left: name, location, room */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[11px] text-accent-foreground">
            {Array.from({ length: h.stars ?? 0 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-accent text-accent" />
            ))}
          </div>
          <h3 className="text-base font-extrabold text-foreground hover:text-primary">{h.name}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {h.location ?? h.address ?? "City center"}
          </div>

          {/* Room info row */}
          <div className="mt-1 rounded-lg bg-secondary/60 p-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <BedDouble className="h-3.5 w-3.5 text-primary" />
              {h.room_name ?? "Standard double room"}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> 2 adults</span>
              <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Free Wi-Fi</span>
              <span className="flex items-center gap-1 text-primary"><ShieldCheck className="h-3 w-3" /> Free cancellation</span>
            </div>
          </div>

          {/* Promo line — prepay only */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 font-bold text-primary">
              <ShieldCheck className="h-3 w-3" /> Prepay · instant confirmation
            </span>
            <span className="rounded bg-accent/20 px-1.5 py-0.5 font-bold text-accent-foreground">
              Breakfast included
            </span>
          </div>
        </div>

        {/* Right: score + price */}
        <div className="flex flex-col items-end justify-between gap-3 border-t border-border pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0">
          {/* Score badge — Agoda layout */}
          {score > 0 && (
            <div className="flex items-center gap-2 self-end">
              <div className="text-right">
                <div className="text-xs font-extrabold text-foreground">{scoreLabel(score)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {h.review_count ? `${Number(h.review_count).toLocaleString()} reviews` : "Verified reviews"}
                </div>
              </div>
              <div className="rounded-lg rounded-tr-none bg-primary px-2.5 py-1.5 text-base font-extrabold text-primary-foreground shadow">
                {score.toFixed(1)}
              </div>
            </div>
          )}

          {/* Price — daily rate first, then total for stay */}
          <div className="w-full text-right">
            {original && original > nightly && (
              <div className="text-[11px] text-muted-foreground line-through">
                {formatPrice(original, currency)} / night
              </div>
            )}
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Daily rate
            </div>
            <div className="text-xl font-extrabold text-primary md:text-2xl">
              {formatPrice(nightly, currency)}
              <span className="ml-1 text-[11px] font-semibold text-muted-foreground">/ night</span>
            </div>
            {nights > 0 && (
              <div className="mt-1 rounded-md bg-secondary/70 px-2 py-1 text-[11px] text-foreground">
                <span className="font-semibold">For {nights} night{nights > 1 ? "s" : ""}:</span>{" "}
                <span className="font-extrabold text-primary">{formatPrice(stayTotal, currency)}</span>
                <div className="text-[10px] text-muted-foreground">Excl. taxes & fees</div>
              </div>
            )}
            <button
              onClick={() => onSelect(h)}
              disabled={loading || disabled}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-primary px-3 py-2.5 text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow transition hover:opacity-95 disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening rooms…
                </>
              ) : (
                <>View rooms & book</>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
