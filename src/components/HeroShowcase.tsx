import { Sparkles, TrendingUp, Users2, ShieldCheck } from "lucide-react";

const FLOATING_STATS = [
  { icon: Users2, value: "2M+", label: "Happy travelers" },
  { icon: TrendingUp, value: "98%", label: "On-time bookings" },
  { icon: ShieldCheck, value: "24/7", label: "Concierge support" },
];

export function HeroShowcase() {
  return (
    <div className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-3 px-4 md:grid-cols-3">
      {FLOATING_STATS.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/95 text-accent-foreground">
              <Icon className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div>
              <div className="font-display text-lg font-extrabold text-primary-foreground">{s.value}</div>
              <div className="text-[11px] font-semibold text-primary-foreground/75">{s.label}</div>
            </div>
          </div>
        );
      })}
      <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-accent/40 bg-gradient-accent px-4 py-3 shadow-glow md:col-span-3">
        <Sparkles className="h-5 w-5 text-accent-foreground" strokeWidth={2.4} />
        <div className="text-xs font-bold text-accent-foreground md:text-sm">
          New users get <span className="underline">$50 off</span> your first booking. Expert consultations available from $49. Limited time.
        </div>
      </div>
    </div>
  );
}
