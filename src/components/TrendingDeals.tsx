import { Link } from "@tanstack/react-router";
import { TrendingDown, Clock, Flame } from "lucide-react";

const DEALS = [
  { route: "Lagos → Dubai", airline: "Emirates · Direct", oldPrice: 980, newPrice: 612, save: 38, tag: "Flash sale", icon: Flame, color: "from-rose-500 to-orange-500" },
  { route: "Lagos → London", airline: "British Airways · Direct", oldPrice: 870, newPrice: 548, save: 37, tag: "Trending", icon: TrendingDown, color: "from-blue-500 to-cyan-500" },
  { route: "Abuja → Toronto", airline: "Lufthansa · 1 stop", oldPrice: 1240, newPrice: 789, save: 36, tag: "48h left", icon: Clock, color: "from-amber-500 to-yellow-500" },
];

export function TrendingDeals() {
  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-destructive/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
              🔥 Limited time
            </span>
            <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground md:text-3xl">
              Today's flash deals
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Curated savings — refreshed every 24 hours</p>
          </div>
          <Link to="/flights" className="hidden rounded-md border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary transition hover:bg-secondary md:inline-block">
            See all deals
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {DEALS.map((d) => {
            const Icon = d.icon;
            return (
              <Link key={d.route} to="/flights" className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:shadow-elevated">
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${d.color} opacity-20 blur-2xl`} />
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center gap-1 rounded-md bg-gradient-to-r ${d.color} px-2 py-0.5 text-[10px] font-bold uppercase text-white`}>
                    <Icon className="h-3 w-3" /> {d.tag}
                  </div>
                  <span className="rounded-md bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                    Save {d.save}%
                  </span>
                </div>
                <div className="mt-4 font-display text-xl font-extrabold text-foreground">{d.route}</div>
                <div className="mt-1 text-xs text-muted-foreground">{d.airline}</div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-extrabold text-primary">${d.newPrice}</span>
                  <span className="mb-1 text-sm text-muted-foreground line-through">${d.oldPrice}</span>
                </div>
                <button className="mt-4 w-full rounded-lg bg-gradient-accent py-2.5 text-sm font-bold text-accent-foreground shadow-card transition group-hover:opacity-90">
                  Grab this deal →
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
