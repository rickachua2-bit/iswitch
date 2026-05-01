import { createFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { searchTours } from "@/server/travsify";
import { useSelectOffer } from "@/lib/use-select-offer";
import { ErrorToast } from "@/components/booking/ErrorToast";
import { Loader2, MapPin, Star, Clock, ImageIcon } from "lucide-react";
import { z } from "zod";
import { usePriceFormat } from "@/lib/use-price-format";
import { getUserCurrencyCode } from "@/lib/user-currency";

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
      const res = await searchTours({ data: { destination: deps.destination, date: deps.date, participants: Number(deps.guests) || 2, currency: getUserCurrencyCode() } });
      return { tours: res?.data?.tours ?? [], query: deps, error: null };
    } catch (e: any) {
      return { tours: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: ToursPage,
});

function ToursPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <ToursSearchPage />;
}

function ToursSearchPage() {
  const { tours, query, error } = Route.useLoaderData() as any;
  const hasSearched = !!query.date;
  const { select, isSelecting, selecting, error: selectError, clearError } = useSelectOffer();
  const formatPrice = usePriceFormat();

  function goToBooking(t: any) {
    const id = String(t.id ?? t.tour_id ?? t.external_id);
    void select({
      vertical: "tours",
      sessionPrefix: "tour",
      cachePrefix: "tour",
      id,
      payload: { ...t, destination: query.destination, date: query.date, guests: query.guests },
      to: "/tours/book",
      search: {
        tour_id: id,
        destination: query.destination,
        date: query.date,
        guests: String(query.guests ?? "2"),
      },
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

      <ErrorToast message={selectError} onDismiss={clearError} />

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
              {[...tours].sort((a: any, b: any) => Number(a.from_price ?? a.price ?? Infinity) - Number(b.from_price ?? b.price ?? Infinity)).map((t: any) => {
                const id = String(t.id ?? t.tour_id ?? t.external_id);
                const loading = isSelecting(id);
                const hero = (Array.isArray(t.images) && t.images[0]) || t.image || t.thumbnail || null;
                const rating = typeof t.rating === "number" ? t.rating : null;
                const reviewCount = typeof t.review_count === "number" ? t.review_count : null;
                const duration = t.duration_text ?? t.duration ?? null;
                const subtitle = t.subtitle ?? t.description ?? null;
                const price = t.from_price ?? t.price;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => goToBooking(t)}
                    disabled={loading || (selecting && !loading)}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated disabled:cursor-wait disabled:opacity-70"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
                      {hero ? (
                        <img
                          src={hero}
                          alt={t.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      {t.category && (
                        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm backdrop-blur">
                          {t.category}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-primary">
                          <MapPin className="h-3 w-3" /> {query.destination}
                        </span>
                        {duration && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {duration}
                          </span>
                        )}
                        {rating != null && (
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <Star className="h-3 w-3 fill-current text-amber-500" />
                            {rating.toFixed(1)}
                            {reviewCount != null && (
                              <span className="font-normal text-muted-foreground">
                                ({reviewCount.toLocaleString()})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 line-clamp-2 font-display text-base font-bold leading-snug">
                        {t.title}
                      </h3>
                      {subtitle && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {subtitle}
                        </p>
                      )}
                      <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">From</div>
                          <div className="text-lg font-extrabold text-primary">
                            {Number.isFinite(Number(price)) ? formatPrice(Number(price), t.currency ?? "USD") : "—"}
                          </div>
                        </div>
                        <span className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">
                          {loading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</>) : "View & book"}
                        </span>
                      </div>
                    </div>
                  </button>
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
