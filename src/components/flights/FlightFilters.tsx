import { useMemo, useState } from "react";
import { Filter, Search, Briefcase } from "lucide-react";
import { usePriceFormat } from "@/lib/use-price-format";

type Airline = { code: string; name: string; minPrice: number };

interface Props {
  offers: any[];
  currency: string;
  /** current values */
  stops: string;          // "any" | "0" | "1" | "2"
  airlines: string[];     // selected codes
  baggage: boolean;
  recommended: boolean;
  /** setters */
  onChange: (patch: {
    stops?: string;
    airlines?: string[] | undefined;
    baggage?: boolean;
    recommended?: boolean;
  }) => void;
}

export function FlightFilters({
  offers, currency, stops, airlines, baggage, recommended, onChange,
}: Props) {
  const formatPrice = usePriceFormat();

  const allAirlines = useMemo<Airline[]>(() => {
    const map = new Map<string, Airline>();
    for (const o of offers) {
      const c = airlineFromOffer(o);
      const price = Number(o?.total_amount ?? o?.price?.total ?? 0);
      if (!c.code || c.code === "??") continue;
      const existing = map.get(c.code);
      if (!existing || existing.minPrice > price) map.set(c.code, { ...c, minPrice: price });
    }
    return Array.from(map.values()).sort((a, b) => a.minPrice - b.minPrice);
  }, [offers]);

  const priceRange = useMemo(() => {
    if (!offers.length) return { min: 0, max: 0 };
    const xs = offers.map((o) => Number(o?.total_amount ?? o?.price?.total ?? 0));
    return { min: Math.min(...xs), max: Math.max(...xs) };
  }, [offers]);

  // sym retained for backwards compat, but prefer formatPrice for display
  const sym = currencySymbol(currency);
  void sym;

  const [airlineQ, setAirlineQ] = useState("");
  const filteredAirlines = airlineQ
    ? allAirlines.filter(
        (a) =>
          a.name.toLowerCase().includes(airlineQ.toLowerCase()) ||
          a.code.toLowerCase().includes(airlineQ.toLowerCase()),
      )
    : allAirlines;

  function toggleAirline(code: string) {
    const next = airlines.includes(code)
      ? airlines.filter((x) => x !== code)
      : [...airlines, code];
    onChange({ airlines: next.length ? next : undefined });
  }

  return (
    <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-bold">
          <Filter className="h-4 w-4 text-primary" /> Filters
        </div>

        {/* recommended */}
        <Group title="Recommended">
          <Check
            label="Checked baggage included"
            icon={<Briefcase className="h-3.5 w-3.5 text-primary" />}
            checked={baggage}
            onChange={(v) => onChange({ baggage: v })}
          />
          <Check
            label="Hide hidden-city / risky fares"
            checked={recommended}
            onChange={(v) => onChange({ recommended: v })}
          />
        </Group>

        {/* stops */}
        <Group title="Stops">
          {[
            { v: "any", l: "Any" },
            { v: "0", l: "Non-stop" },
            { v: "1", l: "1 stop" },
            { v: "2", l: "2+ stops" },
          ].map((opt) => (
            <Radio
              key={opt.v}
              name="stops"
              label={opt.l}
              checked={stops === opt.v}
              onChange={() => onChange({ stops: opt.v })}
            />
          ))}
        </Group>

        {/* airlines */}
        {allAirlines.length > 0 && (
          <Group title={`Airlines (${allAirlines.length})`}>
            <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={airlineQ}
                onChange={(e) => setAirlineQ(e.target.value)}
                placeholder="Search airlines"
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {filteredAirlines.map((a) => {
                const checked = airlines.includes(a.code);
                return (
                  <label
                    key={a.code}
                    className="flex cursor-pointer items-center gap-2 rounded-md py-1 text-sm hover:bg-secondary/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAirline(a.code)}
                      className="accent-primary"
                    />
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-primary">
                      {a.code}
                    </span>
                    <span className="flex-1 truncate text-xs">{a.name}</span>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {formatPrice(a.minPrice, currency)}
                    </span>
                  </label>
                );
              })}
              {filteredAirlines.length === 0 && (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  No airlines match
                </div>
              )}
            </div>
          </Group>
        )}

        {/* price */}
        <Group title="Price range">
          <div className="text-xs text-muted-foreground">
            From{" "}
            <span className="font-bold text-foreground">
              {formatPrice(priceRange.min, currency)}
            </span>{" "}
            to{" "}
            <span className="font-bold text-foreground">
              {formatPrice(priceRange.max, currency)}
            </span>
          </div>
        </Group>
      </div>

      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-3 text-xs text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-bold text-foreground">
          <Briefcase className="h-3.5 w-3.5 text-primary" /> Best price guarantee
        </div>
        Find a cheaper price within 24h? We refund the difference.
      </div>
    </aside>
  );
}

/* ---- primitives ---- */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-border px-4 py-3 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
      >
        {title}
        <span className="text-base leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  );
}

function Radio({
  label, checked, onChange, name,
}: { label: string; checked: boolean; onChange: () => void; name: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md py-1 text-sm hover:bg-secondary/40">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

function Check({
  label, checked, onChange, icon,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md py-1 text-sm hover:bg-secondary/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary"
      />
      {icon}
      <span>{label}</span>
    </label>
  );
}

function airlineFromOffer(o: any): { code: string; name: string } {
  const ow = o?.owner ?? {};
  const fromSeg = o?.slices?.[0]?.segments?.[0]?.marketing_carrier ?? {};
  const code =
    (typeof ow === "object" && ow?.iata_code) ||
    fromSeg?.iata_code ||
    (typeof o?.owner === "string" ? o.owner.slice(0, 2).toUpperCase() : "") ||
    "??";
  const name =
    (typeof ow === "object" && ow?.name) ||
    fromSeg?.name ||
    (typeof o?.owner === "string" ? o.owner : "Airline");
  return { code, name };
}

function currencySymbol(cur: string) {
  const c = (cur || "USD").toUpperCase();
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  if (c === "NGN") return "₦";
  return c + " ";
}
