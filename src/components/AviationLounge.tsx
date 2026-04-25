import { Plane, Lock, Plus } from "lucide-react";

const MEMBERS = [
  { name: "Sarah Jenkins", role: "Founder · TaxStart", tag: "LAYOVER DXB", tone: "primary", initials: "SJ" },
  { name: "Marcus Chen", role: "VP Ops · Arbor Trade", tag: "BOARDING LHR", tone: "success", initials: "MC" },
];

export function AviationLounge() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-card p-6 shadow-card md:p-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-accent/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
              <Plane className="h-3 w-3" /> The Aviation Lounge
            </div>
            <h3 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">Fly Next to Greatness.</h3>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Stop flying solo. Connect with verified founders, executives, and innovators sharing your flight or airport layover. Network before you even land.
            </p>
            <div className="mt-5 flex max-w-md gap-2 rounded-full border border-border/60 bg-background/40 p-1.5">
              <input
                placeholder="Flight # (e.g. EK 123)"
                className="flex-1 bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              <button className="rounded-full bg-accent px-5 py-2 text-xs font-bold uppercase tracking-wider text-accent-foreground transition hover:opacity-90">
                Unlock Lounge
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {MEMBERS.map((m) => (
              <div key={m.name} className="rounded-2xl border border-border/60 bg-background/40 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${m.tone === "primary" ? "bg-gradient-primary text-primary-foreground" : "bg-success/30 text-success"}`}>
                    {m.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold">{m.name}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{m.role}</div>
                  </div>
                </div>
                <div className={`mt-2.5 inline-block rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${m.tone === "primary" ? "bg-primary/20 text-primary" : "bg-success/20 text-success"}`}>
                  {m.tag}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-border bg-background/20 p-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><Lock className="h-4 w-4 text-muted-foreground" /></div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-muted-foreground">Hidden Member</div>
                <div className="text-[10px] text-muted-foreground/70">Partner @ VC Firm</div>
                <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">UNLOCK TO VIEW</div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-background/40 p-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"><Plus className="h-4 w-4 text-muted-foreground" /></div>
              <div className="min-w-0">
                <div className="text-xs font-bold">24 Others</div>
                <div className="text-[10px] text-muted-foreground">Active on Flight EK 123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
