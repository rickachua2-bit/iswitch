import { Search, CreditCard, Plane } from "lucide-react";

const STEPS = [
  { icon: Search, title: "Search & compare", desc: "Compare 500+ airlines, 1.5M stays, and visa options in one place." },
  { icon: CreditCard, title: "Book in 60 seconds", desc: "Secure checkout with Apple Pay, cards, bank transfer & instalments." },
  { icon: Plane, title: "Travel with peace", desc: "24/7 concierge, free changes, and a real expert one tap away." },
];

export function HowItWorks() {
  return (
    <section className="bg-secondary/40 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            How it works
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground md:text-3xl">
            Three steps. Zero stress.
          </h2>
        </div>
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="relative rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="absolute -top-3 left-6 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  Step {i + 1}
                </div>
                <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-accent text-accent-foreground shadow-glow">
                  <Icon className="h-6 w-6" strokeWidth={2.4} />
                </div>
                <div className="mt-4 font-display text-lg font-extrabold text-foreground">{s.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
