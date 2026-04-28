import { useEffect, useRef, useState } from "react";
import { MapPin, Plane } from "lucide-react";
import { searchAirports, type Airport } from "@/lib/airports";

interface Props {
  label: string;
  value: string;
  onChange: (display: string, airport?: Airport) => void;
  placeholder?: string;
  /** Lucide-style icon component, defaults to MapPin. */
  icon?: typeof MapPin;
}

export function AirportAutocomplete({ label, value, onChange, placeholder, icon: Icon = MapPin }: Props) {
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
        // If user dismissed without picking, restore the prior value
        setOpen((wasOpen) => {
          if (wasOpen) {
            setQuery(previousValueRef.current);
          }
          return false;
        });
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = searchAirports(query, 8);

  function pick(a: Airport) {
    const display = `${a.city} (${a.code})`;
    onChange(display, a);
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
          value={query}
          placeholder={placeholder ?? "City or airport code"}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
            else if (e.key === "Enter" && results[highlight]) { e.preventDefault(); pick(results[highlight]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoComplete="off"
        />
      </label>

      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-elevated">
          {results.map((a, i) => (
            <button
              type="button"
              key={a.code}
              onMouseDown={(e) => { e.preventDefault(); pick(a); }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${
                i === highlight ? "bg-secondary" : "hover:bg-secondary/60"
              }`}
            >
              <Plane className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="truncate text-sm font-bold text-foreground">{a.city}, {a.country}</div>
                  <div className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-primary">{a.code}</div>
                </div>
                <div className="truncate text-xs text-muted-foreground">{a.name}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
