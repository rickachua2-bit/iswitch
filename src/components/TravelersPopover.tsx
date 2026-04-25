import { useEffect, useRef, useState } from "react";
import { Users, Minus, Plus, Check } from "lucide-react";

export type CabinClass = "economy" | "premium" | "business" | "first";

export interface TravelersValue {
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass;
}

const CABIN_LABEL: Record<CabinClass, string> = {
  economy: "Economy",
  premium: "Premium Economy",
  business: "Business",
  first: "First",
};

export function travelersDisplay(v: TravelersValue) {
  const total = v.adults + v.children + v.infants;
  const pax = `${total} ${total === 1 ? "Traveler" : "Travelers"}`;
  return `${pax}, ${CABIN_LABEL[v.cabin]}`;
}

interface Props {
  value: TravelersValue;
  onChange: (v: TravelersValue) => void;
  label?: string;
}

export function TravelersPopover({ value, onChange, label = "Travelers / Class" }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TravelersValue>(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function step(key: "adults" | "children" | "infants", delta: number) {
    setDraft((d) => {
      const next = { ...d, [key]: Math.max(key === "adults" ? 1 : 0, d[key] + delta) };
      // infants cannot exceed adults
      if (key === "adults" && next.infants > next.adults) next.infants = next.adults;
      if (key === "infants" && next.infants > next.adults) next.infants = next.adults;
      // total cap 9
      const total = next.adults + next.children + next.infants;
      if (total > 9) return d;
      return next;
    });
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full flex-col gap-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-left transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3 w-3" /> {label}
        </div>
        <div className="truncate text-sm font-semibold text-foreground">
          {travelersDisplay(value)}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 w-[320px] max-w-[92vw] rounded-xl border border-border bg-card p-4 shadow-elevated">
          <div className="space-y-3">
            <Row
              title="Adults"
              hint="12+ years"
              value={draft.adults}
              min={1}
              onMinus={() => step("adults", -1)}
              onPlus={() => step("adults", +1)}
            />
            <Row
              title="Children"
              hint="2-11 years"
              value={draft.children}
              min={0}
              onMinus={() => step("children", -1)}
              onPlus={() => step("children", +1)}
            />
            <Row
              title="Infants"
              hint="Under 2, on lap"
              value={draft.infants}
              min={0}
              onMinus={() => step("infants", -1)}
              onPlus={() => step("infants", +1)}
            />
          </div>

          <div className="mt-4 border-t border-border pt-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cabin class</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(CABIN_LABEL) as CabinClass[]).map((c) => {
                const active = draft.cabin === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, cabin: c }))}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{CABIN_LABEL[c]}</span>
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setDraft(value); setOpen(false); }}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={apply}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-95"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  title, hint, value, min, onMinus, onPlus,
}: { title: string; hint: string; value: number; min: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMinus}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${title}`}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={onPlus}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-secondary"
          aria-label={`Increase ${title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
