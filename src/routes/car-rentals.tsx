import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { searchCarRentalsFn } from "@/server/travsify";
import { useSelectOffer } from "@/lib/use-select-offer";
import { ErrorToast } from "@/components/booking/ErrorToast";
import { Car, Users, Briefcase, Snowflake, Loader2, Settings2, MapPin, Fuel } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  pickup_location_id: z.coerce.string().optional().default(""),
  dropoff_location_id: z.coerce.string().optional().default(""),
  pickup_label: z.coerce.string().optional().default(""),
  dropoff_label: z.coerce.string().optional().default(""),
  pickup_date_time: z.coerce.string().optional().default(""),
  dropoff_date_time: z.coerce.string().optional().default(""),
  driver_age: z.coerce.string().optional().default("30"),
  currency: z.coerce.string().optional().default("USD"),
});

export const Route = createFileRoute("/car-rentals")({
  head: () => ({
    meta: [
      { title: "Car Rentals worldwide — Hertz, Avis, Budget & more | iSwitch" },
      { name: "description", content: "Compare car rental rates from top suppliers in 180+ countries. Free cancellation, unlimited mileage options and airport pick-up." },
      { property: "og:title", content: "Car Rentals | iSwitch" },
      { property: "og:description", content: "Compare and book car rentals from top global suppliers in seconds." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.pickup_location_id || !deps.pickup_date_time || !deps.dropoff_date_time) {
      return { cars: [], query: deps, error: null as string | null };
    }
    try {
      const res = await searchCarRentalsFn({
        data: {
          pickup_location_id: deps.pickup_location_id,
          dropoff_location_id: deps.dropoff_location_id || deps.pickup_location_id,
          pickup_date_time: deps.pickup_date_time,
          dropoff_date_time: deps.dropoff_date_time,
          driver_age: Number(deps.driver_age || "30"),
          currency: deps.currency || "USD",
        },
      });
      return { cars: res?.data?.cars ?? [], query: deps, error: (res?.error as string | null) ?? null };
    } catch (e: any) {
      return { cars: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: CarRentalsPage,
});

function CarRentalsPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <CarRentalsSearchPage />;
}

function CarRentalsSearchPage() {
  const { cars, query, error } = Route.useLoaderData() as any;
  const hasSearched = !!query.pickup_location_id && !!query.pickup_date_time;
  const { select, isSelecting, selecting, error: selectError, clearError } = useSelectOffer();

  function goToBooking(c: any) {
    const id = String(c.id);
    void select({
      vertical: "car_rentals",
      sessionPrefix: "car",
      cachePrefix: "car",
      id,
      payload: {
        ...c,
        pickup_label: query.pickup_label,
        dropoff_label: query.dropoff_label || query.pickup_label,
        pickup_date_time: query.pickup_date_time,
        dropoff_date_time: query.dropoff_date_time,
      },
      to: "/car-rentals/book",
      search: {
        car_id: id,
        pickup_label: query.pickup_label,
        dropoff_label: query.dropoff_label || query.pickup_label,
        pickup_date_time: query.pickup_date_time,
        dropoff_date_time: query.dropoff_date_time,
      },
    });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <SearchingOverlay match="/car-rentals" label="Searching cars…" category="car_rentals" />
      <UnifiedSearchBar
        active="car_rentals"
        title="Drive your trip, your way."
        subtitle="Compare rates from Hertz, Avis, Budget & 100+ suppliers worldwide. Free cancellation on most cars."
        initial={query}
      />

      <ErrorToast message={selectError} onDismiss={clearError} />

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {!hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Enter your pick-up location and dates above to compare available cars.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : cars.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No cars available for this route.
          </div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-xl font-bold">
              {cars.length} cars · {query.pickup_label || "Pick-up"} → {query.dropoff_label || query.pickup_label || "Drop-off"}
            </h2>
            <div className="space-y-3">
              {cars.map((c: any) => {
                const id = String(c.id);
                const loading = isSelecting(id);
                return (
                  <div key={id} className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-card md:grid-cols-[auto_1fr_auto] md:items-center">
                    <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                      {c.image ? (
                        <img src={c.image} alt={c.name} className="h-full w-full object-contain" />
                      ) : (
                        <Car className="h-10 w-10 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {c.carClass ?? "Car"} · or similar
                      </div>
                      <div className="font-bold text-foreground">{c.name}</div>
                      {c.supplier && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          {c.supplier_logo && <img src={c.supplier_logo} alt={c.supplier} className="h-4" />}
                          <span>{c.supplier}</span>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {c.passengers != null && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.passengers} seats</span>}
                        {c.bags != null && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {c.bags} bags</span>}
                        {c.transmission && <span className="flex items-center gap-1"><Settings2 className="h-3 w-3" /> {c.transmission}</span>}
                        {c.air_conditioning && <span className="flex items-center gap-1"><Snowflake className="h-3 w-3" /> A/C</span>}
                        {c.mileage && <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {c.mileage}</span>}
                        {c.pickup_type && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.pickup_type}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {c.daily_price != null && (
                        <div className="text-xs text-muted-foreground">{c.currency} {c.daily_price}/day</div>
                      )}
                      <div className="text-2xl font-extrabold text-primary">{c.currency} {c.total_price ?? c.daily_price}</div>
                      <button
                        onClick={() => goToBooking(c)}
                        disabled={loading || (selecting && !loading)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold text-accent-foreground transition disabled:cursor-wait disabled:opacity-70"
                      >
                        {loading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>) : "Reserve"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}
