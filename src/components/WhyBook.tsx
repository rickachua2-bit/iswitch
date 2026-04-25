import { Crown, CreditCard, PlaneTakeoff, Headphones } from "lucide-react";

const FEATURES = [
  {
    icon: CreditCard,
    title: "Multi-Currency Wallet",
    body: "Pay effortlessly in NGN, USD, GBP, or EUR from a single wallet. We instantly handle the forex, guaranteeing 0% payment drop-offs globally.",
    tone: "bg-blue-500/15 text-blue-300",
  },
  {
    icon: PlaneTakeoff,
    title: "500+ Top Airlines",
    body: "Through our deep market integrations, we offer real-time inventory on the world's most luxurious and reliable airlines at exclusive wholesale rates.",
    tone: "bg-success/15 text-success",
  },
  {
    icon: Headphones,
    title: "24/7 Global Concierge",
    body: "Change of plans? Flight delayed? Our human-in-the-loop AI support team rebooks, refunds, and assists you within minutes, anywhere in the world.",
    tone: "bg-primary/20 text-primary",
  },
];

export function WhyBook() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="rounded-3xl border border-border/60 bg-gradient-card p-8 shadow-card md:p-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Crown className="h-3 w-3" /> Why Book with iSwitch
          </div>
          <h3 className="mt-3 font-display text-3xl font-extrabold md:text-4xl">The Ultimate Flight Experience</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            We don't just sell tickets. We guarantee the smoothest travel lifecycle on the planet with real-time multi-currency payments and zero gateway failures.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-border/60 bg-background/40 p-5">
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${f.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="font-display text-base font-bold">{f.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
