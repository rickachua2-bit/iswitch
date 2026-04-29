import { useEffect, useState } from "react";
import { Loader2, Activity, Database, ListChecks, Receipt, RefreshCw, Plug, Power, ExternalLink, Percent, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { triggerCrawl, seedAllInventory } from "@/server/crawler.functions";
import { listMarkups, setMarkup } from "@/server/markups.functions";
import { invalidateMarkupCache } from "@/lib/use-markup";

type Provider = {
  id: string; slug: string; name: string; vertical: string; kind: "api" | "crawl";
  enabled: boolean; total_calls: number; total_errors: number;
  last_ok_at: string | null; last_error_at: string | null; last_error: string | null;
};
type CrawlJob = { id: string; provider_id: string; status: string; started_at: string | null; finished_at: string | null; items_seen: number; items_upserted: number; error: string | null; created_at: string };
type InventoryRow = { id: string; title: string; vertical: string; price: number | null; currency: string; destination: string | null; provider_id: string; is_active: boolean; updated_at: string };
type BookingRow = { id: string; vertical: string; status: string; amount: number; currency: string; customer_email: string; customer_name: string; created_at: string; provider_id: string | null };

export function OpsDashboard() {
  const [sub, setSub] = useState<"providers" | "inventory" | "crawls" | "bookings" | "health" | "markups">("providers");
  const seedAll = useServerFn(seedAllInventory);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

  async function runSeedAll() {
    setSeeding(true); setSeedMsg(null);
    try {
      const r: any = await seedAll({});
      const lines = (r.results ?? []).map((x: any) => `${x.vertical}: ${x.items_upserted}`).join(" · ");
      setSeedMsg(`Seeded ${r.total} items (${lines})`);
    } catch (e: any) {
      setSeedMsg(`Failed: ${e?.message ?? "unknown error"}`);
    }
    setSeeding(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SubTab active={sub === "providers"} onClick={() => setSub("providers")} icon={Plug}>Providers</SubTab>
        <SubTab active={sub === "inventory"} onClick={() => setSub("inventory")} icon={Database}>Inventory</SubTab>
        <SubTab active={sub === "crawls"} onClick={() => setSub("crawls")} icon={RefreshCw}>Crawl jobs</SubTab>
        <SubTab active={sub === "bookings"} onClick={() => setSub("bookings")} icon={Receipt}>Bookings</SubTab>
        <SubTab active={sub === "health"} onClick={() => setSub("health")} icon={Activity}>Health</SubTab>
        <SubTab active={sub === "markups"} onClick={() => setSub("markups")} icon={Percent}>Markups</SubTab>
        <div className="ml-auto flex items-center gap-2">
          {seedMsg && <span className="text-xs text-muted-foreground">{seedMsg}</span>}
          <button
            disabled={seeding}
            onClick={runSeedAll}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
            title="Crawl up to 50 items per vertical (visas, insurance, tours, pickups)"
          >
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Seed all inventory
          </button>
        </div>
      </div>
      {sub === "providers" && <ProvidersPanel />}
      {sub === "inventory" && <InventoryPanel />}
      {sub === "crawls" && <CrawlsPanel />}
      {sub === "bookings" && <BookingsPanel />}
      {sub === "health" && <HealthPanel />}
      {sub === "markups" && <MarkupsPanel />}
    </div>
  );
}

function SubTab({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: any; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-bold transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

function ProvidersPanel() {
  const [rows, setRows] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const trigger = useServerFn(triggerCrawl);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("providers").select("*").order("vertical").order("name");
    setRows((data ?? []) as Provider[]); setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function toggle(p: Provider) {
    await supabase.from("providers").update({ enabled: !p.enabled }).eq("id", p.id);
    void load();
  }
  async function crawl(p: Provider) {
    if (p.kind !== "crawl") return;
    setBusy(p.id);
    try { await trigger({ data: { slug: p.slug } }); } catch (e) { console.error(e); }
    setBusy(null); void load();
  }

  if (loading) return <Loading />;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-4 py-2 text-left">Provider</th><th className="text-left">Vertical</th><th className="text-left">Type</th><th className="text-right">Calls</th><th className="text-right">Errors</th><th className="text-left">Last OK</th><th className="text-left">Last Error</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const errRate = p.total_calls ? Math.round((p.total_errors / p.total_calls) * 100) : 0;
            return (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-bold">{p.name}<div className="text-[10px] font-normal uppercase text-muted-foreground">{p.slug}</div></td>
                <td>{p.vertical}</td>
                <td><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${p.kind === "api" ? "bg-primary/10 text-primary" : "bg-accent/20 text-accent-foreground"}`}>{p.kind}</span></td>
                <td className="text-right tabular-nums">{p.total_calls}</td>
                <td className={`text-right tabular-nums ${errRate > 10 ? "text-destructive" : ""}`}>{p.total_errors}{errRate > 0 && <span className="ml-1 text-[10px]">({errRate}%)</span>}</td>
                <td className="text-xs text-muted-foreground">{p.last_ok_at ? new Date(p.last_ok_at).toLocaleString() : "—"}</td>
                <td className="max-w-[200px] truncate text-xs text-destructive" title={p.last_error ?? ""}>{p.last_error ?? "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    {p.kind === "crawl" && (
                      <button disabled={busy === p.id} onClick={() => crawl(p)} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary disabled:opacity-50">
                        {busy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Crawl
                      </button>
                    )}
                    <button onClick={() => toggle(p)} className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold ${p.enabled ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      <Power className="h-3 w-3" /> {p.enabled ? "On" : "Off"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InventoryPanel() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vertical, setVertical] = useState<string>("all");
  async function load() {
    setLoading(true);
    let q = supabase.from("inventory_items").select("id, title, vertical, price, currency, destination, provider_id, is_active, updated_at").order("updated_at", { ascending: false }).limit(200);
    if (vertical !== "all") q = q.eq("vertical", vertical as any);
    const { data } = await q;
    setRows((data ?? []) as InventoryRow[]); setLoading(false);
  }
  useEffect(() => { void load(); }, [vertical]);
  async function toggleActive(r: InventoryRow) {
    await supabase.from("inventory_items").update({ is_active: !r.is_active }).eq("id", r.id);
    void load();
  }
  if (loading) return <Loading />;
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {["all", "visas", "insurance", "tours", "pickups"].map((v) => (
          <button key={v} onClick={() => setVertical(v)} className={`rounded-md px-2.5 py-1 text-xs font-bold ${vertical === v ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{v}</button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No inventory yet — run a crawl from the Providers tab.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-4 py-2 text-left">Title</th><th className="text-left">Vertical</th><th className="text-left">Destination</th><th className="text-right">Price</th><th className="text-left">Updated</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="max-w-md truncate px-4 py-2 font-medium" title={r.title}>{r.title}</td>
                  <td className="text-xs">{r.vertical}</td>
                  <td className="text-xs">{r.destination ?? "—"}</td>
                  <td className="text-right tabular-nums">{r.price ? `${r.currency} ${r.price}` : "—"}</td>
                  <td className="text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => toggleActive(r)} className={`rounded px-2 py-0.5 text-[10px] font-bold ${r.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{r.is_active ? "Active" : "Hidden"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CrawlsPanel() {
  const [rows, setRows] = useState<(CrawlJob & { provider_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("crawl_jobs").select("*, providers(name, slug)").order("created_at", { ascending: false }).limit(50);
    setRows((data ?? []).map((r: any) => ({ ...r, provider_name: r.providers?.name })) as any); setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  if (loading) return <Loading />;
  if (rows.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No crawl runs yet.</div>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-4 py-2 text-left">Provider</th><th className="text-left">Status</th><th className="text-right">Seen</th><th className="text-right">Upserted</th><th className="text-left">Started</th><th className="text-left">Finished</th><th className="text-left">Error</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-2 font-bold">{r.provider_name ?? r.provider_id.slice(0, 8)}</td>
              <td><StatusBadge s={r.status} /></td>
              <td className="text-right tabular-nums">{r.items_seen}</td>
              <td className="text-right tabular-nums">{r.items_upserted}</td>
              <td className="text-xs text-muted-foreground">{r.started_at ? new Date(r.started_at).toLocaleString() : "—"}</td>
              <td className="text-xs text-muted-foreground">{r.finished_at ? new Date(r.finished_at).toLocaleString() : "—"}</td>
              <td className="max-w-[260px] truncate text-xs text-destructive" title={r.error ?? ""}>{r.error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BookingsPanel() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ vertical: string; count: number; revenue: number }[]>([]);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("bookings_unified").select("id, vertical, status, amount, currency, customer_email, customer_name, created_at, provider_id").order("created_at", { ascending: false }).limit(100);
    const list = (data ?? []) as BookingRow[];
    setRows(list);
    const byV = new Map<string, { count: number; revenue: number }>();
    for (const b of list) {
      const cur = byV.get(b.vertical) ?? { count: 0, revenue: 0 };
      cur.count++;
      if (b.status === "confirmed") cur.revenue += Number(b.amount);
      byV.set(b.vertical, cur);
    }
    setStats(Array.from(byV.entries()).map(([vertical, s]) => ({ vertical, ...s })));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  if (loading) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {stats.map((s) => (
          <div key={s.vertical} className="rounded-2xl border border-border bg-card p-3 shadow-card">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.vertical}</div>
            <div className="mt-1 font-display text-xl font-extrabold">{s.count}</div>
            <div className="text-xs text-muted-foreground">${s.revenue.toFixed(2)} confirmed</div>
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No bookings yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-2 text-left">When</th><th className="text-left">Vertical</th><th className="text-left">Customer</th><th className="text-right">Amount</th><th className="text-left">Status</th></tr></thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="text-xs font-bold">{b.vertical}</td>
                  <td className="text-xs"><div className="font-medium">{b.customer_name}</div><div className="text-muted-foreground">{b.customer_email}</div></td>
                  <td className="text-right tabular-nums font-bold">{b.currency} {Number(b.amount).toFixed(2)}</td>
                  <td><StatusBadge s={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HealthPanel() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("provider_health_events").select("*, providers(name)").order("created_at", { ascending: false }).limit(100);
    setRows(data ?? []); setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  if (loading) return <Loading />;
  if (rows.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No API calls logged yet.</div>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-2 text-left">When</th><th className="text-left">Provider</th><th className="text-left">OK</th><th className="text-right">Status</th><th className="text-right">Latency</th><th className="text-left">Message</th></tr></thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
              <td className="text-xs font-bold">{r.providers?.name ?? "—"}</td>
              <td>{r.ok ? <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">OK</span> : <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">FAIL</span>}</td>
              <td className="text-right tabular-nums">{r.status_code ?? "—"}</td>
              <td className="text-right tabular-nums">{r.latency_ms} ms</td>
              <td className="max-w-[400px] truncate text-xs text-muted-foreground" title={r.message ?? ""}>{r.message ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const c = s === "succeeded" || s === "confirmed" ? "bg-success/10 text-success"
    : s === "failed" ? "bg-destructive/10 text-destructive"
    : s === "running" ? "bg-primary/10 text-primary"
    : "bg-muted text-muted-foreground";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${c}`}>{s}</span>;
}
function Loading() { return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>; }
