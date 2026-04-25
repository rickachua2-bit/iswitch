import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { Star, Clock, Users } from "lucide-react";
import paris from "@/assets/dest-paris.jpg";
import dubai from "@/assets/dest-dubai.jpg";
import london from "@/assets/dest-london.jpg";
import tokyo from "@/assets/dest-tokyo.jpg";
import nyc from "@/assets/dest-newyork.jpg";

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "Tours & Experiences worldwide | iSwitch" },
      { name: "description", content: "Curated tours, attractions and unique local experiences in 80+ countries. Book skip-the-line, food tours, day trips and more." },
      { property: "og:title", content: "Tours & Experiences | iSwitch" },
      { property: "og:description", content: "Discover the world with curated tours and local experiences." },
    ],
  }),
  component: ToursPage,
});

const TOURS = [
  { name: "Eiffel Tower Skip-the-Line", city: "Paris", rating: 4.9, dur: "2h", group: "Small group", price: 65, img: paris },
  { name: "Desert Safari + BBQ Dinner", city: "Dubai", rating: 4.8, dur: "6h", group: "Up to 12", price: 95, img: dubai },
  { name: "London Royal Walking Tour", city: "London", rating: 4.7, dur: "3h", group: "Up to 20", price: 38, img: london },
  { name: "Mt. Fuji & Hakone Day Trip", city: "Tokyo", rating: 4.9, dur: "10h", group: "Bus", price: 120, img: tokyo },
  { name: "Statue of Liberty Cruise", city: "New York", rating: 4.6, dur: "2.5h", group: "Open", price: 49, img: nyc },
];

function ToursPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Unforgettable experiences.
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Curated tours and local activities in 80+ countries</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h2 className="mb-4 font-display text-xl font-bold">Top experiences this month</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TOURS.map((t) => (
            <div key={t.name} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elevated">
              <div className="relative h-48 overflow-hidden">
                <img src={t.img} alt={t.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-110" />
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-xs font-bold">
                  <Star className="h-3 w-3 fill-accent text-accent" /> {t.rating}
                </span>
              </div>
              <div className="p-4">
                <div className="text-xs font-bold uppercase text-primary">{t.city}</div>
                <div className="mt-1 font-bold text-foreground">{t.name}</div>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.dur}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {t.group}</span>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground">From</div>
                    <div className="text-lg font-extrabold text-primary">${t.price}</div>
                  </div>
                  <button className="rounded-lg bg-gradient-accent px-3 py-1.5 text-xs font-bold text-accent-foreground">Book</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
