import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { FlightResultCard } from "@/components/flights/FlightResultCard";
import { FlightFilters } from "@/components/flights/FlightFilters";
import { startFlightSearch, pollFlightSearch } from "@/server/travsify";
import { TravelTip } from "@/components/SearchingOverlay";
import { toIata } from "@/lib/airports";
import { Plane, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import iswitchLogo from "@/assets/iswitch-logo.jpeg";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const searchSchema = z.object({
  origin: z.coerce.string().optional(),
  destination: z.coerce.string().optional(),
  departure: z.coerce.string().optional(),
  returnDate: z.coerce.string().optional(),
  travelers: z.coerce.string().optional(),
  trip: z.coerce.string().optional(),
  cabin: z.coerce.string().optional(),
  adults: z.coerce.string().optional(),
  children: z.coerce.string().optional(),
  infants: z.coerce.string().optional(),
  segments: z.coerce.string().optional(),
  stops: z.coerce.string().optional(),
  airlines: z.coerce.string().optional(),
  sort: z.enum(["best", "cheapest", "fastest"]).optional(),
  baggage: z.coerce.string().optional(),
  recommended: z.coerce.string().optional(),
});

function adultsFromTravelers(s: string | undefined) {
  if (!s) return 1;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 1;
}

type Segment = { origin: string; destination: string; departure: string };
function parseSegments(s: string | undefined): Segment[] {
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) return arr.filter((x) => x?.origin && x?.destination && x?.departure);
  } catch { /* ignore */ }
  return [];
}

