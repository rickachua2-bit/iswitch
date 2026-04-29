import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { searchTransfers } from "@/server/travsify";
import { useSelectOffer } from "@/lib/use-select-offer";
import { ErrorToast } from "@/components/booking/ErrorToast";
import { Car, Users, Briefcase, Snowflake, Loader2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  pickup: z.coerce.string().optional().default("Murtala Muhammed Airport (LOS)"),
  drop: z.coerce.string().optional().default("Eko Hotel, Victoria Island"),
  date: z.coerce.string().optional().default(""),
  time: z.coerce.string().optional().default(""),
});

export const Route = createFileRoute("/pickups")({
  head: () => ({
    meta: [
      { title: "Airport Pickups & Car Transfers worldwide | iSwitch" },
      { name: "description", content: "Pre-book reliable airport pickups and private car transfers in 100+ cities. Fixed prices, English-speaking drivers, flight tracking." },
      { property: "og:title", content: "Airport Pickups | iSwitch" },
      { property: "og:description", content: "Reliable airport transfers and chauffeur service." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.date) return { vehicles: [], query: deps, error: null as string | null };
    try {
      const res = await searchTransfers({
        data: { pickup: deps.pickup, drop: deps.drop, date: deps.date, time: deps.time },
      });
      return { vehicles: res?.data?.vehicles ?? [], query: deps, error: null };
    } catch (e: any) {
      return { vehicles: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: PickupsPage,
});

function PickupsPage() {
  const { vehicles, query, error } = Route.useLoaderData() as any;
  const navigate = useNavigate();
  const hasSearched = !!query.date;

  async function goToBooking(v: any) {
    const id = v.id ?? v.vehicle_id ?? v.external_id;
    const { persistSelectedOffer } = await import("@/lib/select-offer");
    await persistSelectedOffer({
      vertical: "pickups",
      sessionPrefix: "vehicle",
      cachePrefix: "vehicle",
      id: String(id),
      payload: { ...v, pickup: query.pickup, drop: query.drop, date: query.date, time: query.time },
    });
    navigate({
      to: "/pickups/book",
      search: {
        vehicle_id: String(id),
        pickup: query.pickup,
        drop: query.drop,
        date: query.date,
        time: query.time,
      } as never,
    });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <SearchingOverlay match="/pickups" label="Searching for transfers…" category="pickups" />
      <UnifiedSearchBar
        active="pickups"
        title="Land. Step out. Drive away."
        subtitle="Pre-book airport pickups in 100+ cities · Flight tracking included"
        initial={query}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {!hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Enter your pickup details and date above to view available vehicles.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No vehicles available for this route.
          </div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-xl font-bold">
              {vehicles.length} vehicles · {query.pickup} → {query.drop}
            </h2>
            <div className="space-y-3">
              {vehicles.map((v: any) => (
                <div key={v.id} className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-card md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-secondary">
                    <Car className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold">{v.name ?? v.type ?? "Vehicle"}</div>
                    <div className="text-sm text-muted-foreground">{v.description ?? v.desc ?? ""}</div>
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {v.passengers ?? v.pax ?? 3} passengers</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {v.bags ?? 2} bags</span>
                      <span className="flex items-center gap-1"><Snowflake className="h-3 w-3" /> A/C</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-2xl font-extrabold text-primary">{v.currency ?? "USD"} {v.price}</div>
                    <button
                      onClick={() => goToBooking(v)}
                      className="rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold text-accent-foreground"
                    >
                      Book now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <Footer />
    </div>
  );
}
