import { createFileRoute } from "@tanstack/react-router";
import { ConsultationFlow } from "@/components/ConsultationFlow";
import { Sparkles, Award, Users, Star } from "lucide-react";

export const Route = createFileRoute("/dashboard/consultations")({
  head: () => ({ meta: [{ title: "Book a consultation — iSwitch dashboard" }] }),
  component: DashboardConsultationsPage,
});

function DashboardConsultationsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero (compact, branded) */}
      <section className="relative overflow-hidden rounded-3xl shadow-elevated">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-glow to-accent" />
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative grid gap-6 px-6 py-8 text-primary-foreground md:grid-cols-[1.4fr_1fr] md:px-10 md:py-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Expert consultations
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold md:text-4xl">
              Book a 1-on-1 with a certified expert
            </h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/85 md:text-base">
              Study abroad, immigration, work permits or business setup — get a custom action plan without leaving your dashboard.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: Users, label: "12,000+ helped" },
                { icon: Award, label: "Certified advisors" },
                { icon: Star, label: "4.9 / 5 rating" },
              ].map((p) => (
                <div key={p.label} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur">
                  <p.icon className="h-3.5 w-3.5" /> {p.label}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/15 p-5 text-primary-foreground backdrop-blur">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90">What's included</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>✓ 1-on-1 video call</li>
              <li>✓ Personalized action plan</li>
              <li>✓ Document checklist</li>
              <li>✓ 7-day follow-up Q&A</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Booking flow */}
      <ConsultationFlow successHref="/dashboard/bookings" />
    </div>
  );
}
