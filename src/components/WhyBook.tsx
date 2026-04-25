import { Award, BadgeCheck, Headphones, ShieldCheck } from "lucide-react";

const ITEMS = [
  { icon: BadgeCheck, title: "Best price guarantee", desc: "Found cheaper? We'll refund the difference." },
  { icon: ShieldCheck, title: "Secure & trusted", desc: "Bank-grade encryption on every booking." },
  { icon: Headphones, title: "24/7 customer care", desc: "Real humans across every timezone." },
  { icon: Award, title: "Award-winning service", desc: "Rated 4.8 by 50,000+ travelers." },
];

export function WhyBook() {
  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 text-center">
          <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">Why book with iSwitch</h2>
          <p className="mt-1 text-sm text-muted-foreground">The trusted global mobility partner</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-display text-base font-bold text-foreground">{it.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{it.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
