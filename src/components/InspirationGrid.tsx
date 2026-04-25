import { Link } from "@tanstack/react-router";
import { Compass, Mountain, Waves, Building, Utensils, Camera } from "lucide-react";

const THEMES = [
  { icon: Waves, title: "Beach escapes", count: "240+ stays", color: "from-cyan-500 to-blue-600", to: "/stays" },
  { icon: Mountain, title: "Mountain retreats", count: "180+ stays", color: "from-emerald-500 to-teal-600", to: "/stays" },
  { icon: Building, title: "City breaks", count: "1,200+ hotels", color: "from-violet-500 to-indigo-600", to: "/stays" },
  { icon: Utensils, title: "Foodie tours", count: "95+ experiences", color: "from-rose-500 to-pink-600", to: "/tours" },
  { icon: Camera, title: "Photo safaris", count: "60+ trips", color: "from-amber-500 to-orange-600", to: "/tours" },
  { icon: Compass, title: "Adventure", count: "140+ activities", color: "from-fuchsia-500 to-purple-600", to: "/tours" },
];

export function InspirationGrid() {
  return (
    <section className="bg-secondary/40 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">
            Travel by mood
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Pick a vibe — we'll handle the rest.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {THEMES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.title}
                to={t.to}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${t.color} opacity-15 blur-xl transition group-hover:opacity-30`} />
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow-card`}>
                  <Icon className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div className="mt-3 text-sm font-extrabold text-foreground">{t.title}</div>
                <div className="text-[11px] text-muted-foreground">{t.count}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
