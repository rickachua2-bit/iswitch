import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { BookingDialog } from "@/components/BookingDialog";
import { searchFlights, bookFlight } from "@/server/travsify";
import { Plane, Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  departure: z.string().optional(),
  returnDate: z.string().optional(),
  travelers: z.string().optional(),
  trip: z.string().optional(),
  cabin: z.string().optional(),
  stops: z.string().optional(),
  airlines: z.string().optional(),
  sort: z.enum(["best", "cheapest", "fastest"]).optional(),
});

function airportCode(s: string) {
  const m = s.match(/\(([A-Z]{3})\)/);
  return m ? m[1] : s.trim().slice(0, 3).toUpperCase();
}

function adultsFromTravelers(s: string) {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: "Cheap Flights — Compare 500+ airlines | iSwitch" },
      { name: "description", content: "Compare and book real-time flights worldwide via our NDC partner. Best price guarantee on 500+ airlines." },
      { property: "og:title", content: "Cheap Flights | iSwitch" },
      { property: "og:description", content: "Search and book the cheapest flights worldwide." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({
    origin: search.origin,
    destination: search.destination,
    departure: search.departure,
    returnDate: search.returnDate,
    travelers: search.travelers,
  }),
  loader: async ({ deps }) => {
    if (!deps.departure) return { offers: [], query: deps };
    try {
      const res = await searchFlights({
        data: {
          origin: airportCode(deps.origin),
          destination: airportCode(deps.destination),
          departure_date: deps.departure,
          return_date: deps.returnDate || undefined,
          adults: adultsFromTravelers(deps.travelers),
        },
      });
      return { offers: res?.data?.offers ?? [], query: deps, error: null as string | null };
    } catch (e: any) {
      return { offers: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: FlightsPage,
});

function FlightsPage() {
  const { offers, query, error } = Route.useLoaderData() as any;
  const [selected, setSelected] = useState<any | null>(null);
  const hasSearched = !!query.departure;

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">Compare cheap flights worldwide</h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Live NDC + GDS inventory · 500+ airlines · Real-time confirmation</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {!hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Enter your dates above to search live flights.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : offers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No offers found. Try different dates.
          </div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-xl font-bold">{offers.length} flights · {query.origin} → {query.destination}</h2>
            <div className="space-y-3">
              {offers.map((o: any) => (
                <div key={o.id} className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-card md:grid-cols-[1fr_2fr_auto] md:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary"><Plane className="h-5 w-5 text-primary" /></div>
                    <div>
                      <div className="text-sm font-bold">{o.owner ?? "Airline"}</div>
                      <div className="text-xs text-muted-foreground">Offer {o.id?.slice(0, 10)}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {query.origin} → {query.destination} · {query.departure}
                    {query.returnDate && <> · return {query.returnDate}</>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-2xl font-extrabold text-primary">{o.total_currency ?? "USD"} {o.total_amount}</div>
                    <button onClick={() => setSelected(o)} className="rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold text-accent-foreground">Book →</button>
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
          title="Confirm flight booking"
          summary={`${selected.owner ?? "Flight"} · ${selected.total_currency ?? "USD"} ${selected.total_amount}`}
          fields={[
            { name: "title", label: "Title (mr/ms/mrs)", required: true, placeholder: "mr" },
            { name: "given_name", label: "First name", required: true },
            { name: "family_name", label: "Last name", required: true },
            { name: "born_on", label: "Date of birth", type: "date", required: true },
            { name: "gender", label: "Gender (m/f)", required: true, placeholder: "m" },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "phone_number", label: "Phone", required: true, placeholder: "+2348012345678" },
          ]}
          onSubmit={async (v) => {
            const res = await bookFlight({ data: { offer_id: selected.id, passengers: [v as any] } });
            return { reference: res?.data?.reference, status: res?.data?.status };
          }}
        />
      )}
      <Footer />
    </div>
  );
}
