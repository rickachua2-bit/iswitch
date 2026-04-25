import { Star, Quote } from "lucide-react";

const REVIEWS = [
  {
    name: "Adaeze O.",
    role: "Founder · Lagos",
    text: "iSwitch handled my UK visa, flight and hotel in one go. Got my visa in 9 days. Unreal service.",
    rating: 5,
    initials: "AO",
    color: "bg-rose-100 text-rose-700",
  },
  {
    name: "Marcus T.",
    role: "Software Engineer · Toronto",
    text: "The immigration consultation was worth every cent — actually got me my Canadian PR. They didn't sell me anything I didn't need.",
    rating: 5,
    initials: "MT",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Priya S.",
    role: "Travel writer · Dubai",
    text: "I book everything through iSwitch now — flights, tours, airport pickups. The app just works.",
    rating: 5,
    initials: "PS",
    color: "bg-amber-100 text-amber-700",
  },
];

export function Testimonials() {
  return (
    <section className="bg-secondary/40 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
            Loved by travelers
          </span>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-foreground md:text-3xl">
            What our travelers say
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Real reviews from real customers — verified by Trustpilot</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name} className="relative rounded-2xl border border-border bg-card p-6 shadow-card transition hover:shadow-elevated">
              <Quote className="absolute right-4 top-4 h-8 w-8 text-accent/30" />
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-foreground">"{r.text}"</p>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${r.color}`}>
                  {r.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
