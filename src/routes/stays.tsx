import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { BookingDialog } from "@/components/BookingDialog";
import { searchHotels, bookHotel } from "@/server/travsify";
import { usePriceFormat } from "@/lib/use-price-format";
import { Star, Loader2, MapPin, ThumbsUp, Heart, Tag } from "lucide-react";
import { useState } from "react";
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

const TOP_DESTINATIONS = [
  { city: "Dubai", country: "United Arab Emirates", img: dubai, count: "12,408" },
  { city: "London", country: "United Kingdom", img: london, count: "9,114" },
  { city: "Paris", country: "France", img: paris, count: "8,275" },
  { city: "New York", country: "United States", img: newyork, count: "3,049" },
  { city: "Tokyo", country: "Japan", img: tokyo, count: "5,116" },
];

const PROMO_TILES = [
  { tag: "Limited deal", title: "Up to 30% off", subtitle: "Citywide hotel sale", from: "from-pink-500", to: "to-rose-600" },
  { tag: "Worldwide", title: "Last-minute escapes", subtitle: "Book today, leave tomorrow", from: "from-sky-500", to: "to-cyan-600" },
  { tag: "New", title: "Genius members", subtitle: "Up to 20% bonus on app", from: "from-amber-500", to: "to-orange-600" },
];

function StaysPage() {
  const { hotels, query, error } = Route.useLoaderData() as any;
  const [selected, setSelected] = useState<any | null>(null);
  const formatPrice = usePriceFormat();
  const hasSearched = !!(query.checkIn && query.checkOut);

  return (
    <div className="min-h-screen bg-[#f2f2f2]">
      <Header />

      {/* Agoda-style hero — teal water + white search card */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#0f7689] via-[#1d96a6] to-[#39b3c3] pb-24 pt-10 md:pb-32">
        {/* subtle wave accent */}
        <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white drop-shadow md:text-4xl">
            See the world for less
          </h1>
        </div>
        <SearchTabs defaultTab="stays" />
      </section>

      {/* Live results */}
      {hasSearched && (
        <section className="mx-auto -mt-16 max-w-7xl px-4 pb-12 md:px-6">
          {error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive shadow-card">{error}</div>
          ) : hotels.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground shadow-card">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No hotels found.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                  {hotels.length} stays in <span className="text-[#1d96a6]">{query.destination}</span>
                </h2>
                <div className="text-xs text-muted-foreground">{query.checkIn} → {query.checkOut} · {query.guests}</div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {hotels.map((h: any) => (
                  <article
                    key={h.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                      {h.image || h.thumbnail ? (
                        <img
                          src={h.image ?? h.thumbnail}
                          alt={h.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1d96a6]/20 to-[#0f7689]/20">
                          <MapPin className="h-10 w-10 text-[#1d96a6]" />
                        </div>
                      )}
                      <button
                        aria-label="Save"
                        className="absolute right-3 top-3 rounded-full bg-white/95 p-2 text-foreground shadow-card transition hover:bg-white"
                      >
                        <Heart className="h-4 w-4" />
                      </button>
                      {h.deal_label && (
                        <span className="absolute left-3 top-3 rounded-md bg-[#ff5d5d] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                          {h.deal_label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-bold text-foreground">{h.name}</h3>
                        {(h.review_score ?? h.score) && (
                          <span className="flex shrink-0 items-center gap-1 rounded-md bg-[#0f7689] px-2 py-1 text-[11px] font-bold text-white">
                            {Number(h.review_score ?? h.score).toFixed(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {Array.from({ length: h.stars ?? 0 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-[#febb02] text-[#febb02]" />
                        ))}
                        {h.location && <span className="ml-1 line-clamp-1">· {h.location}</span>}
                      </div>
                      {h.review_count && (
                        <div className="flex items-center gap-1 text-[11px] text-[#1d96a6]">
                          <ThumbsUp className="h-3 w-3" /> {h.review_count.toLocaleString()} reviews
                        </div>
                      )}
                      <div className="mt-auto flex items-end justify-between border-t border-border pt-3">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Price for 1 night</div>
                        <div className="text-right">
                          {h.original_price && Number(h.original_price) > Number(h.price) && (
                            <div className="text-[11px] text-muted-foreground line-through">
                              {formatPrice(Number(h.original_price), h.currency ?? "USD")}
                            </div>
                          )}
                          <div className="text-lg font-extrabold text-[#ff5d5d]">
                            {formatPrice(Number(h.price), h.currency ?? "USD")}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelected(h)}
                        className="mt-1 w-full rounded-lg bg-[#1d96a6] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#0f7689]"
                      >
                        See availability
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Top destinations — Agoda-style square cards with city overlay */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">Top destinations worldwide</h2>
          <Link to="/stays" className="text-sm font-semibold text-[#1d96a6] hover:underline">View all →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {TOP_DESTINATIONS.map((d) => (
            <Link
              key={d.city}
              to="/stays"
              search={{ destination: d.city, checkIn: "", checkOut: "", guests: "2 Guests, 1 Room" }}
              className="group relative aspect-square overflow-hidden rounded-2xl shadow-card transition hover:shadow-elevated"
            >
              <img src={d.img} alt={d.city} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                <div className="text-base font-extrabold leading-tight">{d.city}</div>
                <div className="text-[11px] opacity-90">{d.country}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-90">{d.count} accommodations</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Accommodation promotions strip */}
      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">Accommodation promotions</h2>
          <span className="text-sm font-semibold text-[#1d96a6]">Limited time</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PROMO_TILES.map((p) => (
            <div
              key={p.title}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.from} ${p.to} p-6 text-white shadow-card`}
            >
              <Tag className="absolute -right-4 -top-4 h-24 w-24 opacity-15" />
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">{p.tag}</div>
              <div className="mt-1 font-display text-2xl font-extrabold">{p.title}</div>
              <div className="mt-1 text-sm opacity-95">{p.subtitle}</div>
              <button className="mt-4 rounded-lg bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-wide text-foreground transition hover:bg-white">
                See deals
              </button>
            </div>
          ))}
        </div>
      </section>

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
