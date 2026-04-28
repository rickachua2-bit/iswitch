import { Link } from "@tanstack/react-router";
import { Plane, Sparkles, Clock, Globe2, Shield, Wallet, Headphones, BadgeCheck } from "lucide-react";

/* ---------------- Quick route chips (trip.com style) ---------------- */
const QUICK_ROUTES = [
  { from: "Lagos (LOS)", to: "London (LHR)", price: "$548" },
  { from: "Lagos (LOS)", to: "Dubai (DXB)", price: "$612" },
  { from: "Abuja (ABV)", to: "Toronto (YYZ)", price: "$789" },
  { from: "Lagos (LOS)", to: "New York (JFK)", price: "$842" },
  { from: "Accra (ACC)", to: "Paris (CDG)", price: "$498" },
  { from: "Nairobi (NBO)", to: "Tokyo (HND)", price: "$924" },
  { from: "Cairo (CAI)", to: "Istanbul (IST)", price: "$298" },
  { from: "Lagos (LOS)", to: "Johannesburg (JNB)", price: "$412" },
];

export function QuickRouteChips({
  onPick,
}: {
  onPick: (origin: string, destination: string) => void;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
            Popular flight routes
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Tap a route to prefill the search — live fares update instantly
          </p>
        </div>
        <span className="hidden rounded-full bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent md:inline-flex">
          <Sparkles className="mr-1 h-3 w-3" /> Updated daily
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {QUICK_ROUTES.map((r) => (
          <button
            key={`${r.from}-${r.to}`}
            type="button"
            onClick={() => onPick(r.from, r.to)}
            className="group flex items-center justify-between rounded-xl border border-border bg-card p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <Plane className="h-3 w-3 text-primary" />
                <span className="truncate">{r.from.split(" (")[0]}</span>
                <span className="text-muted-foreground/60">→</span>
                <span className="truncate">{r.to.split(" (")[0]}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">from</div>
            </div>
            <div className="rounded-md bg-primary/10 px-2 py-1 text-sm font-extrabold text-primary group-hover:bg-primary group-hover:text-primary-foreground">
              {r.price}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Cabin class showcase ---------------- */
const CABINS = [
  {
    name: "Economy",
    desc: "Best value seats with included cabin baggage on most fares.",
    perks: ["Carry-on included", "Loyalty points", "Free seat selection*"],
    accent: "from-primary/15 to-primary/0",
  },
  {
    name: "Premium Economy",
    desc: "Extra legroom, upgraded meals and priority boarding.",
    perks: ["+5 inches legroom", "Premium meals", "Priority boarding"],
    accent: "from-accent/20 to-accent/0",
  },
  {
    name: "Business",
    desc: "Lie-flat seats, lounge access and chauffeur on select routes.",
    perks: ["Lie-flat beds", "Lounge access", "Chauffeur*"],
    accent: "from-warning/20 to-warning/0",
  },
  {
    name: "First Class",
    desc: "Private suites, à la carte dining and end-to-end concierge.",
    perks: ["Private suites", "À la carte menu", "Concierge"],
    accent: "from-destructive/15 to-destructive/0",
  },
];

export function CabinClasses() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-4">
        <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
          Fly your way
        </h2>
        <p className="text-xs text-muted-foreground md:text-sm">
          Compare cabin classes across 500+ airlines
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {CABINS.map((c) => (
          <div
            key={c.name}
            className={`relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-1 hover:shadow-elevated`}
          >
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${c.accent} blur-2xl`} />
            <div className="relative">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cabin</div>
              <div className="font-display text-lg font-extrabold text-foreground">{c.name}</div>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
              <ul className="mt-3 space-y-1.5">
                {c.perks.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 text-xs text-foreground">
                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Flight value props ---------------- */
const VALUE = [
  { icon: Wallet, title: "Best price guarantee", desc: "Found cheaper? We'll match or refund the difference." },
  { icon: Globe2, title: "500+ airlines", desc: "Live NDC + GDS inventory across every major carrier." },
  { icon: Clock, title: "Real-time confirmation", desc: "Instant ticketing — no waiting, no surprises." },
  { icon: Shield, title: "Secure payments", desc: "Bank-grade encryption on every transaction." },
  { icon: Headphones, title: "24/7 support", desc: "Real humans available across every timezone." },
  { icon: BadgeCheck, title: "Free cancellation*", desc: "On select fares — clearly shown before you book." },
];

export function FlightValueProps() {
  return (
    <section className="bg-secondary/40 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-6 text-center">
          <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
            Why book flights with iSwitch
          </h2>
          <p className="text-xs text-muted-foreground md:text-sm">
            Trusted by 50,000+ travelers worldwide
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {VALUE.map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.title} className="rounded-xl border border-border bg-card p-4 text-center shadow-card">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-sm font-bold text-foreground">{v.title}</div>
                <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{v.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Flight FAQ ---------------- */
const FAQ = [
  {
    q: "How do I find the cheapest flight?",
    a: "Use the 'Cheapest' sort tab on the results page, try flexible dates, and consider nearby airports. Our flash deals also surface curated savings updated every 24 hours.",
  },
  {
    q: "Are the prices on iSwitch real-time?",
    a: "Yes. Every search queries live NDC and GDS inventory across 500+ airlines, so the fares you see are bookable in real time.",
  },
  {
    q: "Can I book multi-city or open-jaw itineraries?",
    a: "Absolutely. Switch the trip type to 'Multi-city' on the search bar and add up to 5 segments.",
  },
  {
    q: "Do I need a visa for my destination?",
    a: "Many destinations require a visa. We can help — book a paid expert consultation or use our visa concierge from the main menu.",
  },
];

export function FlightFAQ() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <div className="mb-6 text-center">
        <h2 className="font-display text-xl font-extrabold text-foreground md:text-2xl">
          Flight booking — questions answered
        </h2>
      </div>
      <div className="space-y-3">
        {FAQ.map((f) => (
          <details
            key={f.q}
            className="group rounded-xl border border-border bg-card p-4 shadow-card transition open:border-primary/40"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-bold text-foreground">
              {f.q}
              <span className="text-primary transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          to="/consultations"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow transition hover:opacity-95"
        >
          Talk to a travel expert
        </Link>
      </div>
    </section>
  );
}
