import { Globe, Users, Plane, Award } from "lucide-react";

const STATS = [
  { icon: Users, value: "2M+", label: "Happy travelers" },
  { icon: Plane, value: "500+", label: "Airlines connected" },
  { icon: Globe, value: "180+", label: "Countries served" },
  { icon: Award, value: "4.8/5", label: "Average rating" },
];

export function StatsStrip() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-6">
        {STATS.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold text-primary">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
