import { Globe, ArrowRight, Zap, Flame, Sparkles } from "lucide-react";
import paris from "@/assets/dest-paris.jpg";
import newyork from "@/assets/dest-newyork.jpg";
import dubai from "@/assets/dest-dubai.jpg";
import tokyo from "@/assets/dest-tokyo.jpg";
import london from "@/assets/dest-london.jpg";

const ROUTES = [
  { city: "Paris", country: "France", price: "$650", img: paris, badge: { label: "Hacker Fare — Save $350", icon: Zap, tone: "purple" } },
  { city: "New York", country: "United States", price: "$890", img: newyork, badge: { label: "Trending Route", icon: Flame, tone: "blue" } },
  { city: "Dubai", country: "United Arab Emirates", price: "$420", img: dubai, badge: { label: "Best Value", icon: Sparkles, tone: "orange" } },
  { city: "Tokyo", country: "Japan", price: "$980", img: tokyo, badge: { label: "Editor's Pick", icon: Sparkles, tone: "pink" } },
  { city: "London", country: "United Kingdom", price: "$540", img: london, badge: { label: "Hot Deal", icon: Flame, tone: "red" } },
];

const toneMap: Record<string, string> = {
  purple: "bg-accent/90 text-accent-foreground",
  blue: "bg-blue-500/90 text-white",
  orange: "bg-gradient-primary text-primary-foreground",
  pink: "bg-pink-500/90 text-white",
  red: "bg-red-500/90 text-white",
};

export function HandpickedRoutes() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold md:text-3xl">
          <Globe className="h-6 w-6 text-primary" /> Handpicked Routes
        </h2>
        <a href="#" className="flex items-center gap-1 text-sm font-semibold text-primary hover:opacity-80">
          Explore all <ArrowRight className="h-4 w-4" />
        </a>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 md:grid md:grid-cols-3 md:gap-5 lg:grid-cols-5">
        {ROUTES.map((r) => {
          const BadgeIcon = r.badge.icon;
          return (
            <a
              key={r.city}
              href="#"
              className="group relative block min-w-[260px] overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={r.img}
                  alt={`${r.city}, ${r.country}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className={`absolute left-3 top-3 flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${toneMap[r.badge.tone]}`}>
                  <BadgeIcon className="h-3 w-3" /> {r.badge.label}
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4">
                  <div>
                    <div className="font-display text-2xl font-extrabold leading-tight text-white">{r.city}</div>
                    <div className="text-xs text-white/70">{r.country}</div>
                  </div>
                  <div className="rounded-lg bg-gradient-primary px-3 py-1.5 text-right shadow-glow">
                    <div className="text-[9px] font-bold uppercase text-primary-foreground/70">From</div>
                    <div className="text-sm font-extrabold text-primary-foreground">{r.price}</div>
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
