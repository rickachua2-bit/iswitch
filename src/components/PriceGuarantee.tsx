import { BadgePercent, RefreshCw, Headphones, Wallet } from "lucide-react";

const PROMISES = [
  { icon: BadgePercent, title: "Best price guarantee", desc: "Find it cheaper? We refund 110% of the difference." },
  { icon: RefreshCw, title: "Free cancellation", desc: "On most flights & stays — no questions asked, up to 24h." },
  { icon: Headphones, title: "24/7 real human support", desc: "Reach a real travel expert in under 90 seconds, anytime." },
  { icon: Wallet, title: "Pay your way", desc: "Cards, bank transfer, Apple Pay or 3 instalments — your choice." },
];

export function PriceGuarantee() {
  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-10 max-w-2xl">
          <span className="inline-block rounded-full bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            Our promise
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground md:text-3xl">
            Booked smart. Backed by iSwitch.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {PROMISES.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className="rounded-2xl border border-border bg-gradient-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-elevated">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div className="mt-4 font-display text-base font-extrabold text-foreground">{p.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{p.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
