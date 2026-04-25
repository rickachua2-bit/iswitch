import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { Car, Users, Briefcase, Snowflake } from "lucide-react";

export const Route = createFileRoute("/pickups")({
  head: () => ({
    meta: [
      { title: "Airport Pickups & Car Transfers worldwide | iSwitch" },
      { name: "description", content: "Pre-book reliable airport pickups and private car transfers in 100+ cities. Fixed prices, English-speaking drivers, flight tracking." },
      { property: "og:title", content: "Airport Pickups | iSwitch" },
      { property: "og:description", content: "Reliable airport transfers and chauffeur service." },
    ],
  }),
  component: PickupsPage,
});

const VEHICLES = [
  { type: "Economy Sedan", desc: "Toyota Corolla or similar", pax: 3, bags: 2, price: 28 },
  { type: "Comfort SUV", desc: "Toyota RAV4 or similar", pax: 4, bags: 3, price: 45 },
  { type: "Business Class", desc: "Mercedes E-Class", pax: 3, bags: 2, price: 78 },
  { type: "Luxury Van", desc: "Mercedes V-Class", pax: 7, bags: 7, price: 120 },
];

function PickupsPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Land. Step out. Drive away.
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Pre-book airport pickups in 100+ cities · Flight tracking included</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h2 className="mb-4 font-display text-xl font-bold">Choose your vehicle · LOS → Victoria Island</h2>
        <div className="space-y-3">
          {VEHICLES.map((v) => (
            <div key={v.type} className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-card md:grid-cols-[auto_1fr_auto] md:items-center">
              <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-secondary">
                <Car className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="font-bold">{v.type}</div>
                <div className="text-sm text-muted-foreground">{v.desc}</div>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {v.pax} passengers</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {v.bags} bags</span>
                  <span className="flex items-center gap-1"><Snowflake className="h-3 w-3" /> A/C</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-2xl font-extrabold text-primary">${v.price}</div>
                <button className="rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold text-accent-foreground">Book now</button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
