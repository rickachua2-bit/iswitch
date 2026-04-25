import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { Plane, Clock, Wifi, Briefcase } from "lucide-react";

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: "Cheap Flights — Compare 500+ airlines | iSwitch" },
      { name: "description", content: "Compare and book flights to anywhere in the world. Best price guarantee on 500+ airlines." },
      { property: "og:title", content: "Cheap Flights | iSwitch" },
      { property: "og:description", content: "Search and book the cheapest flights worldwide." },
    ],
  }),
  component: FlightsPage,
});

const RESULTS = [
  { airline: "British Airways", code: "BA 075", from: "LOS 22:30", to: "LHR 05:45+1", duration: "7h 15m", stops: "Direct", price: "$612", img: "✈️" },
  { airline: "Emirates", code: "EK 783", from: "LOS 14:15", to: "LHR 11:30+1", duration: "13h 15m", stops: "1 stop · DXB", price: "$548", img: "✈️" },
  { airline: "Virgin Atlantic", code: "VS 412", from: "LOS 23:50", to: "LHR 06:20+1", duration: "6h 30m", stops: "Direct", price: "$689", img: "✈️" },
  { airline: "Lufthansa", code: "LH 569", from: "LOS 06:00", to: "LHR 14:50", duration: "8h 50m", stops: "1 stop · FRA", price: "$501", img: "✈️" },
];

function FlightsPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Compare cheap flights worldwide
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">500+ airlines · Best price guarantee · No hidden fees</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">{RESULTS.length} flights · Lagos → London</h2>
          <select className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold">
            <option>Sort: Best</option><option>Cheapest</option><option>Fastest</option>
          </select>
        </div>
        <div className="space-y-3">
          {RESULTS.map((r) => (
            <div key={r.code} className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elevated md:grid-cols-[1fr_2fr_auto] md:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">{r.img}</div>
                <div>
                  <div className="text-sm font-bold text-foreground">{r.airline}</div>
                  <div className="text-xs text-muted-foreground">{r.code}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 items-center gap-2 text-center">
                <div>
                  <div className="text-base font-bold">{r.from.split(" ")[1]}</div>
                  <div className="text-xs text-muted-foreground">{r.from.split(" ")[0]}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <Plane className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-1">{r.duration}</div>
                  <div className="text-[10px]">{r.stops}</div>
                </div>
                <div>
                  <div className="text-base font-bold">{r.to.split(" ")[1]}</div>
                  <div className="text-xs text-muted-foreground">{r.to.split(" ")[0]}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-2xl font-extrabold text-primary">{r.price}</div>
                <button className="rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-card transition hover:opacity-90">
                  Select →
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[[Clock, "Fast booking"], [Wifi, "Live tracking"], [Briefcase, "Bag included"], [Plane, "Seat select"]].map(([Icon, label]: any) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
