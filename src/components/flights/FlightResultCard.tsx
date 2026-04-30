import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plane, Wifi, Utensils, Tv, Zap,
  Briefcase, Luggage, RefreshCw, Pencil, Check, X, Clock, Loader2,
} from "lucide-react";
import { usePriceFormat } from "@/lib/use-price-format";
import { useSelectOffer } from "@/lib/use-select-offer";
import { ErrorToast } from "@/components/booking/ErrorToast";

/* ---------------- shared utils (kept local to keep card self-contained) ---------------- */

function fmtTime(iso?: string) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(11, 16) || "--:--";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}
function fmtDateShort(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}
function dayOffset(depISO?: string, arrISO?: string) {
  if (!depISO || !arrISO) return 0;
  const a = new Date(depISO).toDateString();
  const b = new Date(arrISO).toDateString();
  if (a === b) return 0;
  const diff = Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
  return diff;
}
function parseDuration(d?: string | number): number {
  if (d == null) return 0;
  if (typeof d === "number") return d;
  const m = String(d).match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}
function fmtDuration(min: number) {
  if (!min) return "--";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/* ---------------- card ---------------- */

export function FlightResultCard({ offer }: { offer: any }) {
  const [open, setOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const formatPrice = usePriceFormat();
  const { select, isSelecting, selecting, error: selectError, clearError } = useSelectOffer();

  const slices: any[] = offer?.slices ?? offer?.itineraries ?? [];
  const carrier = offerCarrier(offer);
  const price = Number(offer?.total_amount ?? offer?.price?.total ?? 0);
  const cur = offer?.total_currency ?? offer?.price?.currency ?? "USD";

  // Build fare options. Prefer real ones from API; otherwise derive a Trip.com-style
  // Standard / Flex pair from the price so the experience matches even with sample data.
  const fares = buildFares(offer, price, cur);

  function selectFare(fareId: string) {
    const selectedFare = fares.find((f: any) => f.id === fareId);
    // Mirror the legacy keys so /flights/book session-recovery still works.
    try {
      sessionStorage.setItem(`offer:${offer.id}`, JSON.stringify(offer));
      sessionStorage.setItem(`fare:${offer.id}:${fareId}`, JSON.stringify(selectedFare));
    } catch { /* ignore quota errors */ }

    void select({
      vertical: "flights",
      sessionPrefix: "offer",
      cachePrefix: "flight",
      id: String(offer.id),
      payload: { offer, fares: { [fareId]: selectedFare } },
      to: "/flights/book",
      search: { offer_id: offer.id, fare_id: fareId },
    });
  }
  const fareLoadingId = isSelecting(String(offer.id)) ? "active" : null;

  const sourceLabel =
    offer?.source === "booking" ? "Booking.com" :
    offer?.source === "duffel"  ? "Duffel" : null;
  const ownerLogo = typeof offer?.owner_logo === "string" ? offer.owner_logo : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition hover:shadow-elevated">
      {/* baggage tag strip */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-4 py-1.5 text-[11px] font-semibold text-primary">
        <Briefcase className="h-3 w-3" />
        Checked baggage included
        {sourceLabel && (
          <span
            className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
            title={[
              `Source: ${sourceLabel}`,
              offer?.fetched_at ? `Fetched: ${new Date(offer.fetched_at).toLocaleTimeString()}` : null,
              offer?.provider_request_id ? `Req: ${String(offer.provider_request_id).slice(-6)}` : null,
            ].filter(Boolean).join(" · ")}
          >
            {sourceLabel}
          </span>
        )}
        <span className="ml-auto text-muted-foreground">
          {offer?.owner?.name || carrier.name}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_auto] md:items-stretch">
        {/* ---- left: slices ---- */}
        <div className="space-y-3">
          {slices.length ? (
            slices.map((slice: any, i: number) => (
              <SliceRow key={i} slice={slice} carrier={carrier} ownerLogo={ownerLogo} />
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              {carrier.name} · offer {String(offer.id).slice(0, 10)}
            </div>
          )}

          {/* amenity icons strip (Trip.com style under airline name) */}
          <div className="flex items-center gap-3 border-t border-dashed border-border pt-2 text-[11px] text-muted-foreground">
            <Amenity icon={Zap} label="Power" />
            <Amenity icon={Utensils} label="Meal" />
            <Amenity icon={Wifi} label="Wi-Fi" />
            <Amenity icon={Tv} label="Entertainment" />
            <span className="ml-auto text-[11px] text-muted-foreground">
              Operated by {carrier.name}
            </span>
          </div>
        </div>

        {/* ---- right: price + select ---- */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-3 md:flex-col md:items-end md:justify-center md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div className="text-right">
            <div className="text-2xl font-extrabold text-primary md:text-[28px]">
              {formatPrice(price, cur)}
            </div>
            <div className="text-[11px] text-muted-foreground">per adult, taxes incl.</div>
          </div>
          <div className="flex flex-col items-stretch gap-1.5 md:items-end">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-card transition hover:bg-primary-glow"
            >
              Select <ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />
            </button>
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-primary/30 bg-card px-4 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5"
            >
              {showDetails ? "Hide details" : "Learn more"}
              <ChevronDown className={`h-3.5 w-3.5 transition ${showDetails ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ---- inline fare-select panel (Trip.com style) ---- */}
      {open && (
        <div className="border-t border-border bg-secondary/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-foreground">Select your fare</div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-card hover:text-foreground"
              aria-label="Close fare select"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {fares.map((f: any) => (
              <FareCard key={f.id} fare={f} formatPrice={formatPrice} onPick={() => selectFare(f.id)} loading={!!fareLoadingId} />
            ))}
          </div>
        </div>
      )}
      <ErrorToast message={selectError} onDismiss={clearError} />

      {/* ---- show flight details (segment-level) ---- */}
      {showDetails && (
        <div className="border-t border-border bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-2">
              <CarrierBadge code={carrier.code} name={carrier.name} logoUrl={ownerLogo} />
              <span className="text-foreground">{carrier.name}</span>
              <span className="text-muted-foreground">· Full itinerary</span>
            </span>
            <span className="text-[11px]">
              {slices.length} {slices.length === 1 ? "leg" : "legs"} · {formatPrice(price, cur)}
            </span>
          </div>
          <div className="space-y-4 p-4">
            {slices.map((slice: any, i: number) => (
              <SegmentDetails key={i} slice={slice} index={i} />
            ))}
            {slices.length === 0 && (
              <div className="text-xs text-muted-foreground">Detailed segments unavailable.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function SliceRow({ slice, carrier, ownerLogo }: { slice: any; carrier: { name: string; code: string }; ownerLogo?: string | null }) {
  const segs = slice.segments ?? [];
  const first = segs[0];
  const last = segs[segs.length - 1];
  const stops = Math.max(0, segs.length - 1);
  const duration =
    parseDuration(slice.duration) || segs.reduce((s: number, x: any) => s + parseDuration(x.duration), 0);
  const oCode = first?.origin?.iata_code ?? slice.origin?.iata_code ?? slice.origin ?? "---";
  const dCode = last?.destination?.iata_code ?? slice.destination?.iata_code ?? slice.destination ?? "---";
  const stopLayover = stops > 0 ? layoverInfo(segs) : "";
  const offset = dayOffset(first?.departing_at, last?.arriving_at);

  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-4">
      {/* airline mark */}
      <div className="flex w-24 flex-col items-start gap-1">
        <CarrierBadge code={carrier.code} name={carrier.name} logoUrl={(first?.marketing_carrier_logo as string | null) ?? ownerLogo ?? null} />
        <div className="truncate text-[11px] font-semibold text-muted-foreground">
          {carrier.name}
        </div>
      </div>

      {/* dep / line / arr */}
      <div className="grid grid-cols-[1fr_minmax(140px,1.4fr)_1fr] items-center gap-2">
        <div>
          <div className="text-xl font-extrabold leading-none text-foreground md:text-[22px]">
            {fmtTime(first?.departing_at)}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {oCode} {first?.origin?.terminal ? `· T${first.origin.terminal}` : ""}
          </div>
        </div>

        <div className="flex flex-col items-center px-1">
          <div className="text-[11px] font-semibold text-foreground">{fmtDuration(duration)}</div>
          <div className="relative my-1 h-px w-full bg-border">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
            {stops > 0 &&
              Array.from({ length: stops }).map((_, i) => (
                <span
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full border border-primary bg-card"
                  style={{ left: `${((i + 1) / (stops + 1)) * 100}%` }}
                />
              ))}
            <span className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-[11px] font-semibold text-muted-foreground">
            {stops === 0 ? (
              <span className="text-emerald-600">Non-stop</span>
            ) : (
              <span>{stopLayover || `${stops} stop${stops > 1 ? "s" : ""}`}</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-extrabold leading-none text-foreground md:text-[22px]">
            {fmtTime(last?.arriving_at)}
            {offset > 0 && (
              <sup className="ml-0.5 text-[10px] font-bold text-destructive">+{offset}</sup>
            )}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-muted-foreground">
            {dCode} {last?.destination?.terminal ? `· T${last.destination.terminal}` : ""}
          </div>
        </div>
      </div>

      <div className="col-span-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {fmtDateShort(first?.departing_at)}
      </div>
    </div>
  );
}

function codeOf(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.iata_code ?? v.code ?? v.airport_code ?? "";
}
function nameOf(v: any): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.name ?? v.city_name ?? v.airport_name ?? v.iata_code ?? "";
}

function SegmentDetails({ slice, index }: { slice: any; index: number }) {
  const segs = slice.segments ?? [];
  const sliceOrigin = slice.origin;
  const sliceDest = slice.destination;
  const lastIdx = segs.length - 1;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {index === 0 ? "Outbound" : `Leg ${index + 1}`}
        <span className="ml-2 font-medium normal-case text-muted-foreground/80">
          {codeOf(sliceOrigin) || "—"} {"→"} {codeOf(sliceDest) || "—"}
        </span>
      </div>
      <div className="space-y-3">
        {segs.map((seg: any, i: number) => {
          // The Travsify response often only carries times + carrier on each
          // segment. Derive origin/destination from the slice when missing:
          // first segment uses slice.origin, last uses slice.destination,
          // intermediates fall back to a "Connection" label.
          const segOrigin = seg.origin ?? (i === 0 ? sliceOrigin : null);
          const segDest = seg.destination ?? (i === lastIdx ? sliceDest : null);
          const oCode = codeOf(segOrigin);
          const dCode = codeOf(segDest);
          const oName = nameOf(segOrigin) || oCode || "Connection";
          const dName = nameOf(segDest) || dCode || "Connection";
          const carrierName =
            (typeof seg.marketing_carrier === "object" && seg.marketing_carrier?.name) ||
            (typeof seg.operating_carrier === "object" && seg.operating_carrier?.name) ||
            "";
          const carrierCode =
            (typeof seg.marketing_carrier === "string" && seg.marketing_carrier) ||
            (typeof seg.marketing_carrier === "object" && seg.marketing_carrier?.iata_code) ||
            "";

          const nextSeg = segs[i + 1];
          const layMins = nextSeg ? layoverMins(seg, nextSeg) : 0;
          const longLayover = layMins >= 6 * 60; // 6h+ → highlight transit
          const shortLayover = layMins > 0 && layMins < 60; // tight connection

          return (
            <div key={i}>
              <div className="grid grid-cols-[80px_1fr] items-start gap-3 border-l-2 border-primary/30 pl-3">
                <div className="text-right text-xs">
                  <div className="font-bold">{fmtTime(seg.departing_at)}</div>
                  <div className="text-muted-foreground">{oCode || "—"}</div>
                </div>
                <div className="text-sm">
                  <div className="font-semibold">
                    {oName} {"→"} {dName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {carrierName || carrierCode || "Airline"}
                    {carrierCode && carrierName ? ` (${carrierCode})` : ""}
                    {seg.flight_number ? ` ${seg.flight_number}` : ""}
                    {seg.aircraft?.name ? ` · ${seg.aircraft.name}` : ""}
                    {seg.duration ? (
                      <>
                        {" · "}
                        <Clock className="inline h-3 w-3" /> {fmtDuration(parseDuration(seg.duration))}
                      </>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs">
                    <span className="font-bold">{fmtTime(seg.arriving_at)}</span> arrives at {dName}
                  </div>
                </div>
              </div>

              {nextSeg && layMins > 0 && (
                <div
                  className={`my-2 ml-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                    longLayover
                      ? "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      : shortLayover
                      ? "border-destructive/40 bg-destructive/5 text-destructive"
                      : "border-border bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-semibold">
                    {fmtDuration(layMins)} layover
                  </span>
                  <span className="opacity-70">
                    in {codeOf(seg.destination) || codeOf(nextSeg.origin) || "transit"}
                  </span>
                  {longLayover && (
                    <span className="ml-auto rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Long stop · transit visa may apply
                    </span>
                  )}
                  {shortLayover && (
                    <span className="ml-auto rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Tight connection
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FareCard({
  fare,
  onPick,
  formatPrice,
  loading,
}: {
  fare: ReturnType<typeof buildFares>[number];
  onPick: () => void;
  formatPrice: (amount: number, currency: string) => string;
  loading?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border bg-card p-3 shadow-card transition hover:border-primary ${
        fare.recommended ? "border-primary" : "border-border"
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <div className="text-sm font-bold text-foreground">{fare.name}</div>
          {fare.recommended && (
            <div className="text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              Best value
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-primary">
            {formatPrice(fare.price, fare.currency)}
          </div>
        </div>
      </div>

      <ul className="mb-3 space-y-1 text-[12px] text-muted-foreground">
        <FareLine icon={Luggage} label={fare.carryOn} ok />
        <FareLine icon={Briefcase} label={fare.checked} ok={fare.checkedOk} />
        <FareLine icon={RefreshCw} label={fare.refundable} ok={fare.refundableOk} />
        <FareLine icon={Pencil} label={fare.changeable} ok={fare.changeableOk} />
      </ul>

      <button
        onClick={onPick}
        disabled={loading}
        className="mt-auto inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-glow disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opening…</>
        ) : (
          <>Book {fare.name} <ChevronRight className="h-3.5 w-3.5" /></>
        )}
      </button>
    </div>
  );
}

function FareLine({
  icon: Icon,
  label,
  ok,
}: {
  icon: any;
  label: string;
  ok: boolean;
}) {
  return (
    <li className="flex items-center gap-2">
      <Icon className={`h-3.5 w-3.5 ${ok ? "text-emerald-600" : "text-muted-foreground"}`} />
      <span className={ok ? "text-foreground" : ""}>{label}</span>
      {ok ? (
        <Check className="ml-auto h-3 w-3 text-emerald-600" />
      ) : (
        <X className="ml-auto h-3 w-3 text-muted-foreground/60" />
      )}
    </li>
  );
}

function Amenity({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={label}>
      <Icon className="h-3 w-3 text-primary/70" />
      {label}
    </span>
  );
}

function CarrierBadge({ code, name, logoUrl }: { code: string; name?: string; logoUrl?: string | null }) {
  const [idx, setIdx] = useState(0);
  const valid = !!code && code !== "??" && /^[A-Z0-9]{2,3}$/.test(code);
  // Booking.com supplies an authoritative carrier logo; prefer it when present,
  // then fall back to public CDN logos derived from the IATA code.
  const sources: string[] = [];
  if (typeof logoUrl === "string" && logoUrl) sources.push(logoUrl);
  if (valid) {
    sources.push(
      `https://content.airhex.com/content/logos/airlines_${code}_100_40_r.png`,
      `https://images.kiwi.com/airlines/64/${code}.png`,
      `https://pics.avs.io/120/40/${code}.png`,
    );
  }
  const src = sources[idx];
  return (
    <div
      className="flex h-9 w-14 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-1 shadow-sm"
      title={name || code}
    >
      {src ? (
        <img
          src={src}
          alt={`${name || code} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold tracking-wider text-primary">
          {valid ? code : <Plane className="h-3 w-3" />}
        </span>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

const NAME_TO_IATA: Record<string, string> = {
  "qatar airways": "QR",
  "turkish airlines": "TK",
  "british airways": "BA",
  "emirates": "EK",
  "etihad airways": "EY",
  "etihad": "EY",
  "lufthansa": "LH",
  "air france": "AF",
  "klm": "KL",
  "klm royal dutch airlines": "KL",
  "delta": "DL",
  "delta air lines": "DL",
  "united airlines": "UA",
  "united": "UA",
  "american airlines": "AA",
  "virgin atlantic": "VS",
  "ethiopian airlines": "ET",
  "kenya airways": "KQ",
  "egyptair": "MS",
  "egypt air": "MS",
  "royal air maroc": "AT",
  "rwandair": "WB",
  "south african airways": "SA",
  "saudia": "SV",
  "saudi arabian airlines": "SV",
  "fly dubai": "FZ",
  "flydubai": "FZ",
  "air peace": "P4",
  "ibom air": "QI",
  "arik air": "W3",
  "asky airlines": "KP",
  "asky": "KP",
  "iberia": "IB",
  "swiss": "LX",
  "swiss international air lines": "LX",
  "austrian airlines": "OS",
  "tap air portugal": "TP",
  "tap portugal": "TP",
  "air canada": "AC",
  "qantas": "QF",
  "singapore airlines": "SQ",
  "cathay pacific": "CX",
  "ana": "NH",
  "all nippon airways": "NH",
  "japan airlines": "JL",
  "korean air": "KE",
  "china southern": "CZ",
  "china eastern": "MU",
  "air china": "CA",
  "thai airways": "TG",
  "vietnam airlines": "VN",
  "malaysia airlines": "MH",
  "garuda indonesia": "GA",
  "jetblue": "B6",
  "alaska airlines": "AS",
  "southwest airlines": "WN",
  "ryanair": "FR",
  "easyjet": "U2",
  "wizz air": "W6",
  "vueling": "VY",
  "norwegian": "DY",
  "finnair": "AY",
  "sas": "SK",
  "scandinavian airlines": "SK",
  "aegean airlines": "A3",
  "pegasus": "PC",
  "pegasus airlines": "PC",
  "gulf air": "GF",
  "oman air": "WY",
  "kuwait airways": "KU",
  "middle east airlines": "ME",
  "mea": "ME",
  "air mauritius": "MK",
  "air seychelles": "HM",
};

function nameToIata(name: string): string {
  return NAME_TO_IATA[name.trim().toLowerCase()] ?? "";
}

function offerCarrier(o: any): { name: string; code: string } {
  const ow = o?.owner ?? o?.validating_carrier ?? null;
  const seg0 = o?.slices?.[0]?.segments?.[0] ?? {};
  const segMc = seg0?.marketing_carrier;

  // marketing_carrier may be a plain IATA string (e.g. "QR") or an object
  const segCode =
    (typeof segMc === "string" && /^[A-Z0-9]{2,3}$/.test(segMc.trim()) ? segMc.trim().toUpperCase() : "") ||
    (typeof segMc === "object" && segMc?.iata_code) || "";
  const segName = (typeof segMc === "object" && segMc?.name) || "";

  // owner may be IATA code, full name, or object
  const ownerIsCode = typeof ow === "string" && /^[A-Z0-9]{2,3}$/.test(ow.trim());
  const ownerCode =
    (typeof ow === "object" && ow?.iata_code) ||
    (ownerIsCode ? ow.trim().toUpperCase() : "") || "";
  const ownerName =
    (typeof ow === "object" && ow?.name) ||
    (typeof ow === "string" && !ownerIsCode ? ow : "") || "";

  const name = ownerName || segName || (ownerIsCode ? String(ow) : "Airline");
  const code = segCode || ownerCode || nameToIata(name) || "??";

  return { name, code };
}

function currencySymbol(cur: string) {
  const c = (cur || "USD").toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  if (c === "NGN") return "₦";
  return c + " ";
}

function layoverInfo(segs: any[]) {
  // Build a compact label that lists all layovers, e.g.
  // "2h 10m in CDG · 1h 30m in DXB"
  if (segs.length < 2) return "";
  const parts: string[] = [];
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i];
    const b = segs[i + 1];
    if (!a?.arriving_at || !b?.departing_at) continue;
    const mins = Math.round(
      (new Date(b.departing_at).getTime() - new Date(a.arriving_at).getTime()) / 60000,
    );
    const place =
      (typeof b?.origin === "object" ? b.origin?.iata_code : b?.origin) ||
      (typeof a?.destination === "object" ? a.destination?.iata_code : a?.destination) ||
      "stop";
    if (mins > 0) parts.push(`${fmtDuration(mins)} in ${place}`);
  }
  if (!parts.length) return `${segs.length - 1} stop${segs.length > 2 ? "s" : ""}`;
  return parts.join(" · ");
}

/** Compute layover minutes between two consecutive segments. */
function layoverMins(prev: any, next: any): number {
  if (!prev?.arriving_at || !next?.departing_at) return 0;
  return Math.round(
    (new Date(next.departing_at).getTime() - new Date(prev.arriving_at).getTime()) / 60000,
  );
}

function buildFares(offer: any, price: number, cur: string) {
  // If provider returns offer.fares array use it.
  if (Array.isArray(offer?.fares) && offer.fares.length) {
    return offer.fares.map((f: any, i: number) => ({
      id: f.id ?? `fare-${i}`,
      name: f.name ?? (i === 0 ? "Standard" : "Flex"),
      price: Number(f.total_amount ?? f.price ?? price),
      currency: f.total_currency ?? f.currency ?? cur,
      recommended: i === 0,
      carryOn: f.cabin_baggage ?? "Carry-on 7 kg",
      checked: f.checked_baggage ?? "Checked bag included",
      checkedOk: f.checked_baggage_included ?? true,
      refundable: f.refundable ? "Refundable" : "Non-refundable",
      refundableOk: !!f.refundable,
      changeable: f.changeable ? "Changes allowed" : "Change fee applies",
      changeableOk: !!f.changeable,
    }));
  }

  // Otherwise derive Standard / Flex from base price.
  return [
    {
      id: "standard",
      name: "Standard",
      price,
      currency: cur,
      recommended: true,
      carryOn: "Carry-on 7 kg",
      checked: "Checked bag included",
      checkedOk: true,
      refundable: "Non-refundable",
      refundableOk: false,
      changeable: "Change fee applies",
      changeableOk: false,
    },
    {
      id: "flex",
      name: "Flex",
      price: Math.round(price * 1.18),
      currency: cur,
      recommended: false,
      carryOn: "Carry-on 7 kg",
      checked: "2 checked bags included",
      checkedOk: true,
      refundable: "Refundable",
      refundableOk: true,
      changeable: "Free changes",
      changeableOk: true,
    },
  ];
}
