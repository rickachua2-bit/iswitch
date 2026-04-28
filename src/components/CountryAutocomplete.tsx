import { useEffect, useMemo, useRef, useState } from "react";
import { getCatalog } from "@/server/travsify";

export type CountryOption = { name: string; code?: string };

/** Module-level cache so the catalog is fetched once per session. */
let CACHE: CountryOption[] | null = null;
let INFLIGHT: Promise<CountryOption[]> | null = null;

/** Visa pairs from the catalog: nationality code -> set of destination names. */
let VISA_PAIRS: Map<string, Set<string>> | null = null;
/** Set of all nationality names that appear in any visa pair. */
let VISA_NATIONALITIES: Set<string> | null = null;
/** Lookup: country code -> display name (from catalog). */
let CODE_TO_NAME: Map<string, string> | null = null;

function extractCountries(catalog: any): CountryOption[] {
  if (!catalog) return [];
  const buckets: any[] = [
    catalog.countries,
    catalog?.visas?.countries,
    catalog?.visas?.destinations,
    catalog?.visas?.nationalities,
    catalog?.flights?.countries,
    catalog?.hotels?.countries,
    catalog?.data?.countries,
  ].filter(Boolean);

  const seen = new Map<string, CountryOption>();
  for (const list of buckets) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string") {
        seen.set(item.toLowerCase(), { name: item });
      } else if (item && typeof item === "object") {
        const name: string | undefined =
          item.destination_name ?? item.name ?? item.label ?? item.country ?? item.title;
        const code: string | undefined =
          item.destination ?? item.code ?? item.iso ?? item.iso2 ?? item.country_code ?? item.cc;
        // Only treat 2-letter values as codes; otherwise it's the country name.
        const isCode = code && /^[A-Z]{2}$/.test(String(code).toUpperCase());
        if (name && !/^[A-Z]{2}$/.test(name)) {
          seen.set(name.toLowerCase(), { name, code: isCode ? String(code).toUpperCase() : undefined });
        }
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Build the nationality→destinations index from the visas.destinations catalog. */
function extractVisaPairs(catalog: any) {
  const pairs = new Map<string, Set<string>>();
  const nats = new Set<string>();
  const codeToName = new Map<string, string>();
  const list: any[] = catalog?.visas?.destinations ?? [];
  if (!Array.isArray(list)) return { pairs, nats, codeToName };

  for (const item of list) {
    const destName: string =
      item?.destination_name ??
      (typeof item?.destination === "string" && !/^[A-Z]{2}$/.test(item.destination)
        ? item.destination
        : "");
    const destCode: string | undefined =
      typeof item?.destination === "string" && /^[A-Z]{2}$/.test(item.destination)
        ? item.destination
        : undefined;
    const displayDest = destName || destCode || "";
    if (destCode && destName) codeToName.set(destCode, destName);
    if (!displayDest) continue;

    const nationalities: string[] = Array.isArray(item?.nationalities) ? item.nationalities : [];
    for (const nat of nationalities) {
      const key = String(nat).toUpperCase();
      nats.add(key);
      if (!pairs.has(key)) pairs.set(key, new Set());
      pairs.get(key)!.add(displayDest);
    }
  }
  return { pairs, nats, codeToName };
}

async function loadCountries(): Promise<CountryOption[]> {
  if (CACHE) return CACHE;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    try {
      const res: any = await getCatalog();
      const data = res?.data ?? res;
      const list = extractCountries(data);
      const { pairs, nats, codeToName } = extractVisaPairs(data);
      VISA_PAIRS = pairs;
      VISA_NATIONALITIES = nats;
      CODE_TO_NAME = codeToName;
      CACHE = list;
      return list;
    } catch {
      CACHE = [];
      VISA_PAIRS = new Map();
      VISA_NATIONALITIES = new Set();
      CODE_TO_NAME = new Map();
      return [];
    } finally {
      INFLIGHT = null;
    }
  })();
  return INFLIGHT;
}

/** Get destinations a given nationality is eligible for, by display name. */
export function getDestinationsForNationality(nationality: string): string[] {
  if (!VISA_PAIRS || !nationality) return [];
  // Try to resolve nationality name → ISO code
  const upper = nationality.trim().toUpperCase();
  const code =
    /^[A-Z]{2}$/.test(upper)
      ? upper
      : NAME_TO_CODE[nationality.trim().toLowerCase()] ?? upper.slice(0, 2);
  const set = VISA_PAIRS.get(code);
  return set ? Array.from(set).sort() : [];
}

