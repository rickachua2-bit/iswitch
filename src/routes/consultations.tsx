import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { GraduationCap, Plane, Briefcase, Building2, CheckCircle2, Calendar, Clock, Globe } from "lucide-react";

export const Route = createFileRoute("/consultations")({
  head: () => ({
    meta: [
      { title: "Free Expert Consultations — Study, Work & Immigrate Abroad | iSwitch" },
      { name: "description", content: "Book a free 30-minute consultation with a certified expert on study abroad, immigration, work abroad and global business registration." },
      { property: "og:title", content: "Free Travel & Mobility Consultations | iSwitch" },
      { property: "og:description", content: "Talk to a global mobility expert — on us." },
    ],
  }),
  component: ConsultationsPage,
});

const SERVICES = [
  { icon: GraduationCap, title: "Study Abroad", desc: "Universities, scholarships, SOPs, applications", color: "from-blue-500 to-indigo-600" },
  { icon: Plane, title: "Immigration", desc: "PR, citizenship, family sponsorship, asylum", color: "from-emerald-500 to-teal-600" },
  { icon: Briefcase, title: "Work Abroad", desc: "Job placement, work permits, skill assessments", color: "from-amber-500 to-orange-600" },
  { icon: Building2, title: "Business Registration", desc: "LLC, offshore, free zones, global incorporation", color: "from-rose-500 to-pink-600" },
];

function ConsultationsPage() {
  const [service, setService] = useState("Study Abroad");
  const [country, setCountry] = useState("Canada");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-12 md:pb-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            100% Free · No obligation
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
            Talk to a global mobility expert
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Book a free 30-minute call. We'll match you with a certified consultant for your destination.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-7xl px-4 pb-16 md:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SERVICES.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="font-display text-lg font-bold">{s.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
                  <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-success" /> 30-min discovery call</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-success" /> Personalised roadmap</li>
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-success" /> No upfront fees</li>
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <div className="font-display text-xl font-bold">Book your free call</div>
            <p className="mt-1 text-sm text-muted-foreground">We'll confirm by email within 24 hours.</p>

            {submitted ? (
              <div className="mt-6 rounded-xl border border-success/30 bg-success/10 p-5 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
                <div className="mt-2 font-bold">Request received!</div>
                <p className="mt-1 text-sm text-muted-foreground">A consultant will email you shortly.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
                className="mt-5 space-y-3"
              >
                <FormRow icon={GraduationCap} label="Service">
                  <select value={service} onChange={(e) => setService(e.target.value)} className="w-full bg-transparent text-sm font-semibold focus:outline-none">
                    {SERVICES.map((s) => <option key={s.title}>{s.title}</option>)}
                  </select>
                </FormRow>
                <FormRow icon={Globe} label="Destination country">
                  <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-transparent text-sm font-semibold focus:outline-none" />
                </FormRow>
                <FormRow icon={Briefcase} label="Your name">
                  <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full bg-transparent text-sm font-semibold focus:outline-none" />
                </FormRow>
                <FormRow icon={Briefcase} label="Email">
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full bg-transparent text-sm font-semibold focus:outline-none" />
                </FormRow>
                <FormRow icon={Calendar} label="Preferred date">
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm font-semibold focus:outline-none" />
                </FormRow>
                <button type="submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-accent py-3 text-sm font-bold text-accent-foreground shadow-glow transition hover:opacity-95">
                  <Clock className="h-4 w-4" /> Book free 30-min call
                </button>
                <p className="text-center text-[11px] text-muted-foreground">By booking, you agree to our terms & privacy policy.</p>
              </form>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

function FormRow({ icon: Icon, label, children }: { icon: typeof Globe; label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 rounded-xl border border-border bg-background px-3.5 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      {children}
    </label>
  );
}
