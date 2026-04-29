import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { searchVisas } from "@/server/travsify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileSearch,
  ShieldCheck,
  Fingerprint,
  Users,
  Globe2,
  Clock,
  FileCheck2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { SearchingOverlay } from "@/components/SearchingOverlay";
import { useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  nationality: z.coerce.string().optional().default("Nigeria"),
  destination: z.coerce.string().optional().default("United Kingdom"),
  visaType: z.coerce.string().optional().default("Tourist"),
});

function toPurpose(v: string): "tourism" | "business" | "transit" {
  const k = v.trim().toLowerCase();
  if (k === "business") return "business";
  if (k === "transit") return "transit";
  return "tourism";
}

const COUNTRY_CC: Record<string, string> = {
  nigeria: "NG", "united kingdom": "GB", uk: "GB", "united states": "US", usa: "US",
  canada: "CA", germany: "DE", france: "FR", "united arab emirates": "AE", uae: "AE",
  "schengen area": "EU", australia: "AU", india: "IN", china: "CN", "south africa": "ZA",
  ghana: "GH", kenya: "KE", japan: "JP", brazil: "BR",
};

function toCC(s: string) {
  const k = s.trim().toLowerCase();
  if (COUNTRY_CC[k]) return COUNTRY_CC[k];
  if (/^[a-z]{2}$/i.test(s.trim())) return s.trim().toUpperCase();
  return s.trim().slice(0, 2).toUpperCase();
}

/* ------------------------ Visa kind classification ------------------------ */

type VisaKind = "evisa" | "voa" | "biometrics" | "interview" | "embassy" | "visa-free";

function classifyVisa(v: any): VisaKind[] {
  const kinds = new Set<VisaKind>();
  const blob = JSON.stringify(v ?? {}).toLowerCase();
  const reqs: string[] = []
    .concat(v?.requirements ?? [])
    .concat(v?.required_documents ?? [])
    .map((x: any) => String(x).toLowerCase());
  const reqText = reqs.join(" ") + " " + blob;

  if (v?.evisa === true || /\be[-\s]?visa\b|electronic visa|eta\b|esta\b/.test(reqText)) kinds.add("evisa");
  if (/visa[-\s]?on[-\s]?arrival|on arrival|voa\b/.test(reqText)) kinds.add("voa");
  if (v?.biometrics === true || /biometric|fingerprint|vfs|vac\b|appointment/.test(reqText)) kinds.add("biometrics");
  if (v?.interview === true || /interview|consular interview|in[-\s]?person/.test(reqText)) kinds.add("interview");
  if (/embassy|consulate|in[-\s]?person submission/.test(reqText) && !kinds.has("evisa")) kinds.add("embassy");
  if (v?.visa_free === true || /visa[-\s]?free|no visa required/.test(reqText)) kinds.add("visa-free");

  // Fallback: if nothing matched, treat unknown as embassy/standard
  if (kinds.size === 0) kinds.add("embassy");
  return Array.from(kinds);
}

