import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { searchCarRentalLocations } from "@/server/travsify";

export type CarLocation = { id: string; name: string; type?: string; cityName?: string; iata?: string };

export function CarRentalLocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Airport or city",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (loc: CarLocation) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CarLocation[]>([]);
  const debounceRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function runSearch(q: string) {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q || q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchCarRentalLocations({ data: { query: q.trim() } });
        const locs = (res?.data?.locations ?? []) as CarLocation[];
        setResults(locs.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          runSearch(e.target.value);
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-auto rounded-xl border border-border bg-card shadow-elevated">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-3 text-xs text-muted-foreground">No locations found.</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onSelect(r);
                  onChange(`${r.name}${r.iata ? ` (${r.iata})` : ""}`);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-secondary/60"
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">
                    {r.name} {r.iata && <span className="text-xs text-muted-foreground">({r.iata})</span>}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {r.type === "AIRPORT" ? "Airport" : r.cityName ?? "City"}
                  </div>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