/** Display names of nationalities supported in the catalog. */
export function getSupportedNationalities(): string[] {
  if (!VISA_NATIONALITIES) return [];
  const names: string[] = [];
  for (const code of VISA_NATIONALITIES) {
    names.push(CODE_TO_NAME?.get(code) ?? CODE_NAMES[code] ?? code);
  }
  return Array.from(new Set(names)).sort();
}

const NAME_TO_CODE: Record<string, string> = {
  nigeria: "NG", "united kingdom": "GB", uk: "GB", "united states": "US", usa: "US",
  canada: "CA", germany: "DE", france: "FR", "united arab emirates": "AE", uae: "AE",
  "schengen area": "SC", australia: "AU", india: "IN", china: "CN", "south africa": "ZA",
  ghana: "GH", kenya: "KE", japan: "JP", brazil: "BR", egypt: "EG", philippines: "PH",
  "saudi arabia": "SA", "new zealand": "NZ",
};

const CODE_NAMES: Record<string, string> = {
  NG: "Nigeria", GB: "United Kingdom", US: "United States", CA: "Canada",
  DE: "Germany", FR: "France", AE: "United Arab Emirates", AU: "Australia",
  IN: "India", CN: "China", ZA: "South Africa", GH: "Ghana", KE: "Kenya",
  JP: "Japan", BR: "Brazil", EG: "Egypt", PH: "Philippines", SA: "Saudi Arabia",
  NZ: "New Zealand", SC: "Schengen Area",
};

export function CountryAutocomplete({
  value,
  onChange,
  placeholder,
  restrictTo,
  inputClassName = "w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Optional whitelist of country names to restrict suggestions to. */
  restrictTo?: string[];
  inputClassName?: string;
}) {
  const [all, setAll] = useState<CountryOption[]>(CACHE ?? []);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadCountries().then(setAll);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    let source: CountryOption[] = all.length ? all : FALLBACK_COUNTRIES;
    if (restrictTo && restrictTo.length) {
      const allowed = new Set(restrictTo.map((s) => s.toLowerCase()));
      // Build options strictly from the whitelist, preserving any code we know.
      source = restrictTo.map((name) => {
        const known = source.find((c) => c.name.toLowerCase() === name.toLowerCase());
        return known ?? { name };
      });
      // Keep filter, but ensure source only contains allowed
      source = source.filter((c) => allowed.has(c.name.toLowerCase()));
    }
    if (!q) return source.slice(0, 20);
    const starts = source.filter((c) => c.name.toLowerCase().startsWith(q));
    const contains = source.filter(
      (c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q),
    );
    return [...starts, ...contains].slice(0, 20);
  }, [all, value, restrictTo]);

  function pick(opt: CountryOption) {
    onChange(opt.name);
    setOpen(false);
  }

  const isRestrictedEmpty = !!restrictTo && restrictTo.length === 0;

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && matches[highlight]) { e.preventDefault(); pick(matches[highlight]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        placeholder={isRestrictedEmpty ? "Select nationality first" : placeholder}
        autoComplete="off"
        disabled={isRestrictedEmpty}
        className={inputClassName}
      />
      {open && matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-popover shadow-elevated">
          {matches.map((opt, i) => (
            <li
              key={(opt.code ?? "") + opt.name}
              onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm ${
                i === highlight ? "bg-accent text-accent-foreground" : "text-foreground"
              }`}
            >
              <span className="font-semibold">{opt.name}</span>
              {opt.code && <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{opt.code}</span>}
            </li>
          ))}
        </ul>
      )}
      {open && restrictTo && restrictTo.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-elevated">
          Pick a nationality to see eligible destinations.
        </div>
      )}
    </div>
  );
}

/** Used only if /catalog fails — keeps the dropdown useful. */
const FALLBACK_COUNTRIES: CountryOption[] = [
  "Australia","Austria","Belgium","Brazil","Canada","China","Egypt","France","Germany","Ghana",
  "India","Ireland","Italy","Japan","Kenya","Mexico","Morocco","Netherlands","New Zealand",
  "Nigeria","Norway","Poland","Portugal","Qatar","Saudi Arabia","Schengen Area","Singapore",
  "South Africa","Spain","Sweden","Switzerland","Thailand","Turkey","United Arab Emirates",
  "United Kingdom","United States",
].map((name) => ({ name }));
