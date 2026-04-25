import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { BookingDialog } from "@/components/BookingDialog";
import { searchHotels, bookHotel } from "@/server/travsify";
import { Star, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  destination: z.string().optional().default("Dubai"),
  checkIn: z.string().optional().default(""),
  checkOut: z.string().optional().default(""),
  guests: z.string().optional().default("2 Guests, 1 Room"),
});

// Naive country guess: map common cities → country codes used by Travsify (LiteAPI ISO).
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
      { title: "Hotels & Stays — Best prices worldwide | iSwitch" },
      { name: "description", content: "Search 2M+ hotels and apartments via LiteAPI. Real-time prices, instant confirmation, free cancellation on most rooms." },
      { property: "og:title", content: "Hotels & Stays | iSwitch" },
      { property: "og:description", content: "Book hotels worldwide with confidence." },
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

function StaysPage() {
  const { hotels, query, error } = Route.useLoaderData() as any;
  const [selected, setSelected] = useState<any | null>(null);
  const hasSearched = !!(query.checkIn && query.checkOut);

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">Stay anywhere. Pay less.</h1>
          <p className="mt-2 text-sm text-primary-foreground/80">2M+ hotels via LiteAPI · Daily price refresh · Instant confirmation</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {!hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">Enter your dates above to search live hotels.</div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : hotels.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No hotels found.</div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-xl font-bold">{hotels.length} stays · {query.destination}</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {hotels.map((h: any) => (
                <div key={h.id} className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elevated">
                  <div className="text-sm font-bold">{h.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {Array.from({ length: h.stars ?? 0 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-accent text-accent" />)}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="text-[10px] text-muted-foreground">From</div>
                      <div className="text-lg font-extrabold text-primary">{h.currency ?? "USD"} {h.price}</div>
                    </div>
                    <button onClick={() => setSelected(h)} className="rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Book</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {selected && (
        <BookingDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          title={`Book ${selected.name}`}
          summary={`${selected.currency ?? "USD"} ${selected.price} · ${query.checkIn} → ${query.checkOut}`}
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
