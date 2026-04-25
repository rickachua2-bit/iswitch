import { Link } from "@tanstack/react-router";
import dubai from "@/assets/dest-dubai.jpg";
import london from "@/assets/dest-london.jpg";
import newyork from "@/assets/dest-newyork.jpg";
import paris from "@/assets/dest-paris.jpg";
import tokyo from "@/assets/dest-tokyo.jpg";

const DEALS = [
  { city: "Dubai", country: "United Arab Emirates", price: "from $612", img: dubai, tag: "Hot Deal" },
  { city: "London", country: "United Kingdom", price: "from $548", img: london, tag: "Visa Ready" },
  { city: "New York", country: "United States", price: "from $789", img: newyork, tag: "Save 18%" },
  { city: "Paris", country: "France", price: "from $498", img: paris, tag: "Trending" },
  { city: "Tokyo", country: "Japan", price: "from $924", img: tokyo, tag: "New" },
];

export function HandpickedRoutes() {
  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">Popular destinations</h2>
            <p className="mt-1 text-sm text-muted-foreground">Handpicked routes our travelers love</p>
          </div>
          <Link
            to="/flights"
            className="hidden rounded-md border border-border bg-card px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary transition hover:bg-secondary md:inline-block"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {DEALS.map((d) => (
            <Link
              key={d.city}
              to="/flights"
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="relative h-36 overflow-hidden md:h-44">
                <img src={d.img} alt={d.city} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                <span className="absolute left-2 top-2 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                  {d.tag}
                </span>
              </div>
              <div className="p-3">
                <div className="text-sm font-bold text-foreground">{d.city}</div>
                <div className="text-[11px] text-muted-foreground">{d.country}</div>
                <div className="mt-1.5 text-sm font-extrabold text-primary">{d.price}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
