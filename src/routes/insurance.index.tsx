import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { searchInsurance } from "@/server/travsify";
import { useSelectOffer } from "@/lib/use-select-offer";
import { ErrorToast } from "@/components/booking/ErrorToast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  destination: z.coerce.string().optional().default("Schengen Area"),
  start: z.coerce.string().optional().default(""),
  end: z.coerce.string().optional().default(""),
  travelers: z.coerce.string().optional().default("1"),
  nationality: z.coerce.string().optional().default("Nigeria"),
});

const COUNTRY_CC: Record<string, string> = {
  nigeria: "NG", "united kingdom": "GB", "united states": "US", canada: "CA",
  germany: "DE", france: "FR", "united arab emirates": "AE", "schengen area": "EU",
  australia: "AU", india: "IN", china: "CN", "south africa": "ZA", ghana: "GH",
  kenya: "KE", japan: "JP", brazil: "BR",
};

function toCC(s: string) {
  const k = s.trim().toLowerCase();
  if (COUNTRY_CC[k]) return COUNTRY_CC[k];
  if (/^[a-z]{2}$/i.test(s.trim())) return s.trim().toUpperCase();
  return s.trim().slice(0, 2).toUpperCase();
}

export const Route = createFileRoute("/insurance/")({
  head: () => ({
    meta: [
      { title: "Travel Insurance — Cover from $4/day | iSwitch" },
      { name: "description", content: "Affordable travel and medical insurance from iSwitch. Schengen-approved, COVID-19 cover, instant policy." },
      { property: "og:title", content: "Travel Insurance | iSwitch" },
      { property: "og:description", content: "Protect every trip with comprehensive travel insurance." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    if (!deps.start || !deps.end) return { plans: [], query: deps, error: null as string | null };
    try {
      const res = await searchInsurance({
        data: {
          nationality: toCC(deps.nationality),
          destination: toCC(deps.destination),
          start_date: deps.start,
          end_date: deps.end,
          travelers: Number(deps.travelers) || 1,
        },
      });
      return { plans: res?.data?.plans ?? [], query: deps, error: (res?.error as string | null) ?? null };
    } catch (e: any) {
      return { plans: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: InsurancePage,
});

function InsurancePage() {
  const { plans, query, error } = Route.useLoaderData() as any;
  const hasSearched = !!(query.start && query.end);
  const { select, isSelecting, selecting, error: selectError, clearError } = useSelectOffer();

  function goToBooking(p: any) {
    const id = String(p.id ?? p.plan_id ?? p.external_id);
    void select({
      vertical: "insurance",
      sessionPrefix: "plan",
      cachePrefix: "plan",
      id,
      payload: { ...p, destination: query.destination, start: query.start, end: query.end, travelers: query.travelers, nationality: query.nationality },
      to: "/insurance/book",
      search: {
        plan_id: id,
        destination: query.destination,
        start: query.start,
        end: query.end,
        travelers: String(query.travelers ?? "1"),
      },
    });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <SearchingOverlay match="/insurance" label="Searching for insurance plans…" category="insurance" />
      <UnifiedSearchBar
        active="insurance"
        title="Travel insurance, instant policy."
        subtitle="Quote and bind in one call · Worldwide cover"
        initial={query}
      />

      <ErrorToast message={selectError} onDismiss={clearError} />

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {!hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">Enter your travel dates above to get a live quote.</div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : plans.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No plans available for these dates.</div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-xl font-bold">{plans.length} plans · {query.destination}</h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {plans.map((p: any) => {
                const id = String(p.id ?? p.plan_id ?? p.external_id);
                const loading = isSelecting(id);
                return (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                    <div className="font-display text-lg font-bold">{p.name}</div>
                    <div className="mt-2"><span className="text-3xl font-extrabold text-primary">{p.currency ?? "USD"} {p.price}</span></div>
                    <button
                      onClick={() => goToBooking(p)}
                      disabled={loading || (selecting && !loading)}
                      className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-accent py-2.5 text-sm font-bold text-accent-foreground transition disabled:cursor-wait disabled:opacity-70"
                    >
                      {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Opening plan…</>) : "Review & get covered"}
                    </button>
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
