import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { Check } from "lucide-react";

export const Route = createFileRoute("/insurance")({
  head: () => ({
    meta: [
      { title: "Travel Insurance — Cover from $4/day | iSwitch" },
      { name: "description", content: "Affordable travel and medical insurance for trips abroad. Schengen-approved, COVID-19 cover, instant policy." },
      { property: "og:title", content: "Travel Insurance | iSwitch" },
      { property: "og:description", content: "Protect every trip with comprehensive travel insurance." },
    ],
  }),
  component: InsurancePage,
});

const PLANS = [
  { name: "Essential", price: 4, perks: ["$50K medical", "Trip cancellation", "Lost luggage up to $500", "24/7 hotline"], highlight: false },
  { name: "Plus", price: 9, perks: ["$250K medical", "Trip cancellation & delay", "Lost luggage up to $2,000", "Adventure sports", "COVID-19 cover"], highlight: true },
  { name: "Premium", price: 16, perks: ["$1M medical", "Cancel for any reason", "Unlimited luggage", "Concierge support", "Rental car cover", "Pre-existing conditions"], highlight: false },
];

function InsurancePage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Travel insurance from $4/day.
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Schengen-approved · COVID cover · Instant policy</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h2 className="mb-6 font-display text-xl font-bold">Choose your cover</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-6 ${
                p.highlight ? "border-accent bg-card shadow-elevated" : "border-border bg-card shadow-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-accent px-3 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">
                  Most popular
                </span>
              )}
              <div className="font-display text-lg font-bold">{p.name}</div>
              <div className="mt-2"><span className="text-3xl font-extrabold text-primary">${p.price}</span><span className="text-sm text-muted-foreground">/day</span></div>
              <ul className="mt-4 space-y-2.5">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 text-success" /> <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <button className={`mt-5 w-full rounded-lg py-2.5 text-sm font-bold ${
                p.highlight ? "bg-gradient-accent text-accent-foreground" : "bg-gradient-primary text-primary-foreground"
              }`}>
                Get covered
              </button>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
