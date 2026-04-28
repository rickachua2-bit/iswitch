import { useEffect, useMemo, useRef, useState } from "react";
import { getCatalog } from "@/server/travsify";

export type CountryOption = { name: string; code?: string };

/** Module-level cache so the catalog is fetched once per session. */
let CACHE: CountryOption[] | null = null;
let INFLIGHT: Promise<CountryOption[]> | null = null;

function extractCountries(catalog: any): CountryOption[] {
  if (!catalog) return [];
  // The catalog can come back in many shapes. Try common locations.
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
        const name: string | undefined = item.name ?? item.label ?? item.country ?? item.title;
        const code: string | undefined =
          item.code ?? item.iso ?? item.iso2 ?? item.country_code ?? item.cc;
        if (name) seen.set(name.toLowerCase(), { name, code });
      }
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadCountries(): Promise<CountryOption[]> {
  if (CACHE) return CACHE;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    try {
      const res: any = await getCatalog();
      const list = extractCountries(res?.data ?? res);
      CACHE = list;
      return list;
    } catch {
      CACHE = [];
      return [];
    } finally {
      INFLIGHT = null;
    }
  })();
  return INFLIGHT;
}

export function CountryAutocomplete({
  value,
  onChange,
  placeholder,
  inputClassName = "w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  inputClassName?: string;
}) {
  const [all, setAll] = useState<CountryOption[]>(CACHE ?? []);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadCountries().then(setAll);
  }, []);

  // Close on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const source = all.length ? all : FALLBACK_COUNTRIES;
    if (!q) return source.slice(0, 12);
    const starts = source.filter((c) => c.name.toLowerCase().startsWith(q));
    const contains = source.filter(
      (c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q),
    );
    return [...starts, ...contains].slice(0, 12);
  }, [all, value]);

  function pick(opt: CountryOption) {
    onChange(opt.name);
    setOpen(false);
  }

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
        placeholder={placeholder}
        autoComplete="off"
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
