import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown, ChevronRight, Plane, Wifi, Utensils, Tv, Zap,
  Briefcase, Luggage, RefreshCw, Pencil, Check, X, Clock,
} from "lucide-react";

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
  const navigate = useNavigate();

  const slices: any[] = offer?.slices ?? offer?.itineraries ?? [];
  const carrier = offerCarrier(offer);
  const price = Number(offer?.total_amount ?? offer?.price?.total ?? 0);
  const cur = offer?.total_currency ?? offer?.price?.currency ?? "USD";

  // Build fare options. Prefer real ones from API; otherwise derive a Trip.com-style
  // Standard / Flex pair from the price so the experience matches even with sample data.
  const fares = buildFares(offer, price, cur);

  function selectFare(fareId: string) {
    try {
      sessionStorage.setItem(`offer:${offer.id}`, JSON.stringify(offer));
      sessionStorage.setItem(
        `fare:${offer.id}:${fareId}`,
        JSON.stringify(fares.find((f: any) => f.id === fareId)),
      );
    } catch { /* ignore */ }
    navigate({
      to: "/flights/book",
      search: { offer_id: offer.id, fare_id: fareId } as never,
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition hover:shadow-elevated">
      {/* baggage tag strip */}
      <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/40 px-4 py-1.5 text-[11px] font-semibold text-primary">
        <Briefcase className="h-3 w-3" />
        Checked baggage included
        <span className="ml-auto text-muted-foreground">
          {offer?.owner?.name || carrier.name}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_auto] md:items-stretch">
        {/* ---- left: slices ---- */}
        <div className="space-y-3">
          {slices.length ? (
            slices.map((slice: any, i: number) => (
              <SliceRow key={i} slice={slice} carrier={carrier} />
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
              {currencySymbol(cur)}
              {Math.round(price).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">per adult, taxes incl.</div>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-card transition hover:bg-primary-glow"
          >
            Select <ChevronRight className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`} />
          </button>
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
              <FareCard key={f.id} fare={f} onPick={() => selectFare(f.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ---- show flight details (segment-level) ---- */}
      <details className="group border-t border-border">
        <summary className="flex cursor-pointer items-center justify-between gap-3 bg-card px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary/50">
          <span className="flex items-center gap-1.5">
            <Plane className="h-3.5 w-3.5" /> Flight details
          </span>
          <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-border bg-background p-4">
          {slices.map((slice: any, i: number) => (
            <SegmentDetails key={i} slice={slice} index={i} />
          ))}
          {slices.length === 0 && (
            <div className="text-xs text-muted-foreground">Detailed segments unavailable.</div>
          )}
        </div>
      </details>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function SliceRow({ slice, carrier }: { slice: any; carrier: { name: string; code: string } }) {
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
        <CarrierBadge code={carrier.code} />
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

function SegmentDetails({ slice, index }: { slice: any; index: number }) {
  const segs = slice.segments ?? [];
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {index === 0 ? "Outbound" : `Leg ${index + 1}`}
      </div>
      <div className="space-y-3">
        {segs.map((seg: any, i: number) => (
          <div key={i} className="grid grid-cols-[80px_1fr] items-start gap-3 border-l-2 border-primary/30 pl-3">
            <div className="text-right text-xs">
              <div className="font-bold">{fmtTime(seg.departing_at)}</div>
              <div className="text-muted-foreground">{seg.origin?.iata_code ?? seg.origin}</div>
            </div>
            <div className="text-sm">
              <div className="font-semibold">
                {(seg.origin?.name ?? seg.origin) + " → " + (seg.destination?.name ?? seg.destination)}
              </div>
              <div className="text-xs text-muted-foreground">
                {(seg.marketing_carrier?.name ?? seg.marketing_carrier) || "Airline"}
                {" "}
                {seg.marketing_carrier?.iata_code ?? ""} {seg.flight_number}
                {seg.aircraft?.name && <> · {seg.aircraft.name}</>}
                {seg.duration && (
                  <>
                    {" "}· <Clock className="inline h-3 w-3" /> {fmtDuration(parseDuration(seg.duration))}
                  </>
                )}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-bold">{fmtTime(seg.arriving_at)}</span> arrives at{" "}
                {seg.destination?.name ?? seg.destination}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FareCard({
  fare,
  onPick,
}: {
  fare: ReturnType<typeof buildFares>[number];
  onPick: () => void;
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
            {currencySymbol(fare.currency)}
            {Math.round(fare.price).toLocaleString()}
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
        className="mt-auto inline-flex items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:bg-primary-glow"
      >
        Book {fare.name} <ChevronRight className="h-3.5 w-3.5" />
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

function CarrierBadge({ code }: { code: string }) {
  return (
    <div
      className="flex h-7 w-10 items-center justify-center rounded-md bg-gradient-to-br from-primary/10 to-accent/10 text-[11px] font-extrabold tracking-wider text-primary"
      title={code}
    >
      {code === "??" ? <Plane className="h-3 w-3" /> : code}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function offerCarrier(o: any): { name: string; code: string } {
  const ow = o?.owner ?? o?.validating_carrier ?? {};
  const fromSeg = (o?.slices?.[0]?.segments?.[0]?.marketing_carrier) ?? {};
  const code =
    (typeof ow === "object" && ow?.iata_code) ||
    fromSeg?.iata_code ||
    (typeof o?.owner === "string" ? o.owner.slice(0, 2).toUpperCase() : "") ||
    "??";
  const name =
    (typeof ow === "object" && ow?.name) ||
    fromSeg?.name ||
    (typeof o?.owner === "string" ? o.owner : "Airline");
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
  // build "2h 10m in CDG" style label using the first connection
  if (segs.length < 2) return "";
  const a = segs[0];
  const b = segs[1];
  if (!a?.arriving_at || !b?.departing_at) return `${segs.length - 1} stop`;
  const mins = Math.round(
    (new Date(b.departing_at).getTime() - new Date(a.arriving_at).getTime()) / 60000,
  );
  const place = b?.origin?.iata_code ?? b?.origin ?? "";
  if (mins <= 0) return `${segs.length - 1} stop`;
  return `${fmtDuration(mins)} in ${place}`;
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
