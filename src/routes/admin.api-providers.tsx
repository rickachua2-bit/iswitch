import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plug, Loader2, Save, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { getApiProviderRouting, updateApiProviderRouting } from "@/server/api-providers.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/api-providers")({
  head: () => ({ meta: [{ title: "API Providers — Admin" }] }),
  component: ApiProvidersPage,
});

const VERTICALS = ["flights", "stays", "visas", "insurance", "tours", "pickups"] as const;
type Vertical = (typeof VERTICALS)[number];

function ApiProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routing, setRouting] = useState<Record<Vertical, "default" | "travsify">>({
    flights: "default", stays: "default", visas: "default", insurance: "default", tours: "default", pickups: "default",
  });
  const [providers, setProviders] = useState<Record<string, { default: string; travsify: string }>>({});
  const [travsifyConfigured, setTravsifyConfigured] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await getApiProviderRouting();
        setRouting(res.routing as any);
        setProviders(res.providers);
        setTravsifyConfigured(res.travsifyConfigured);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    const res = await updateApiProviderRouting({ data: routing });
    setSaving(false);
    if (!res.ok) toast.error(res.error);
    else toast.success("Provider routing saved");
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div>
      <AdminPageHeader
        icon={Plug}
        title="API Providers"
        description="Choose which API powers each booking vertical. Switch any vertical to Travsify or keep the built-in providers."
        action={
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save changes
          </button>
        }
      />

      <div className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${travsifyConfigured ? "border-success/40 bg-success/5" : "border-amber-400/40 bg-amber-50 dark:bg-amber-500/10"}`}>
        {travsifyConfigured ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />}
        <div>
          <div className="font-bold">{travsifyConfigured ? "Travsify API key is configured" : "Travsify API key is not set"}</div>
          <p className="text-xs text-muted-foreground">
            {travsifyConfigured
              ? "You can route any vertical through Travsify. Save changes for them to take effect immediately."
              : "Add a TRAVSIFY_API_KEY secret in backend settings before switching any vertical to Travsify. Until then, Travsify selections will silently fall back to the default provider."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {VERTICALS.map((v) => {
          const labels = providers[v] ?? { default: "Default", travsify: "Travsify" };
          const active = routing[v];
          return (
            <div key={v} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground">{v}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active: {active === "travsify" ? labels.travsify : labels.default}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setRouting((r) => ({ ...r, [v]: "default" }))}
                  className={`rounded-lg border-2 p-3 text-left transition ${active === "default" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="text-xs font-extrabold">{labels.default}</div>
                  <div className="text-[11px] text-muted-foreground">Built-in provider</div>
                </button>
                <button
                  onClick={() => setRouting((r) => ({ ...r, [v]: "travsify" }))}
                  className={`rounded-lg border-2 p-3 text-left transition ${active === "travsify" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <div className="text-xs font-extrabold">Travsify</div>
                  <div className="text-[11px] text-muted-foreground">Route via Travsify API</div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
