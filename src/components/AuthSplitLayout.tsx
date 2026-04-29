import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Plane,
  Hotel,
  FileCheck2,
  Compass,
  Car,
  HeartHandshake,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import iswitchLogo from "@/assets/iswitch-logo.jpeg";

type Variant = "customer" | "agent";

interface AuthSplitLayoutProps {
  variant: Variant;
  /** Right-pane heading shown above the form (e.g. "Welcome back") */
  formTitle: string;
  formSubtitle?: string;
  children: React.ReactNode;
  /** Show the "continue as guest" exit at the bottom of the right pane. */
  showGuestExit?: boolean;
}

const CUSTOMER_BULLETS = [
  { icon: Plane, title: "Flights from 500+ airlines", body: "Real-time fares, instant ticketing, free seat selection." },
  { icon: Hotel, title: "2M+ hotels & homes", body: "Best price guarantee with flexible cancellation." },
  { icon: FileCheck2, title: "Visas to 100+ countries", body: "Sherpa-style eligibility with concierge fulfilment." },
  { icon: ShieldCheck, title: "Travel insurance from $4/day", body: "Schengen-approved, instant policy, 24/7 support." },
  { icon: Compass, title: "Curated tours & experiences", body: "Free cancellation on most bookings." },
  { icon: Car, title: "Airport transfers worldwide", body: "Track flight delays, meet & greet included." },
];

const AGENT_BULLETS = [
  { icon: Sparkles, title: "B2B wholesale rates", body: "Net rates on flights, hotels and visas — keep your margin." },
  { icon: HeartHandshake, title: "Dedicated agent support", body: "Direct line to our ops team, 24/7 escalation." },
  { icon: ShieldCheck, title: "Verified agency badge", body: "After KYB approval, list publicly as a verified iSwitch partner." },
  { icon: FileCheck2, title: "One platform, all verticals", body: "Flights, stays, visas, insurance, tours and transfers in one console." },
];

const STATS = [
  { v: "2M+", l: "Properties" },
  { v: "500+", l: "Airlines" },
  { v: "100+", l: "Visa routes" },
  { v: "120+", l: "Countries" },
];

export function AuthSplitLayout({
  variant,
  formTitle,
  formSubtitle,
  children,
  showGuestExit = true,
}: AuthSplitLayoutProps) {
  const bullets = variant === "agent" ? AGENT_BULLETS : CUSTOMER_BULLETS;
  const heroTitle =
    variant === "agent"
      ? "Grow your travel business with iSwitch."
      : "Travel smarter. Book everything in one place.";
  const heroSub =
    variant === "agent"
      ? "Join thousands of verified travel agents using iSwitch as their B2B engine for flights, stays, visas and more."
      : "From flights and stays to visas, insurance and airport transfers — iSwitch puts your whole trip under one login.";

  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* LEFT — marketing pane */}
        <aside className="relative hidden overflow-hidden bg-gradient-hero text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
          {/* decorative glow */}
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />

          <div className="relative">
            <Link to="/" className="inline-flex items-center gap-3 text-sm font-extrabold tracking-tight">
              <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/40">
                <img src={iswitchLogo} alt="iSwitch logo" className="h-full w-full object-cover" />
              </span>
              <span className="font-display text-lg">iSwitch</span>
            </Link>

            <div className="mt-12 max-w-md">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-white/20 backdrop-blur">
                {variant === "agent" ? "For travel agencies" : "For travelers"}
              </span>
              <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight md:text-4xl">
                {heroTitle}
              </h2>
              <p className="mt-3 text-sm text-primary-foreground/80 md:text-base">
                {heroSub}
              </p>
            </div>

            <ul className="mt-10 space-y-4">
              {bullets.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15 backdrop-blur">
                    <b.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-bold">{b.title}</div>
                    <div className="text-xs text-primary-foreground/75">{b.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-10">
            <div className="grid grid-cols-4 gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur">
              {STATS.map((s) => (
                <div key={s.l} className="text-center">
                  <div className="font-display text-xl font-extrabold">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-primary-foreground/70">{s.l}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-primary-foreground/60">
              © {new Date().getFullYear()} iSwitch. Trusted travel partner.
            </p>
          </div>
        </aside>

        {/* RIGHT — form pane */}
        <main className="flex min-h-screen flex-col bg-secondary/30">
          <header className="flex items-center justify-between px-5 py-4 lg:hidden">
            <Link to="/" className="flex items-center gap-2 text-sm font-extrabold">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-white ring-2 ring-primary/20">
                <img src={iswitchLogo} alt="iSwitch logo" className="h-full w-full object-cover" />
              </span>
              iSwitch
            </Link>
            <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              Back to home
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 py-8 md:px-10">
            <div className="w-full max-w-md">
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  <ShieldCheck className="h-3 w-3" /> Verified & secure
                </span>
                <h1 className="mt-4 font-display text-3xl font-extrabold text-foreground md:text-4xl">
                  {formTitle}
                </h1>
                {formSubtitle && (
                  <p className="mt-2 text-sm text-muted-foreground">{formSubtitle}</p>
                )}
              </div>

              <div className="auth-form mt-6 rounded-2xl border-2 border-primary/15 bg-card p-6 shadow-xl shadow-primary/5 ring-1 ring-accent/10">
                {children}
              </div>

              {showGuestExit && (
                <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-4 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    No account needed
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    You can also search and book as a guest.
                  </p>
                  <Link
                    to="/"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-primary hover:underline"
                  >
                    Continue as guest <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <footer className="border-t border-border/50 px-5 py-4 text-center text-[11px] text-muted-foreground">
            By continuing you agree to iSwitch's{" "}
            <Link to="/" className="font-semibold text-foreground hover:underline">Terms</Link>{" "}
            and{" "}
            <Link to="/" className="font-semibold text-foreground hover:underline">Privacy Policy</Link>.
          </footer>
        </main>
      </div>
    </div>
  );
}