export const Route = createFileRoute("/flights/search")({
  head: () => ({
    meta: [
      { title: "Flight results — iSwitch" },
      { name: "description", content: "Live flight results from 500+ airlines on iSwitch." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>
  ),
  component: FlightSearchResultsPage,
});

/* helpers */
function parseDuration(d?: string | number): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}

function offerSlices(o: any): any[] {
  return (o?.slices ?? o?.itineraries ?? []) as any[];
}
function offerCarrier(o: any): { name: string; code: string } {
  const ow = o?.owner ?? o?.validating_carrier ?? {};
  const fromSeg = offerSlices(o)[0]?.segments?.[0]?.marketing_carrier ?? {};
  const code = ow.iata_code || fromSeg.iata_code || (typeof o?.owner === "string" ? o.owner : "") || "??";
  const name = ow.name || fromSeg.name || (typeof o?.owner === "string" ? o.owner : "Airline");
  return { name, code };
}
function totalAmount(o: any): number {
  return Number(o?.total_amount ?? o?.price?.total ?? o?.total ?? 0);
}
function offerStops(o: any): number {
  const slice = offerSlices(o)[0];
  const segs = slice?.segments?.length ?? 1;
  return Math.max(0, segs - 1);
}
function offerDurationMin(o: any): number {
  const slices = offerSlices(o);
  return slices.reduce((sum, s) => sum + parseDuration(s.duration), 0);
}

/* polling hook */
type SearchState = {
  status: "idle" | "starting" | "polling" | "completed" | "failed";
  offers: any[];
  error: string | null;
};

function useFlightSearch(search: any): SearchState & { query: any } {
  const [state, setState] = useState<SearchState>({ status: "idle", offers: [], error: null });

  const segs = parseSegments(search.segments);
  const isMulti = search.trip === "multi-city" && segs.length >= 2;
  const hasSimple = !!(search.departure && search.origin && search.destination);
  const canSearch = isMulti || hasSimple;

  const sig = JSON.stringify({
    trip: search.trip ?? "round-trip",
    origin: search.origin ?? "",
    destination: search.destination ?? "",
    departure: search.departure ?? "",
    returnDate: search.returnDate ?? "",
    adults: search.adults ?? "",
    children: search.children ?? "",
    infants: search.infants ?? "",
    cabin: search.cabin ?? "",
    segments: search.segments ?? "",
  });

  const activeSig = useRef<string>("");

  useEffect(() => {
    if (!canSearch) {
      setState({ status: "idle", offers: [], error: null });
      return;
    }
    activeSig.current = sig;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    setState({ status: "starting", offers: [], error: null });

    const adults = search.adults ? Number(search.adults) : adultsFromTravelers(search.travelers);
    const payload: any = isMulti
      ? {
          segments: segs.map((s) => ({
            origin: toIata(s.origin),
            destination: toIata(s.destination),
            departure_date: s.departure,
          })),
          adults,
          cabin: search.cabin || undefined,
          children: search.children ? Number(search.children) : undefined,
          infants: search.infants ? Number(search.infants) : undefined,
        }
      : {
          origin: toIata(search.origin),
          destination: toIata(search.destination),
          departure_date: search.departure,
          return_date: search.returnDate || undefined,
          adults,
          cabin: search.cabin || undefined,
          children: search.children ? Number(search.children) : undefined,
          infants: search.infants ? Number(search.infants) : undefined,
        };

    const isStale = () => cancelled || activeSig.current !== sig;

    (async () => {
      try {
        const start: any = await startFlightSearch({ data: payload });
        if (isStale()) return;

        if (start?.error && !start?.search_id) {
          setState({ status: "failed", offers: [], error: start.error });
          return;
        }

        const inlineOffers: any[] = start?.data?.offers ?? [];
        if (start?.search_id) {
          setState({ status: "polling", offers: inlineOffers, error: null });

          const MAX_ATTEMPTS = 12;
          let attempts = 0;
          const POLL_MS = 1000;

          const poll = async () => {
            if (isStale()) return;
            attempts += 1;
            const res: any = await pollFlightSearch({ data: { search_id: start.search_id } });
            if (isStale()) return;

            const offers: any[] = res?.data?.offers ?? [];
            if (res?.status === "completed") {
              setState({ status: "completed", offers, error: null });
              return;
            }
            if (res?.status === "failed") {
              setState({ status: "failed", offers, error: res?.error ?? "Search failed." });
              return;
            }
            setState({ status: "polling", offers, error: null });

            if (offers.length >= 8) {
              setState({ status: "completed", offers, error: null });
              return;
            }
            if (attempts >= MAX_ATTEMPTS) {
              setState({
                status: offers.length ? "completed" : "failed",
                offers,
                error: offers.length ? null : "Search took too long. Please try again.",
              });
              return;
            }
            timer = setTimeout(poll, POLL_MS);
          };

          timer = setTimeout(poll, POLL_MS);
          return;
        }
        setState({ status: "completed", offers: inlineOffers, error: null });
      } catch (err: any) {
        if (isStale()) return;
        setState({ status: "failed", offers: [], error: err?.message ?? "Search failed." });
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return {
    ...state,
    query: {
      origin: search.origin ?? "",
      destination: search.destination ?? "",
      departure: search.departure ?? "",
      returnDate: search.returnDate ?? "",
      trip: search.trip ?? "round-trip",
      cabin: search.cabin ?? "economy",
    },
  };
}

/* page */
function FlightSearchResultsPage() {
  const search: any = Route.useSearch();
  const navigate = Route.useNavigate();

  const { offers, error, status, query } = useFlightSearch(search);
  const isSearching = status === "starting" || status === "polling";
  const showOverlay = isSearching && offers.length === 0;

  const sort = search.sort ?? "best";
  const stopsFilter = search.stops ?? "any";
  const airlinesCsv = search.airlines ?? "";
  const airlineFilter = airlinesCsv ? airlinesCsv.split(",") : [];
  const baggageOnly = (search as any).baggage === "1";
  const recommendedOnly = (search as any).recommended === "1";

  const filtered = useMemo(() => {
    let xs = [...offers];
    if (stopsFilter !== "any") {
      const max = Number(stopsFilter);
      xs = xs.filter((o) => offerStops(o) <= max);
    }
    if (airlineFilter.length) {
      xs = xs.filter((o) => airlineFilter.includes(offerCarrier(o).code));
    }
    if (sort === "cheapest") xs.sort((a, b) => totalAmount(a) - totalAmount(b));
    else if (sort === "fastest") xs.sort((a, b) => offerDurationMin(a) - offerDurationMin(b));
    else
      xs.sort((a, b) => {
        const pa = totalAmount(a) + offerDurationMin(a) * 0.5;
        const pb = totalAmount(b) + offerDurationMin(b) * 0.5;
        return pa - pb;
      });
    return xs;
  }, [offers, sort, stopsFilter, airlinesCsv]);

  function setSearch(patch: Record<string, any>) {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  }

  const currency = offers[0]?.total_currency ?? offers[0]?.price?.currency ?? "USD";

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <UnifiedSearchBar
        active="flights"
        pending={isSearching}
        title="Compare cheap flights worldwide"
        subtitle="Live NDC + GDS inventory · 500+ airlines · Real-time confirmation"
      />

      {showOverlay && <FlightSearchingOverlay query={query} />}

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <NoResultsDialog
          open={!isSearching && (!!error || offers.length === 0)}
          title={error ? "Flights are taking a moment" : "No flights found"}
          message={
            error ??
            "We couldn't find any flights for these dates and route. Try different dates, nearby airports, or another cabin class."
          }
          onClose={() => navigate({ to: "/flights", search: {} as never })}
          onRetry={error ? () => navigate({ search: (prev: any) => ({ ...prev }) }) : undefined}
        />

        {!isSearching && !error && offers.length > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <FlightFilters
              offers={offers}
              currency={currency}
              stops={stopsFilter}
              airlines={airlineFilter}
              baggage={baggageOnly}
              recommended={recommendedOnly}
              onChange={(p) => {
                const patch: Record<string, any> = {};
                if (p.stops !== undefined) patch.stops = p.stops;
                if (p.airlines !== undefined)
                  patch.airlines = p.airlines.length ? p.airlines.join(",") : undefined;
                if (p.baggage !== undefined) patch.baggage = p.baggage ? "1" : undefined;
                if (p.recommended !== undefined) patch.recommended = p.recommended ? "1" : undefined;
                setSearch(patch);
              }}
            />

            <div className="space-y-3">
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm">
                  <span className="font-bold text-foreground">{filtered.length}</span>
                  <span className="text-muted-foreground">
                    {" "}flights · {query.origin?.split(" ")[0] ?? toIata(query.origin)} {"→"}{" "}
                    {query.destination?.split(" ")[0] ?? toIata(query.destination)}
                  </span>
                </div>
                <div className="flex gap-1 rounded-full bg-secondary p-1">
                  {(["best", "cheapest", "fastest"] as const).map((t) => {
                    const active = sort === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setSearch({ sort: t })}
                        className={
                          "rounded-full px-3 py-1.5 text-xs font-bold capitalize transition " +
                          (active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground")
                        }
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filtered.map((o: any) => (
                <FlightResultCard key={o.id} offer={o} />
              ))}

              {filtered.length === 0 && (
                <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                  No flights match the current filters.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}

/* branded full-screen searching overlay */
function FlightSearchingOverlay({ query }: { query: any }) {
  const from = query.origin?.split(" ")[0] || toIata(query.origin) || "Origin";
  const to = query.destination?.split(" ")[0] || toIata(query.destination) || "Destination";
  const destLabel = query.destination || to;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-md animate-fade-in"
    >
      <div className="mx-4 flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center shadow-elevated animate-scale-in">
        {/* Brand logo */}
        <div className="flex items-center gap-2">
          <img
            src={iswitchLogo}
            alt="iSwitch"
            className="h-10 w-auto rounded-lg shadow-card"
          />
          <span className="font-display text-lg font-extrabold text-foreground">iSwitch</span>
        </div>

        {/* Animated plane */}
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
            <Plane className="h-5 w-5 animate-pulse text-primary-foreground" strokeWidth={2.4} />
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 font-display text-base font-bold text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Searching for your flight…
          </div>
          <p className="text-xs text-muted-foreground">
            {from} <ArrowRight className="inline h-3 w-3" /> {to} · Comparing 500+ airlines
          </p>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
          <div className="h-full w-1/3 animate-[slide-in-right_1.2s_ease-in-out_infinite] rounded-full bg-gradient-primary" />
        </div>

        {/* Destination tip header */}
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
          <Sparkles className="h-3 w-3" />
          Tips for {destLabel}
        </div>

        <TravelTip category="flights" className="!mt-0" />
      </div>
    </div>
  );
}

/* no-results dialog */
function NoResultsDialog({
  open,
  title,
  message,
  onClose,
  onRetry,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-lg bg-gradient-primary px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow transition hover:opacity-95"
            >
              Try again
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-foreground transition hover:bg-secondary"
          >
            Back to flights
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
