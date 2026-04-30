import { useEffect, useMemo, useRef, useState } from "react";
import { listVisaCountries } from "@/server/visa.functions";

export type VisaCountryOption = { code: string; name: string };

let CACHE: VisaCountryOption[] | null = null;
let INFLIGHT: Promise<VisaCountryOption[]> | null = null;

async function loadCountries(): Promise<VisaCountryOption[]> {
  if (CACHE) return CACHE;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    try {
      const res: any = await listVisaCountries();
      const list: VisaCountryOption[] = res?.countries ?? [];
      CACHE = list.slice().sort((a, b) => a.name.localeCompare(b.name));
      return CACHE;
    } catch {
      CACHE = [];
      return CACHE;
    } finally {
      INFLIGHT = null;
    }
  })();
  return INFLIGHT;
}

/**
 * Country autocomplete sourced directly from the visa RapidAPI's supported
 * country list. Suggests as the user types and emits the country display name.
 */
export function VisaCountryAutocomplete({
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
  const [all, setAll] = useState<VisaCountryOption[]>(CACHE ?? []);
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
    const source = all;
    if (!q) return source.slice(0, 30);
    const starts = source.filter(
      (c) => c.name.toLowerCase().startsWith(q) || c.code.toLowerCase() === q,
    );
    const contains = source.filter(
      (c) =>
        !c.name.toLowerCase().startsWith(q) &&
        c.code.toLowerCase() !== q &&
        c.name.toLowerCase().includes(q),
    );
    return [...starts, ...contains].slice(0, 30);
  }, [all, value]);

  function pick(opt: VisaCountryOption) {
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
        placeholder={placeholder ?? "Search country"}
        autoComplete="off"
        className={inputClassName}
      />
      {open && matches.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-popover shadow-elevated">
          {matches.map((opt, i) => (
            <li
              key={opt.code}
              onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm ${
                i === highlight ? "bg-accent text-accent-foreground" : "text-foreground"
              }`}
            >
              <span className="font-semibold">{opt.name}</span>
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground">{opt.code}</span>
            </li>
          ))}
        </ul>
      )}
      {open && matches.length === 0 && value.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-elevated">
          No matching countries.
        </div>
      )}
    </div>
  );
}
