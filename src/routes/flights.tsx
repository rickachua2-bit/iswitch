import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FlightForm } from "@/components/FlightForm";
import { FlightResultCard } from "@/components/flights/FlightResultCard";
import { FlightFilters } from "@/components/flights/FlightFilters";
import { searchFlights } from "@/server/travsify";
import { toIata } from "@/lib/airports";
import { Plane, Loader2, ArrowRight } from "lucide-react";
import { useMemo } from "react";
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
  stops: z.string().optional(),         // "any" | "0" | "1" | "2"
  airlines: z.string().optional(),       // comma-separated IATA codes
  sort: z.enum(["best", "cheapest", "fastest"]).optional(),
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
      { name: "description", content: "Compare and book real-time flights worldwide via our NDC partner. Best price guarantee on 500+ airlines." },
      { property: "og:title", content: "Cheap Flights | iSwitch" },
      { property: "og:description", content: "Search and book the cheapest flights worldwide." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => ({
    origin: search.origin ?? "",
    destination: search.destination ?? "",
    departure: search.departure ?? "",
    returnDate: search.returnDate ?? "",
    travelers: search.travelers ?? "",
    trip: search.trip ?? "round-trip",
    cabin: search.cabin ?? "economy",
    adults: search.adults ?? "",
    children: search.children ?? "",
    infants: search.infants ?? "",
    segments: search.segments ?? "",
  }),
  loader: async ({ deps }) => {
    const segs = parseSegments(deps.segments);
    const isMulti = deps.trip === "multi-city" && segs.length >= 2;
    const hasSimple = deps.departure && deps.origin && deps.destination;
    if (!isMulti && !hasSimple) {
      return { offers: [], query: deps, error: null as string | null };
    }
    try {
      const adults = deps.adults ? Number(deps.adults) : adultsFromTravelers(deps.travelers);
      const payload = isMulti
        ? {
            segments: segs.map((s) => ({
              origin: toIata(s.origin),
              destination: toIata(s.destination),
              departure_date: s.departure,
            })),
            adults,
            cabin: deps.cabin || undefined,
            children: deps.children ? Number(deps.children) : undefined,
            infants: deps.infants ? Number(deps.infants) : undefined,
          }
        : {
            origin: toIata(deps.origin),
            destination: toIata(deps.destination),
            departure_date: deps.departure,
            return_date: deps.returnDate || undefined,
            adults,
            cabin: deps.cabin || undefined,
            children: deps.children ? Number(deps.children) : undefined,
            infants: deps.infants ? Number(deps.infants) : undefined,
          };
      const res = await searchFlights({ data: payload });
      return { offers: res?.data?.offers ?? [], query: deps, error: res?.error ?? null as string | null };
    } catch (e: any) {
      return { offers: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
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

/* ----------------------------- page ----------------------------- */

function FlightsPage() {
  const { offers, query, error } = Route.useLoaderData() as any;
  const [selected, setSelected] = useState<any | null>(null);
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  // Detect pending navigation/loader runs to show a real loading state on Search click
  const isSearching = useRouterState({
    select: (s) => s.isLoading || s.isTransitioning,
  });

  const hasSearched = !!query.departure && !!query.origin && !!query.destination;
  const sort = search.sort ?? "best";
  const stopsFilter = search.stops ?? "any";
  const airlinesCsv = search.airlines ?? "";
  const airlineFilter = airlinesCsv ? airlinesCsv.split(",") : [];

  /* ----- derive filterable data ----- */
  const allAirlines = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of offers) {
      const c = offerCarrier(o);
      if (c.code && c.code !== "??") map.set(c.code, c.name);
    }
    return Array.from(map, ([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [offers]);

  const priceRange = useMemo(() => {
    if (!offers.length) return { min: 0, max: 0 };
    const xs = offers.map(totalAmount);
    return { min: Math.min(...xs), max: Math.max(...xs) };
  }, [offers]);

  /* ----- filter + sort ----- */
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
      // "best" = price + duration heuristic
      const pa = totalAmount(a) + offerDurationMin(a) * 0.5;
      const pb = totalAmount(b) + offerDurationMin(b) * 0.5;
      return pa - pb;
    });
    return xs;
  }, [offers, sort, stopsFilter, airlinesCsv]);

  function setSearch(patch: Record<string, any>) {
    navigate({ search: (prev: any) => ({ ...prev, ...patch }) });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />

      {/* compact gradient search bar (Trip.com-style) */}
      <FlightSearchBar pending={isSearching} />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {isSearching ? (
          <SearchingState query={query} />
        ) : !hasSearched ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Enter your origin, destination and departure date above to search live flights.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : offers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            <Plane className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /> No offers found. Try different dates or airports.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            {/* ----- filters sidebar ----- */}
            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                  <Filter className="h-4 w-4 text-primary" /> Filters
                </h3>

                <FilterGroup title="Stops">
                  {[
                    { v: "any", l: "Any" },
                    { v: "0", l: "Non-stop" },
                    { v: "1", l: "1 stop" },
                    { v: "2", l: "2+ stops" },
                  ].map((opt) => (
                    <label key={opt.v} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
                      <input
                        type="radio"
                        name="stops"
                        checked={stopsFilter === opt.v}
                        onChange={() => setSearch({ stops: opt.v })}
                        className="accent-primary"
                      />
                      {opt.l}
                    </label>
                  ))}
                </FilterGroup>

                {allAirlines.length > 0 && (
                  <FilterGroup title="Airlines">
                    <div className="max-h-48 overflow-y-auto pr-1">
                      {allAirlines.map((a) => {
                        const checked = airlineFilter.includes(a.code);
                        return (
                          <label key={a.code} className="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? airlineFilter.filter((x) => x !== a.code)
                                  : [...airlineFilter, a.code];
                                setSearch({ airlines: next.length ? next.join(",") : undefined });
                              }}
                              className="accent-primary"
                            />
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary">
                              {a.code}
                            </span>
                            <span className="truncate">{a.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </FilterGroup>
                )}

                <FilterGroup title="Price range">
                  <div className="text-xs text-muted-foreground">
                    From <span className="font-bold text-foreground">{totalCurrency(offers[0])} {Math.round(priceRange.min)}</span>
                    {" "}to{" "}
                    <span className="font-bold text-foreground">{Math.round(priceRange.max)}</span>
                  </div>
                </FilterGroup>
              </div>

              <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-4 text-xs text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-bold text-foreground">
                  <Briefcase className="h-3.5 w-3.5 text-primary" /> Best price guarantee
                </div>
                Found a cheaper price within 24h? We'll refund the difference.
              </div>
            </aside>

            {/* ----- results column ----- */}
            <div className="space-y-3">
              {/* sort + summary */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
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
                <FlightCard key={o.id} offer={o} onBook={() => setSelected(o)} />
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

      {selected && (
        <BookingDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          title="Confirm flight booking"
          summary={`${offerCarrier(selected).name} · ${totalCurrency(selected)} ${totalAmount(selected)}`}
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

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
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
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card"
        >
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

/* ----------------------------- card ----------------------------- */

function FlightCard({ offer, onBook }: { offer: any; onBook: () => void }) {
  const [open, setOpen] = useState(false);
  const slices = offerSlices(offer);
  const carrier = offerCarrier(offer);
  const price = totalAmount(offer);
  const cur = totalCurrency(offer);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:shadow-elevated">
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center md:p-5">
        <div className="space-y-3">
          {slices.map((slice, i) => (
            <SliceRow key={i} slice={slice} carrier={carrier} />
          ))}
          {slices.length === 0 && (
            // fallback when API doesn't return slices yet — show carrier + raw price
            <div className="flex items-center gap-3">
              <CarrierBadge code={carrier.code} />
              <div>
                <div className="text-sm font-bold">{carrier.name}</div>
                <div className="text-xs text-muted-foreground">Offer {String(offer.id).slice(0, 12)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-4 md:flex-col md:items-end md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total price</div>
            <div className="text-2xl font-extrabold text-primary md:text-3xl">{cur} {price.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">All taxes & fees</div>
          </div>
          <button
            onClick={onBook}
            className="rounded-xl bg-gradient-accent px-5 py-2.5 text-xs font-bold text-accent-foreground shadow-card transition hover:opacity-95"
          >
            Select <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-t border-border bg-secondary/30 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/60 md:px-5"
      >
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Luggage className="h-3.5 w-3.5" /> Carry-on included</span>
          <span className="hidden items-center gap-1 sm:inline-flex"><Briefcase className="h-3.5 w-3.5" /> Checked bag from $30</span>
          <span className="hidden items-center gap-1 md:inline-flex"><Wifi className="h-3.5 w-3.5" /> Wi-Fi available</span>
        </span>
        <span className="flex items-center gap-1 font-bold text-foreground">
          {open ? "Hide details" : "Show flight details"} <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border bg-background p-4 md:p-5">
          {slices.map((slice, i) => (
            <SliceDetails key={i} slice={slice} index={i} />
          ))}
          {slices.length === 0 && (
            <div className="text-xs text-muted-foreground">Detailed segment info will appear once the airline returns it.</div>
          )}
        </div>
      )}
    </div>
  );
}

function SliceRow({ slice, carrier }: { slice: Slice; carrier: { name: string; code: string } }) {
  const segs = slice.segments ?? [];
  const first = segs[0];
  const last = segs[segs.length - 1];
  const stops = Math.max(0, segs.length - 1);
  const duration = parseDuration(slice.duration) || segs.reduce((s, x) => s + parseDuration(x.duration), 0);
  const oCode = first?.origin?.iata_code ?? slice.origin?.iata_code ?? "---";
  const dCode = last?.destination?.iata_code ?? slice.destination?.iata_code ?? "---";

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
      <CarrierBadge code={carrier.code} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <div className="text-xl font-extrabold text-foreground md:text-2xl">{fmtTime(first?.departing_at)}</div>
          <div className="text-xs font-medium text-muted-foreground">{oCode} · {fmtDate(first?.departing_at)}</div>
        </div>
        <div className="flex flex-col items-center px-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{fmtDuration(duration)}</div>
          <div className="relative my-1 h-px w-20 bg-border md:w-32">
            <Plane className="absolute -top-1.5 right-0 h-3 w-3 text-primary" />
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-wider ${stops === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            {stops === 0 ? "Non-stop" : `${stops} stop${stops > 1 ? "s" : ""}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-foreground md:text-2xl">{fmtTime(last?.arriving_at)}</div>
          <div className="text-xs font-medium text-muted-foreground">{dCode} · {fmtDate(last?.arriving_at)}</div>
        </div>
      </div>
      <div className="hidden text-right text-xs text-muted-foreground md:block">
        <div className="font-bold text-foreground">{carrier.name}</div>
        <div>{first?.marketing_carrier?.iata_code ?? carrier.code} {first?.flight_number ?? ""}</div>
      </div>
    </div>
  );
}

function SliceDetails({ slice, index }: { slice: Slice; index: number }) {
  const segs = slice.segments ?? [];
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {index === 0 ? "Outbound" : "Return"} · {slice.origin?.iata_code} → {slice.destination?.iata_code}
      </div>
      <div className="space-y-3">
        {segs.map((seg, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr] items-start gap-4 border-l-2 border-primary/30 pl-4">
            <div className="text-right text-xs">
              <div className="font-bold">{fmtTime(seg.departing_at)}</div>
              <div className="text-muted-foreground">{seg.origin?.iata_code}</div>
            </div>
            <div className="text-sm">
              <div className="font-semibold">{seg.origin?.name ?? seg.origin?.iata_code} → {seg.destination?.name ?? seg.destination?.iata_code}</div>
              <div className="text-xs text-muted-foreground">
                {seg.marketing_carrier?.name ?? "Airline"} {seg.marketing_carrier?.iata_code} {seg.flight_number}
                {seg.aircraft?.name && <> · {seg.aircraft.name}</>}
                {seg.duration && <> · <Clock className="inline h-3 w-3" /> {fmtDuration(parseDuration(seg.duration))}</>}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-bold">{fmtTime(seg.arriving_at)}</span> arrives at {seg.destination?.name ?? seg.destination?.iata_code}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarrierBadge({ code }: { code: string }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-sm font-extrabold tracking-wider text-primary"
      title={code}
    >
      {code === "??" ? <Plane className="h-5 w-5" /> : code}
    </div>
  );
}
