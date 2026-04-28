import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Building2 } from "lucide-react";
import { AIRPORTS } from "@/lib/airports";

export type City = { city: string; country: string; cc: string };

// Build a unique list of cities from the airports dataset.
const CITIES: City[] = (() => {
  const seen = new Map<string, City>();
  for (const a of AIRPORTS) {
    const key = `${a.city.toLowerCase()}|${a.cc}`;
    if (!seen.has(key)) seen.set(key, { city: a.city, country: a.country, cc: a.cc });
  }
  return Array.from(seen.values()).sort((a, b) => a.city.localeCompare(b.city));
})();

function searchCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return CITIES.slice(0, limit);
  const starts: City[] = [];
  const contains: City[] = [];
  for (const c of CITIES) {
    const name = c.city.toLowerCase();
    if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q) || c.country.toLowerCase().includes(q)) contains.push(c);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

function displayCity(c: City) {
  return `${c.city}, ${c.country}`;
}

function bestCityDisplay(input: string) {
  const typed = input.trim();
  if (!typed) return "";
  const exact = CITIES.find((c) => c.city.toLowerCase() === typed.toLowerCase());
  return exact ? displayCity(exact) : typed;
}

interface Props {
  label: string;
  value: string;
  onChange: (display: string, city?: City) => void;
  placeholder?: string;
  icon?: typeof MapPin;
}

export function CityAutocomplete({ label, value, onChange, placeholder, icon: Icon = MapPin }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const previousValueRef = useRef(value);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen((wasOpen) => {
          if (wasOpen) {
            const display = bestCityDisplay(query || previousValueRef.current);
            previousValueRef.current = display;
            setQuery(display);
            onChange(display);
          }
          return false;
        });
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [onChange, query]);

  const results = useMemo(() => searchCities(query, 8), [query]);

  function pick(c: City) {
    const display = displayCity(c);
    previousValueRef.current = display;
    onChange(display, c);
    setQuery(display);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="group flex flex-col gap-1 rounded-xl border border-border bg-background px-3.5 py-2.5 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" /> {label}
        </div>
        <input
          ref={inputRef}
          value={query}
          placeholder={open && !query && previousValueRef.current ? previousValueRef.current : (placeholder ?? "City or area")}
          onFocus={(e) => {
            previousValueRef.current = query;
            setHighlight(0);
            setOpen(true);
            requestAnimationFrame(() => e.target?.select?.());
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter" && results[highlight]) { e.preventDefault(); pick(results[highlight]); }
            else if (e.key === "Escape") { setQuery(previousValueRef.current); setOpen(false); inputRef.current?.blur(); }
          }}
          className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
        />
      </label>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-elevated">
          {results.map((c, i) => (
            <button
              type="button"
              key={`${c.city}-${c.cc}`}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${
                i === highlight ? "bg-secondary" : "hover:bg-secondary/60"
              }`}
            >
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-foreground">{c.city}</div>
                <div className="truncate text-xs text-muted-foreground">{c.country}</div>
              </div>
              <div className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-primary">{c.cc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
