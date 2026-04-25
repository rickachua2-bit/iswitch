import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { Star, MapPin, Wifi, Coffee, Dumbbell } from "lucide-react";
import dubai from "@/assets/dest-dubai.jpg";
import paris from "@/assets/dest-paris.jpg";
import london from "@/assets/dest-london.jpg";
import tokyo from "@/assets/dest-tokyo.jpg";

export const Route = createFileRoute("/stays")({
  head: () => ({
    meta: [
      { title: "Hotels & Stays — Best prices worldwide | iSwitch" },
      { name: "description", content: "Find and book hotels, apartments and villas. 1.5M+ properties with verified reviews and best price guarantee." },
      { property: "og:title", content: "Hotels & Stays | iSwitch" },
      { property: "og:description", content: "Book hotels worldwide with confidence." },
    ],
  }),
  component: StaysPage,
});

const HOTELS = [
  { name: "Burj Al Arab Jumeirah", city: "Dubai", rating: 4.9, reviews: 8421, price: 450, img: dubai },
  { name: "Le Meurice Paris", city: "Paris", rating: 4.8, reviews: 5320, price: 380, img: paris },
  { name: "The Savoy", city: "London", rating: 4.9, reviews: 7102, price: 420, img: london },
  { name: "Park Hyatt Tokyo", city: "Tokyo", rating: 4.8, reviews: 4290, price: 510, img: tokyo },
];

function StaysPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Stay anywhere. Pay less.
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">1.5M+ hotels, apartments & villas worldwide</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h2 className="mb-4 font-display text-xl font-bold">Top picks for Dubai</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {HOTELS.map((h) => (
            <div key={h.name} className="group overflow-hidden rounded-2xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-elevated">
              <div className="relative h-44 overflow-hidden">
                <img src={h.img} alt={h.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-110" />
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-xs font-bold">
                  <Star className="h-3 w-3 fill-accent text-accent" /> {h.rating}
                </span>
              </div>
              <div className="p-4">
                <div className="text-sm font-bold text-foreground">{h.name}</div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {h.city}
                </div>
                <div className="mt-2 flex gap-2 text-muted-foreground">
                  <Wifi className="h-3.5 w-3.5" /><Coffee className="h-3.5 w-3.5" /><Dumbbell className="h-3.5 w-3.5" />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground">From</div>
                    <div className="text-lg font-extrabold text-primary">${h.price}<span className="text-xs font-normal text-muted-foreground">/night</span></div>
                  </div>
                  <button className="rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">View</button>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">{h.reviews.toLocaleString()} reviews</div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
