import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchTabs } from "@/components/SearchTabs";
import { BookingDialog } from "@/components/BookingDialog";
import { searchVisas, bookVisa } from "@/server/travsify";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
  nationality: z.string().optional().default("Nigeria"),
  destination: z.string().optional().default("United Kingdom"),
  visaType: z.string().optional().default("Tourist"),
});

// Travsify accepts: tourism | business | transit
function toPurpose(v: string): "tourism" | "business" | "transit" {
  const k = v.trim().toLowerCase();
  if (k === "business") return "business";
  if (k === "transit") return "transit";
  // tourist, student, work, leisure, holiday → tourism
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

export const Route = createFileRoute("/visas")({
  head: () => ({
    meta: [
      { title: "Fast-track Visa Processing | iSwitch" },
      { name: "description", content: "Apply for tourist, business, student or work e-Visas to 100+ countries. Sherpa-powered eligibility, document review and fulfilment." },
      { property: "og:title", content: "Visa Services | iSwitch" },
      { property: "og:description", content: "Hassle-free visa applications for 100+ countries." },
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
      return { visas: res?.data?.visas ?? [], query: deps, error: null as string | null };
    } catch (e: any) {
      return { visas: [], query: deps, error: e?.message ?? "Search failed" };
    }
  },
  errorComponent: ({ error }) => <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>,
  component: VisasPage,
});

function VisasPage() {
  const { visas, query, error } = Route.useLoaderData() as any;
  const [selected, setSelected] = useState<any | null>(null);

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="bg-gradient-hero pb-12 pt-8 md:pb-16">
        <div className="mx-auto mb-6 max-w-4xl px-4 text-center">
          <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">Get your visa, stress-free.</h1>
          <p className="mt-2 text-sm text-primary-foreground/80">Sherpa-powered e-Visas · Document review · Fulfilment included</p>
        </div>
        <SearchTabs />
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">{error}</div>
        ) : visas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> No e-visas found for this combination.</div>
        ) : (
          <>
            <h2 className="mb-4 font-display text-xl font-bold">{visas.length} options · {query.nationality} → {query.destination}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visas.map((v: any) => (
                <div key={v.id} className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:shadow-elevated">
                  <div className="font-display text-lg font-bold">{v.name}</div>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="text-xl font-extrabold text-primary">{v.currency ?? "USD"} {v.price}</div>
                    <button onClick={() => setSelected(v)} className="rounded-lg bg-gradient-accent px-4 py-2 text-xs font-bold text-accent-foreground">Apply now</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {selected && (
        <BookingDialog
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
          title={`Apply: ${selected.name}`}
          summary={`${selected.currency ?? "USD"} ${selected.price}`}
          fields={[
            { name: "firstName", label: "First name", required: true },
            { name: "lastName", label: "Last name", required: true },
            { name: "email", label: "Email", type: "email", required: true },
            { name: "passport", label: "Passport number", required: true },
          ]}
          onSubmit={async (v) => {
            const res = await bookVisa({
              data: {
                visa_id: selected.id,
                applicant: { firstName: v.firstName, lastName: v.lastName, email: v.email, passport: v.passport },
              },
            });
            return { reference: res?.data?.reference, status: res?.data?.status };
          }}
        />
      )}
      <Footer />
    </div>
  );
}
