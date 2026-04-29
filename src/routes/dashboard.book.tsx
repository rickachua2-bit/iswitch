import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchTabs } from "@/components/SearchTabs";
import { Sparkles, ShieldCheck, Headphones, Wallet, Plane, Hotel, FileCheck, Map, Tag, Globe2, Clock, Star } from "lucide-react";

export const Route = createFileRoute("/dashboard/book")({
  head: () => ({ meta: [{ title: "Search & book — iSwitch dashboard" }] }),
  component: BookPage,
});

function BookPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Colorful hero with embedded search */}
      <section className="relative overflow-hidden rounded-3xl shadow-elevated">
        {/* Layered gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-glow to-accent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,hsl(var(--accent)/0.55),transparent_50%),radial-gradient(circle_at_85%_90%,hsl(var(--primary-glow)/0.6),transparent_55%)]" />
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative px-5 pt-8 pb-6 md:px-10 md:pt-12">
          <div className="mb-6 flex flex-col items-start gap-3 text-primary-foreground md:mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Welcome back — your trip starts here
            </span>
            <h1 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">
              Search &amp; book everything in one place
            </h1>
            <p className="max-w-2xl text-sm text-primary-foreground/85 md:text-base">
              Flights, hotels, visas, insurance, tours and transfers — instantly compared, beautifully booked.
            </p>
          </div>

          {/* Search tabs sit on top of the colorful hero */}
          <div className="-mx-5 md:-mx-10">
            <SearchTabs />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: ShieldCheck, label: "Secure payments", color: "from-emerald-500 to-teal-500" },
          { icon: Headphones, label: "24/7 live support", color: "from-blue-500 to-indigo-500" },
          { icon: Wallet, label: "Best price promise", color: "from-amber-500 to-orange-500" },
          { icon: Globe2, label: "200+ destinations", color: "from-fuchsia-500 to-pink-500" },
        ].map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-glow`}>
              <Icon className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <span className="text-sm font-bold text-foreground">{label}</span>
          </div>
        ))}
      </section>

      {/* Quick-launch verticals */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold text-foreground">Quick launch</h2>
            <p className="text-sm text-muted-foreground">Jump straight into a service.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            { to: "/flights", label: "Flights", icon: Plane, grad: "from-sky-500 to-blue-600" },
            { to: "/stays", label: "Hotels", icon: Hotel, grad: "from-violet-500 to-purple-600" },
            { to: "/visas", label: "Visas", icon: FileCheck, grad: "from-emerald-500 to-green-600" },
            { to: "/insurance", label: "Insurance", icon: ShieldCheck, grad: "from-amber-500 to-orange-600" },
            { to: "/tours", label: "Tours", icon: Map, grad: "from-rose-500 to-pink-600" },
            { to: "/pickups", label: "Transfers", icon: Globe2, grad: "from-cyan-500 to-teal-600" },
          ].map(({ to, label, icon: Icon, grad }) => (
            <Link
              key={to}
              to={to}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-center shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-glow transition group-hover:scale-110`}>
                <Icon className="h-6 w-6" strokeWidth={2.4} />
              </div>
              <div className="text-sm font-extrabold text-foreground">{label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Deals + tips row */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-glow p-5 text-primary-foreground shadow-elevated md:col-span-2">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Tag className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">Member deal</div>
              <div className="mt-1 font-display text-lg font-extrabold md:text-xl">
                Save up to 25% on Schengen visa packages
              </div>
              <p className="mt-1 text-sm opacity-90">Bundle visa + insurance + airport transfer and unlock instant savings.</p>
              <Link
                to="/visas"
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-primary shadow-card transition hover:scale-[1.02]"
              >
                Explore visa bundles
              </Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center gap-2 text-amber-500">
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
            <Star className="h-5 w-5 fill-current" />
          </div>
          <p className="mt-3 text-sm font-semibold text-foreground">
            “Booked my flight, hotel and visa in one go — refund hit my wallet in 2 hours.”
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Verified traveler · Lagos → London
          </div>
        </div>
      </section>

      {/* Trending destinations */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold text-foreground">Trending destinations</h2>
            <p className="text-sm text-muted-foreground">Popular with iSwitch travelers this week.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { city: "London", country: "United Kingdom", grad: "from-indigo-600 to-blue-700", from: "₦1,250,000" },
            { city: "Dubai", country: "UAE", grad: "from-amber-500 to-rose-600", from: "₦780,000" },
            { city: "Paris", country: "France", grad: "from-pink-500 to-fuchsia-600", from: "₦1,120,000" },
            { city: "Toronto", country: "Canada", grad: "from-emerald-500 to-cyan-600", from: "₦1,890,000" },
          ].map((d) => (
            <Link
              key={d.city}
              to="/flights"
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${d.grad} p-4 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated`}
            >
              <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-wider opacity-90">{d.country}</div>
                <div className="mt-1 font-display text-xl font-extrabold">{d.city}</div>
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur">
                  From {d.from}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
