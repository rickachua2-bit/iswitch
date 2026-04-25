import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FlightForm } from "@/components/FlightForm";
import { FlightResultCard } from "@/components/flights/FlightResultCard";
import { FlightFilters } from "@/components/flights/FlightFilters";
import { startFlightSearch, pollFlightSearch } from "@/server/travsify";
import { toIata } from "@/lib/airports";
import { Plane, Loader2, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  departure: z.string().optional(),
  returnDate: z.string().optional(),
  travelers: z.string().optional(),
  trip: z.string().optional(),
  cabin: z.string().optional(),
  adults: z.string().optional(),
  children: z.string().optional(),
  infants: z.string().optional(),
  segments: z.string().optional(),
  stops: z.string().optional(),
  airlines: z.string().optional(),
  sort: z.enum(["best", "cheapest", "fastest"]).optional(),
  baggage: z.string().optional(),
  recommended: z.string().optional(),
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

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: "Cheap Flights — Compare 500+ airlines | iSwitch" },
      { name: "description", content: "Compare and book real-time flights worldwide on iSwitch. Best price guarantee on 500+ airlines." },
      { property: "og:title", content: "Cheap Flights | iSwitch" },
      { property: "og:description", content: "Search and book the cheapest flights worldwide." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>
  ),
  component: FlightsPage,
});

/* ----------------------------- helpers ----------------------------- */


function fmtTime(iso?: string) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(11, 16) || "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

function parseDuration(d?: string | number): number {
  // ISO 8601 PT2H45M → minutes
  if (d == null) return 0;
  if (typeof d === "number") return d;
  const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (Number(m[1] || 0)) * 60 + Number(m[2] || 0);
}

function fmtDuration(min: number) {
  if (!min) return "--";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

type Slice = {
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  duration?: string | number;
  segments?: Array<{
    departing_at?: string;
    arriving_at?: string;
    origin?: { iata_code?: string; name?: string };
    destination?: { iata_code?: string; name?: string };
    operating_carrier?: { name?: string; iata_code?: string };
    marketing_carrier?: { name?: string; iata_code?: string };
    aircraft?: { name?: string };
    flight_number?: string;
    duration?: string | number;
  }>;
};

function offerSlices(o: any): Slice[] {
  return (o?.slices ?? o?.itineraries ?? []) as Slice[];
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

function totalCurrency(o: any): string {
  return o?.total_currency ?? o?.price?.currency ?? o?.currency ?? "USD";
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

/* ----------------------------- polling hook ----------------------------- */

type SearchState = {
  status: "idle" | "starting" | "polling" | "completed" | "failed";
  offers: any[];
  error: string | null;
};

function useFlightSearch(search: any): SearchState & { query: any } {
  const [state, setState] = useState<SearchState>({
    status: "idle",
    offers: [],
    error: null,
  });

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

          const MAX_ATTEMPTS = 30; // ~60s of polling
          let attempts = 0;

          const poll = async () => {
            if (isStale()) return;
            attempts += 1;
            const res: any = await pollFlightSearch({
              data: { search_id: start.search_id },
            });
            if (isStale()) return;

            const offers: any[] = res?.data?.offers ?? [];
            if (res?.status === "completed") {
              setState({ status: "completed", offers, error: null });
              return;
            }
            if (res?.status === "failed") {
              setState({
                status: "failed",
                offers,
                error: res?.error ?? "Search failed.",
              });
              return;
            }
            setState({ status: "polling", offers, error: null });

            if (attempts >= MAX_ATTEMPTS) {
              setState({
                status: offers.length ? "completed" : "failed",
                offers,
                error: offers.length ? null : "Search took too long. Please try again.",
              });
              return;
            }
            timer = setTimeout(poll, 2000);
          };

          timer = setTimeout(poll, 2000);
          return;
        }

        setState({ status: "completed", offers: inlineOffers, error: null });
      } catch (err: any) {
        if (isStale()) return;
        setState({
          status: "failed",
          offers: [],
          error: err?.message ?? "Search failed.",
        });
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
    },
  };
}

/* ----------------------------- page ----------------------------- */

function FlightsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const { offers, error, status, query } = useFlightSearch(search);
  const isSearching = status === "starting" || status === "polling";

  const hasSearched = !!query.departure && !!query.origin && !!query.destination;
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
    else xs.sort((a, b) => {
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
      <FlightSearchBar pending={isSearching} />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {isSearching ? (
          <SearchingState query={query} />
        ) : !hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Enter your origin, destination and departure date above to search live flights.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm shadow-card">
            <div className="font-bold text-foreground">Flights are taking a moment</div>
            <div className="mt-1 text-muted-foreground">{error}</div>
            <button
              onClick={() => navigate({ search: (prev: any) => ({ ...prev }) })}
              className="mt-3 rounded-lg bg-gradient-primary px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow transition hover:opacity-95"
            >
              Try again
            </button>
          </div>
        ) : offers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Plane className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /> No offers found. Try different dates or airports.
          </div>
        ) : (
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
                  <span className="text-muted-foreground"> flights · {query.origin?.split(" ")[0] ?? toIata(query.origin)} → {query.destination?.split(" ")[0] ?? toIata(query.destination)}</span>
                </div>
                <div className="flex gap-1 rounded-full bg-secondary p-1">
                  {(["best", "cheapest", "fastest"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSearch({ sort: t })}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                        sort === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
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

/* ----------------------------- search bar ----------------------------- */

function FlightSearchBar({ pending = false }: { pending?: boolean }) {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  return (
    <section className="bg-gradient-hero pb-8 pt-6 md:pb-10">
      <div className="mx-auto mb-5 max-w-4xl px-4 text-center">
        <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
          Compare cheap flights worldwide
        </h1>
        <p className="mt-2 text-sm text-primary-foreground/80">
          Live NDC + GDS inventory · 500+ airlines · Real-time confirmation
        </p>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4">
        <div className="rounded-2xl bg-card p-4 shadow-elevated md:p-5">
          <FlightForm
            pending={pending}
            onSearch={(q) => navigate({
              search: { ...q, sort: search.sort ?? "best" } as never,
            })}
          />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- searching state ----------------------------- */

function SearchingState({ query }: { query: any }) {
  const from = query.origin?.split(" ")[0] || toIata(query.origin) || "Origin";
  const to = query.destination?.split(" ")[0] || toIata(query.destination) || "Destination";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-accent/5 p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-primary shadow-glow">
              <Plane className="h-5 w-5 animate-pulse text-primary-foreground" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              Searching live flights
              <span className="inline-flex gap-0.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              </span>
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {from} <ArrowRight className="inline h-3 w-3" /> {to} · Comparing 500+ airlines in real time
            </div>
          </div>
        </div>
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>

      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-secondary" />
                <div className="h-2.5 w-48 animate-pulse rounded bg-secondary/70" />
              </div>
              <div className="hidden flex-1 items-center justify-between gap-3 md:flex">
                <div className="h-6 w-14 animate-pulse rounded bg-secondary" />
                <div className="h-px flex-1 bg-border" />
                <div className="h-4 w-16 animate-pulse rounded bg-secondary/70" />
                <div className="h-px flex-1 bg-border" />
                <div className="h-6 w-14 animate-pulse rounded bg-secondary" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="h-7 w-24 animate-pulse rounded bg-secondary" />
              <div className="h-8 w-24 animate-pulse rounded-lg bg-primary/20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

