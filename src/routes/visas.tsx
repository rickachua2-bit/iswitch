import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { CheckCircle2, Clock, FileCheck, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/visas")({
  head: () => ({
    meta: [
      { title: "Fast-track Visa Processing | iSwitch" },
      { name: "description", content: "Apply for tourist, business, student or work visas to 100+ countries. Fast-track processing and document review by certified agents." },
      { property: "og:title", content: "Visa Services | iSwitch" },
      { property: "og:description", content: "Hassle-free visa applications for 100+ countries." },
    ],
  }),
  component: VisasPage,
});

const VISAS = [
  { country: "United Kingdom", type: "Tourist (6 months)", time: "15 working days", price: "$245", flag: "🇬🇧" },
  { country: "United States", type: "B1/B2 Visa", time: "21 working days", price: "$320", flag: "🇺🇸" },
  { country: "Schengen Area", type: "Tourist (90 days)", time: "10 working days", price: "$180", flag: "🇪🇺" },
  { country: "Canada", type: "Visitor Visa", time: "14 working days", price: "$210", flag: "🇨🇦" },
  { country: "United Arab Emirates", type: "30-day Tourist", time: "3 working days", price: "$95", flag: "🇦🇪" },
  { country: "Australia", type: "eVisitor (subclass 651)", time: "7 working days", price: "$150", flag: "🇦🇺" },
];

function VisasPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Get your visa, stress-free.
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Tourist, business, student & work visas for 100+ countries</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <h2 className="mb-4 font-display text-xl font-bold">Popular destinations</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {VISAS.map((v) => (
            <div key={v.country} className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elevated">
              <div className="mb-3 flex items-start justify-between">
                <div className="text-3xl">{v.flag}</div>
                <span className="rounded-md bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase text-success">In stock</span>
              </div>
              <div className="font-display text-lg font-bold">{v.country}</div>
              <div className="text-sm text-muted-foreground">{v.type}</div>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Processing: {v.time}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-xl font-extrabold text-primary">{v.price}</div>
                <button className="rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold text-accent-foreground">Apply now</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            [FileCheck, "Document review", "Certified agents check every document before submission"],
            [ShieldCheck, "100% secure", "Your passport and data are encrypted and protected"],
            [CheckCircle2, "Refund guarantee", "Full refund if your visa is rejected for our error"],
          ].map(([Icon, title, desc]: any) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="h-7 w-7 text-primary" />
              <div className="mt-3 font-bold">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
