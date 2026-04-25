import { Link } from "@tanstack/react-router";
import { Plane, Hotel, FileCheck, Shield, Map, Car, GraduationCap, ArrowRight } from "lucide-react";

const SERVICES = [
  { icon: Plane, label: "Fly", desc: "500+ airlines, lowest fares", to: "/flights", color: "bg-sky-100 text-sky-700" },
  { icon: Hotel, label: "Sleep", desc: "Hotels, apartments & villas", to: "/stays", color: "bg-amber-100 text-amber-700" },
  { icon: FileCheck, label: "Visa Pro", desc: "Fast-track visa processing", to: "/visas", color: "bg-emerald-100 text-emerald-700" },
  { icon: Shield, label: "Cover", desc: "Travel & medical insurance", to: "/insurance", color: "bg-rose-100 text-rose-700" },
  { icon: Map, label: "Explore", desc: "Curated tours & experiences", to: "/tours", color: "bg-violet-100 text-violet-700" },
  { icon: Car, label: "Ride", desc: "Airport transfers & cars", to: "/pickups", color: "bg-orange-100 text-orange-700" },
  { icon: GraduationCap, label: "Advise", desc: "Study, work & immigration", to: "/consultations", color: "bg-indigo-100 text-indigo-700" },
];

export function ServicesGrid() {
  return (
    <section className="bg-secondary/40 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8">
          <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">
            Everything you need, in one app
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">From flights to free consultations — iSwitch handles it all</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                to={s.to}
                className="group flex flex-col items-start gap-2.5 rounded-2xl border border-border bg-card p-4 shadow-card transition hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.color}`}>
                  <Icon className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{s.label}</div>
                  <div className="text-[11px] leading-snug text-muted-foreground">{s.desc}</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
