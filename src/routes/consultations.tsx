import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Star, Users, Award } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ConsultationFlow } from "@/components/ConsultationFlow";

export const Route = createFileRoute("/consultations")({
  head: () => ({
    meta: [
      { title: "Book a Consultation — iSwitch" },
      { name: "description", content: "Book paid consultations with certified experts on study abroad, immigration, work abroad and business setup. Guest checkout available." },
      { property: "og:title", content: "Book a Consultation — iSwitch" },
      { property: "og:description", content: "1-on-1 expert calls. Same-week slots. Money-back guarantee." },
    ],
  }),
  component: ConsultationsPage,
});

function ConsultationsPage() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />

      {/* CONVERTING HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-glow to-accent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,hsl(var(--accent)/0.55),transparent_50%),radial-gradient(circle_at_85%_85%,hsl(var(--primary-glow)/0.6),transparent_55%)]" />
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
            <div className="text-primary-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Talk to a certified expert
              </span>
              <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight md:text-5xl">
                Get a clear plan to <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">move abroad</span> — in one call.
              </h1>
              <p className="mt-3 max-w-xl text-base text-primary-foreground/85">
                Study, immigration, work or business — book a 1-on-1 with a vetted iSwitch advisor and walk away with a step-by-step action plan. Guest checkout, no account needed.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a href="#book" className="rounded-full bg-white px-6 py-3 text-sm font-extrabold text-primary shadow-card transition hover:scale-[1.02]">
                  Book a session →
                </a>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <div className="flex items-center text-amber-300">
                    {[0,1,2,3,4].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <span className="opacity-90">4.9 from 2,300+ reviews</span>
                </div>
              </div>

              {/* Trust pills */}
              <div className="mt-8 flex flex-wrap gap-3">
                {[
                  { icon: Users, label: "12,000+ helped" },
                  { icon: Award, label: "Certified advisors" },
                  { icon: Sparkles, label: "Same-week slots" },
                ].map((p) => (
                  <div key={p.label} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                    <p.icon className="h-3.5 w-3.5" /> {p.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Highlight card */}
            <div className="rounded-3xl bg-white/15 p-6 text-primary-foreground shadow-elevated backdrop-blur">
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">What you get</div>
              <ul className="mt-3 space-y-3 text-sm">
                {[
                  "1-on-1 video call with an expert",
                  "Custom action plan emailed after",
                  "Document checklist & next steps",
                  "Follow-up Q&A within 7 days",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                      <Sparkles className="h-3 w-3" />
                    </div>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-2xl bg-black/25 p-4 text-xs">
                💸 <span className="font-extrabold">Money-back guarantee</span> — not satisfied after the call? Full refund, no questions.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FLOW */}
      <section id="book" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <ConsultationFlow successHref="/dashboard/bookings" />
      </section>

      <Footer />
    </div>
  );
}
