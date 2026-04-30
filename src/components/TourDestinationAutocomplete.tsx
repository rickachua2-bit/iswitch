import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { autocompleteTourDestinations } from "@/server/travsify";

type Suggestion = {
  id: string;
  label: string;
  country: string | null;
  type: string;
};

export function TourDestinationAutocomplete({
  value,
  onChange,
  placeholder = "City, region, or attraction",
}: {
  value: string;
  onChange: (label: string, suggestion?: Suggestion) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced fetch
  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res: any = await autocompleteTourDestinations({ data: { query: q } });
        if (ctrl.signal.aborted) return;
        const list: Suggestion[] =
          res?.data?.suggestions ?? res?.suggestions ?? [];
        setItems(list);
        setActive(0);
      } catch {
        if (!ctrl.signal.aborted) setItems([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(s: Suggestion) {
    const label = s.country ? `${s.label}, ${s.country}` : s.label;
    onChange(label, s);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(items[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const showDropdown = open && (loading || items.length > 0);

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-auto rounded-xl border border-border bg-popover shadow-elevated">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching destinations…
            </div>
          )}
          {!loading && items.length === 0 && value.trim().length >= 1 && (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">No matches — keep typing or press Enter to search.</div>
          )}
          {items.map((s, i) => (
            <button
              key={`${s.id}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                i === active ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/60"
              }`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{s.label}</div>
                {s.country && (
                  <div className="truncate text-[11px] text-muted-foreground">{s.country}</div>
                )}
              </div>
              {s.type && s.type !== "city" && s.type !== "destination" && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {s.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
