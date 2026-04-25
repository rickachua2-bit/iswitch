import { useState } from "react";
import { Plane, Hotel, FileCheck, Shield, Map, Car, Vault, ChevronRight, MapPin, Calendar, Users, Search, TrendingDown, Activity, Wallet } from "lucide-react";

const TABS = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "stays", label: "Stays", icon: Hotel },
  { id: "visas", label: "Visas", icon: FileCheck },
  { id: "insurance", label: "Insurance", icon: Shield },
  { id: "tours", label: "Tours", icon: Map },
  { id: "pickups", label: "Pickups", icon: Car },
  { id: "vault", label: "Vault", icon: Vault },
];

export function SearchTabs() {
  const [active, setActive] = useState("flights");
  const [trip, setTrip] = useState<"one-way" | "round-trip" | "multi-city">("round-trip");

  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      {/* Service tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex min-w-[110px] flex-col items-center gap-2 rounded-2xl border px-5 py-3.5 transition ${
                isActive
                  ? "border-primary/40 bg-card shadow-card"
                  : "border-border/60 bg-card/40 hover:border-border hover:bg-card/70"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              </div>
              <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {t.label}
              </span>
            </button>
          );
        })}
        <button className="flex min-w-[80px] items-center justify-center rounded-2xl border border-border/40 bg-card/20 text-muted-foreground transition hover:bg-card/50">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Search panel */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-card backdrop-blur-xl md:p-6">
        {/* Trip type + price tracker */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full border border-border/60 bg-background/40 p-1">
            {(["one-way", "round-trip", "multi-city"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTrip(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                  trip === t ? "bg-gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.replace("-", " ")}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <TrendingDown className="h-3.5 w-3.5" /> Price Drop Tracker
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl bg-border/60 md:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto]">
          <Field icon={MapPin} label="Origin" value="LOS" sub="Lagos" />
          <Field icon={MapPin} label="Destination" value="LHR" sub="London Heathrow" />
          <Field icon={Calendar} label="Departure" value="Add 1" sub="Pick a date" />
          <Field icon={Calendar} label="Return" value="Return" sub="Pick a date" highlight />
          <Field icon={Users} label="Travelers" value="1 Adult, Economy" sub="Add more" />
          <button className="flex items-center justify-center bg-gradient-primary px-7 text-primary-foreground shadow-glow transition hover:opacity-90 md:px-8" aria-label="Search">
            <Search className="h-6 w-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* Sub-cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <SubCard icon={Activity} title="Live Flight Tracker" hint="e.g. BA 123" iconBg="bg-blue-500/20 text-blue-300" />
          <SubCard icon={FileCheck} title="Visa Auto-Check" hint="Nigeria (NGN) → Destination" iconBg="bg-pink-500/20 text-pink-300" />
          <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Wallet className="h-3 w-3" /> iSwitch Wallet
            </div>
            <div className="text-sm font-bold">Fly Now, Pay Later.</div>
            <div className="mt-1 text-xs text-muted-foreground">Split any flight into 4 payments. <span className="text-primary">See if you qualify</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value, sub, highlight }: { icon: any; label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <button className={`flex flex-col items-start gap-1 px-5 py-4 text-left transition hover:bg-card ${highlight ? "bg-primary/15" : "bg-card"}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-base font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function SubCard({ icon: Icon, title, hint, iconBg }: { icon: any; title: string; hint: string; iconBg: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}