const KIND_META: Record<VisaKind, { label: string; icon: any; cls: string }> = {
  evisa: { label: "e-Visa", icon: Globe2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  voa: { label: "Visa on arrival", icon: Globe2, cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  biometrics: { label: "Biometrics required", icon: Fingerprint, cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  interview: { label: "Interview required", icon: Users, cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  embassy: { label: "Embassy submission", icon: FileCheck2, cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  "visa-free": { label: "Visa-free", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

function KindBadge({ kind }: { kind: VisaKind }) {
  const { label, icon: Icon, cls } = KIND_META[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/* --------------------------------- Route --------------------------------- */

export const Route = createFileRoute("/visas")({
  head: () => ({
    meta: [
      { title: "Visa Requirements & e-Visas | iSwitch" },
      { name: "description", content: "Check visa requirements for any passport. Apply for e-Visas, biometrics or embassy visas to 100+ countries — clear costs, processing time and documents." },
      { property: "og:title", content: "Visa Requirements & e-Visas | iSwitch" },
      { property: "og:description", content: "Sherpa-style visa eligibility, document checklists and fulfilment for 100+ countries." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    try {
      const res = await searchVisas({
        data: {
          nationality: toCC(deps.nationality),
          destination: toCC(deps.destination),
          purpose: toPurpose(deps.visaType),
        },
      });
      return { visas: res?.data?.visas ?? [], query: deps, error: (res?.error as string | null) ?? null };
    } catch (e: any) {
      return { visas: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: VisasPage,
});

function VisasPage() {
  const { visas, query, error } = Route.useLoaderData() as any;
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  function goToBooking(v: any) {
    const id = v.id ?? v.visa_id;
    try { sessionStorage.setItem(`visa:${id}`, JSON.stringify(v)); } catch {}
    navigate({
      to: "/visas/book",
      search: { visa_id: String(id), nationality: query.nationality, destination: query.destination } as never,
    });
  }
  const searchedRoute = `${query.nationality} → ${query.destination}`;

  // Annotate each result with kinds, then sort: e-Visa & visa-free first.
  const annotated = (visas as any[]).map((v) => ({ ...v, _kinds: classifyVisa(v) }));
  const rank = (k: VisaKind) =>
    k === "visa-free" ? 0 : k === "evisa" ? 1 : k === "voa" ? 2 : k === "biometrics" ? 3 : k === "interview" ? 4 : 5;
  annotated.sort((a, b) => Math.min(...a._kinds.map(rank)) - Math.min(...b._kinds.map(rank)));

  const showNoResults = !dismissed && (!!error || annotated.length === 0);

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Header />
      <SearchingOverlay match="/visas" label="Checking visa requirements…" sublabel={searchedRoute} category="visas" />

      <VisaNoResultsDialog
        open={showNoResults}
        title={error ? "Visa search is taking a moment" : "No visa options found"}
        message={
          error ??
          `We couldn't find a visa for ${searchedRoute}. Try a different destination or purpose, or contact our visa concierge.`
        }
        onClose={() => {
          setDismissed(true);
          navigate({ to: "/visas", search: {} as never });
        }}
        onRetry={error ? () => navigate({ to: "/visas", search: query as never }) : undefined}
      />

      <UnifiedSearchBar
        active="visas"
        title="Visa requirements, made simple."
        subtitle="Tell us your passport and where you're going — we'll show every visa option with costs, processing time and documents."
        initial={query}
      />

      {/* Result summary banner — Sherpa-style */}
      <section className="mx-auto max-w-6xl px-4 pt-8 md:px-6">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground md:text-lg">
                <span>{query.nationality}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span>{query.destination}</span>
                <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {query.visaType}
                </span>
              </div>
              {!error && annotated.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from(new Set(annotated.flatMap((v) => v._kinds))).map((k) => (
                    <KindBadge key={k} kind={k as VisaKind} />
                  ))}
                </div>
              )}
              {!error && annotated.length === 0 && (
                <p className="mt-1 text-sm text-muted-foreground">No options found for this route yet.</p>
              )}
            </div>
            {!error && annotated.length > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{annotated.length}</div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Visa option{annotated.length === 1 ? "" : "s"}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
        {error ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
            <FileSearch className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold text-foreground">Search is not available.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{error}</p>
          </div>
        ) : annotated.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
            <FileSearch className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold text-foreground">No visa options found</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              We couldn't find a visa for {searchedRoute}. Try a different destination or purpose, or contact our visa concierge.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {annotated.map((v: any) => {
              const kinds: VisaKind[] = v._kinds;
              const primary = kinds[0];
              return (
                <article
                  key={v.id}
                  className="group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:shadow-elevated"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-foreground">{v.name ?? "Visa"}</h3>
                      {v.duration && (
                        <p className="mt-0.5 text-xs text-muted-foreground">Stay up to {v.duration}</p>
                      )}
                    </div>
                    <KindBadge kind={primary} />
                  </div>

                  {kinds.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {kinds.slice(1).map((k) => (
                        <KindBadge key={k} kind={k} />
                      ))}
                    </div>
                  )}

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-secondary/60 p-2.5">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Processing
                      </dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        {v.processing_time ?? v.processing ?? "Varies"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-secondary/60 p-2.5">
                      <dt className="flex items-center gap-1 text-muted-foreground">
                        <FileCheck2 className="h-3.5 w-3.5" /> Validity
                      </dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        {v.validity ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total fee</div>
                      <div className="text-2xl font-extrabold text-primary">
                        {v.currency ?? "USD"} {v.price ?? "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(v)}
                      className="rounded-lg bg-gradient-accent px-4 py-2.5 text-xs font-bold text-accent-foreground shadow-sm transition hover:opacity-90"
                    >
                      Apply now
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* How it works — Sherpa-style trust strip */}
      <section className="mx-auto max-w-6xl px-4 pb-12 md:px-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Official requirements", body: "Sourced live from government and consular feeds — never outdated." },
            { icon: FileCheck2, title: "Document checklist", body: "We tell you exactly what to upload, with sample formats." },
            { icon: Users, title: "Concierge support", body: "Real humans review every application before submission." },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <b.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-semibold text-foreground">{b.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* ----------------------------- no results dialog ----------------------------- */
function VisaNoResultsDialog({
  open,
  title,
  message,
  onClose,
  onRetry,
}: {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onRetry?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-lg bg-gradient-primary px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-primary-foreground shadow-glow transition hover:opacity-95"
            >
              Try again
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-foreground transition hover:bg-secondary"
          >
            Back to visas
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
