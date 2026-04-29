import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { History, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, Package, ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { listCrawlJobs as listCrawlJobsFn, getProviderInventoryCounts as getCountsFn } from "@/server/api-providers.functions";
import { seedAllInventory as seedAllFn } from "@/server/crawler.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/crawl-jobs")({
  head: () => ({ meta: [{ title: "Crawl History — Admin" }] }),
  component: CrawlJobsPage,
});

type Job = {
  id: string; provider_id: string; status: string;
  started_at: string | null; finished_at: string | null;
  items_seen: number; items_upserted: number; items_deactivated: number;
  error: string | null; created_at: string;
};
type Provider = { id: string; name: string; slug: string; vertical: string; kind: string };

function CrawlJobsPage() {
  const listJobs = useServerFn(listCrawlJobsFn);
  const getCounts = useServerFn(getCountsFn);
  const seedAll = useServerFn(seedAllFn);

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [seeding, setSeeding] = useState(false);

  async function load() {
    const [a, b] = await Promise.all([listJobs(), getCounts()]);
    if (a.ok) { setJobs(a.jobs as Job[]); setProviders(a.providers as Provider[]); }
    if (b.ok) setCounts(b.counts);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function onSeedAll() {
    setSeeding(true);
    toast.message("Crawling all verticals…", { description: "Fetching up to 50 items per source" });
    try {
      const r: any = await seedAll();
      if (r.ok) toast.success(`Seeded ${r.total} items across ${r.results?.length ?? 0} sources`);
      else toast.error(r.error ?? "Seeding failed");
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Seeding failed"); }
    setSeeding(false);
  }

  const provById = Object.fromEntries(providers.map((p) => [p.id, p]));

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const totalItems = Object.values(counts).reduce((s, n) => s + n, 0);
  const succeeded = jobs.filter((j) => j.status === "succeeded").length;
  const failed = jobs.filter((j) => j.status === "failed").length;

  return (
    <div>
      <AdminPageHeader
        icon={History}
        title="Crawl History"
        description="Every crawl run is logged here. See how many items were saved, when each provider last refreshed, and whether anything failed."
        action={
          <button onClick={onSeedAll} disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-50">
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Crawl all sources now
          </button>
        }
      />

      {/* Summary tiles */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Saved inventory items" value={totalItems.toLocaleString()} icon={Package} tone="primary" />
        <SummaryTile label="Total crawl runs" value={jobs.length.toLocaleString()} icon={History} />
        <SummaryTile label="Successful" value={succeeded.toLocaleString()} icon={CheckCircle2} tone="success" />
        <SummaryTile label="Failed" value={failed.toLocaleString()} icon={XCircle} tone={failed > 0 ? "danger" : undefined} />
      </div>

      {/* Per-provider inventory */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h3 className="mb-3 text-sm font-extrabold">Saved inventory by provider</h3>
        {providers.filter((p) => p.kind === "crawl").length === 0 && (
          <p className="text-xs text-muted-foreground">No crawl-type providers configured yet.</p>
        )}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {providers.filter((p) => p.kind === "crawl").map((p) => (
            <Link key={p.id} to="/admin/api-providers"
              className="group flex items-center justify-between rounded-lg border border-border bg-gradient-to-br from-card to-primary/5 p-3 transition hover:border-primary/40 hover:shadow-sm">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{p.name}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{p.vertical} · {p.slug}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-extrabold text-primary">
                  {(counts[p.id] ?? 0).toLocaleString()}
                </span>
                <ExternalLink className="h-3 w-3 text-muted-foreground transition group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Jobs table */}
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-extrabold">Recent crawl runs</h3>
          <p className="text-xs text-muted-foreground">Last 200 jobs. Click into API Providers to re-run a crawl.</p>
        </div>
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No crawls have run yet. Hit "Crawl all sources now" above, or open API Providers and crawl individual sources.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/30 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Seen</th>
                  <th className="px-3 py-2 text-right">Saved</th>
                  <th className="px-3 py-2 text-right">Removed</th>
                  <th className="px-3 py-2 text-right">Duration</th>
                  <th className="px-3 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const p = provById[j.provider_id];
                  const dur = j.started_at && j.finished_at
                    ? `${Math.round((new Date(j.finished_at).getTime() - new Date(j.started_at).getTime()) / 100) / 10}s`
                    : "—";
                  return (
                    <tr key={j.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/20">
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-bold">{p?.name ?? <span className="text-muted-foreground">Unknown</span>}</div>
                        {p && <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{p.vertical}</div>}
                      </td>
                      <td className="px-3 py-2"><StatusPill status={j.status} /></td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{j.items_seen}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs font-extrabold text-success">{j.items_upserted}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{j.items_deactivated}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{dur}</td>
                      <td className="max-w-[260px] px-3 py-2 text-xs text-muted-foreground">
                        {j.error ? <span className="text-destructive">{j.error}</span> : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon, tone }: {
  label: string; value: string; icon: any; tone?: "primary" | "success" | "danger";
}) {
  const styles = tone === "primary"
    ? "from-primary/10 to-primary/5 border-primary/30"
    : tone === "success"
    ? "from-success/10 to-success/5 border-success/30"
    : tone === "danger"
    ? "from-destructive/10 to-destructive/5 border-destructive/30"
    : "from-card to-secondary/30 border-border";
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-4 shadow-card ${styles}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    succeeded: { cls: "bg-success/15 text-success", icon: CheckCircle2, label: "Succeeded" },
    running:   { cls: "bg-primary/15 text-primary",  icon: Loader2,      label: "Running" },
    queued:    { cls: "bg-muted text-muted-foreground", icon: Clock,     label: "Queued" },
    failed:    { cls: "bg-destructive/15 text-destructive", icon: XCircle, label: "Failed" },
  };
  const s = map[status] ?? map.queued;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${s.cls}`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} /> {s.label}
    </span>
  );
}
