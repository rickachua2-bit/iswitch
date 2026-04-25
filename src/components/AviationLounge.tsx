import { Link } from "@tanstack/react-router";
import { GraduationCap, Briefcase, Plane, Building2, ArrowRight } from "lucide-react";

const CONSULTATIONS = [
  { icon: GraduationCap, title: "Study Abroad", desc: "Universities, scholarships, applications", color: "from-blue-500 to-indigo-600" },
  { icon: Plane, title: "Immigration", desc: "PR, citizenship, family reunification", color: "from-emerald-500 to-teal-600" },
  { icon: Briefcase, title: "Work Abroad", desc: "Job placement & work permits", color: "from-amber-500 to-orange-600" },
  { icon: Building2, title: "Business Registration", desc: "LLC, offshore & global incorporation", color: "from-rose-500 to-pink-600" },
];

export function AviationLounge() {
  return (
    <section className="bg-gradient-hero py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 max-w-2xl">
          <span className="inline-block rounded-full bg-accent/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            Expert consultations
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-primary-foreground md:text-3xl">
            Talk to a certified global mobility expert
          </h2>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Whether you're studying, relocating, working or registering a business abroad — book a paid 30, 60 or 90-minute session with a certified consultant. Transparent pricing, real expertise.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CONSULTATIONS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.title}
                to="/consultations"
                className="group rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur transition hover:bg-white/15"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-white shadow-glow`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="font-display text-lg font-bold text-primary-foreground">{c.title}</div>
                <div className="mt-1 text-sm text-primary-foreground/75">{c.desc}</div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-accent">
                  Book a session <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
