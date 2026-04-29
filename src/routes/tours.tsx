import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { searchTours } from "@/server/travsify";
import { Loader2, MapPin } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  destination: z.coerce.string().optional().default("Dubai"),
  date: z.coerce.string().optional().default(""),
  guests: z.coerce.string().optional().default("2"),
});

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "Tours & Experiences worldwide | iSwitch" },
      { name: "description", content: "Curated tours and unique local experiences from iSwitch. Skip-the-line, food tours, day trips and more." },
      { property: "og:title", content: "Tours & Experiences | iSwitch" },
      { property: "og:description", content: "Discover the world with curated tours and local experiences." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.date) return { tours: [], query: deps, error: null as string | null };
    try {
      const res = await searchTours({ data: { destination: deps.destination, date: deps.date, participants: Number(deps.guests) || 2 } });
      return { tours: res?.data?.tours ?? [], query: deps, error: null };
    } catch (e: any) {
      return { tours: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: ToursPage,
});

function ToursPage() {
  const { tours, query, error } = Route.useLoaderData() as any;
  const navigate = useNavigate();
  const hasSearched = !!query.date;

  function goToBooking(t: any) {
    const id = t.id ?? t.tour_id;
    try { sessionStorage.setItem(`tour:${id}`, JSON.stringify(t)); } catch {}
    navigate({
      to: "/tours/book",
      search: {
        tour_id: String(id),
        destination: query.destination,
        date: query.date,
        guests: String(query.guests ?? "2"),
      } as never,
    });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <SearchingOverlay match="/tours" label="Searching for tours…" category="tours" />
      <UnifiedSearchBar
        active="tours"
        title="Unforgettable experiences."
        subtitle="Curated inventory · 80+ countries · Instant booking"
        initial={query}
      />

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {!hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">Pick a date above to search tours.</div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : tours.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No tours found.</div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-xl font-bold">{tours.length} experiences · {query.destination}</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {tours.map((t: any) => (
                <div key={t.id} className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elevated">
                  <div className="flex items-center gap-1 text-xs text-primary"><MapPin className="h-3 w-3" /> {query.destination}</div>
                  <div className="mt-1 font-bold">{t.title}</div>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="text-lg font-extrabold text-primary">{t.currency ?? "USD"} {t.price}</div>
                    <button onClick={() => goToBooking(t)} className="rounded-lg bg-gradient-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">Book</button>
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
