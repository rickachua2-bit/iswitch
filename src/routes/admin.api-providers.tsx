import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Plug, Loader2, Save, AlertTriangle, CheckCircle2, Plus, Pencil, Trash2,
  ArrowLeft, Search, Power, ExternalLink, Package, Activity, X, Zap, RefreshCw,
  FlaskConical, Radio,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import {
  getApiProviderRouting as getApiProviderRoutingFn, updateApiProviderRouting as updateApiProviderRoutingFn,
  listProviders as listProvidersFn, createProvider as createProviderFn, updateProvider as updateProviderFn, deleteProvider as deleteProviderFn,
  listProviderInventory as listProviderInventoryFn, createInventoryItem as createInventoryItemFn, updateInventoryItem as updateInventoryItemFn, deleteInventoryItem as deleteInventoryItemFn,
  testProvider as testProviderFn,
  getProviderMode as getProviderModeFn, setGlobalProviderMode as setGlobalProviderModeFn, setProviderModeOverride as setProviderModeOverrideFn,
} from "@/server/api-providers.functions";
import { triggerCrawl as triggerCrawlFn } from "@/server/crawler.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/api-providers")({
  head: () => ({ meta: [{ title: "API Providers — Admin" }] }),
  component: ApiProvidersPage,
});

const VERTICALS = ["flights", "stays", "visas", "insurance", "tours", "pickups"] as const;
const KINDS = ["api", "crawl"] as const;
type Vertical = (typeof VERTICALS)[number];
type Kind = (typeof KINDS)[number];

type Provider = {
  id: string; slug: string; name: string; vertical: Vertical; kind: Kind;
  base_url: string | null; enabled: boolean; notes: string | null;
  mode: "test" | "live";
  total_calls: number; total_errors: number;
  last_ok_at: string | null; last_error_at: string | null; last_error: string | null;
  created_at: string; updated_at: string;
};

type InventoryItem = {
  id: string; title: string; subtitle: string | null; description: string | null;
  vertical: Vertical; origin: string | null; destination: string | null;
  price: number | null; currency: string; duration: string | null; validity: string | null;
  source_url: string | null; is_active: boolean;
  last_seen_at: string; created_at: string; updated_at: string;
};

function ApiProvidersPage() {
  const [view, setView] = useState<"list" | "detail">("list");
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);

  return view === "list"
    ? <ProvidersList onOpen={(id) => { setActiveProviderId(id); setView("detail"); }} />
    : <ProviderDetail providerId={activeProviderId!} onBack={() => setView("list")} />;
}

// ===================== LIST VIEW =====================
function ProvidersList({ onOpen }: { onOpen: (id: string) => void }) {
  const listProviders = useServerFn(listProvidersFn);
  const getApiProviderRouting = useServerFn(getApiProviderRoutingFn);
  const updateApiProviderRouting = useServerFn(updateApiProviderRoutingFn);
  const updateProvider = useServerFn(updateProviderFn);
  const deleteProvider = useServerFn(deleteProviderFn);
  const testProvider = useServerFn(testProviderFn);
  const triggerCrawl = useServerFn(triggerCrawlFn);
  const createProvider = useServerFn(createProviderFn);
  const getProviderMode = useServerFn(getProviderModeFn);
  const setGlobalProviderMode = useServerFn(setGlobalProviderModeFn);
  const setProviderModeOverride = useServerFn(setProviderModeOverrideFn);

  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [routing, setRouting] = useState<Record<Vertical, "default" | "travsify">>({
    flights: "default", stays: "default", visas: "default", insurance: "default", tours: "default", pickups: "default",
  });
  const [routingLabels, setRoutingLabels] = useState<Record<string, { default: string; travsify: string }>>({});
  const [travsifyConfigured, setTravsifyConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterVertical, setFilterVertical] = useState<"all" | Vertical>("all");
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);
  const [globalMode, setGlobalMode] = useState<"test" | "live">("live");
  const [keyStatus, setKeyStatus] = useState<Record<string, { live: boolean; test: boolean }>>({});

  async function refresh() {
    const [a, b, c] = await Promise.all([listProviders(), getApiProviderRouting(), getProviderMode()]);
    if (a.ok) setProviders(a.providers as Provider[]);
    if (b?.routing) {
      setRouting(b.routing as any);
      setRoutingLabels(b.providers ?? {});
      setTravsifyConfigured(!!b.travsifyConfigured);
    }
    if (c?.ok) {
      setGlobalMode(c.global);
      setKeyStatus(c.keys ?? {});
    }
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, []);

  async function saveRouting() {
    setSaving(true);
    const res = await updateApiProviderRouting({ data: routing });
    setSaving(false);
    res.ok ? toast.success("Routing saved") : toast.error(res.error);
  }

  async function onDelete(p: Provider) {
    if (!confirm(`Delete ${p.name}? This will also remove its inventory.`)) return;
    const res = await deleteProvider({ data: { id: p.id } });
    res.ok ? (toast.success("Provider deleted"), refresh()) : toast.error(res.error);
  }

  async function onToggle(p: Provider) {
    const res = await updateProvider({ data: { id: p.id, enabled: !p.enabled } });
    res.ok ? refresh() : toast.error(res.error);
  }

  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"test" | "crawl" | null>(null);

  async function onTest(p: Provider) {
    setBusyId(p.id); setBusyAction("test");
    try {
      const res: any = await testProvider({ data: { id: p.id } });
      if (!res.ok) toast.error(res.error);
      else if (res.healthy) toast.success(`✓ ${p.name} is up — ${res.latency}ms`);
      else toast.error(`✗ ${p.name} is down: ${res.message}`);
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Test failed"); }
    setBusyId(null); setBusyAction(null);
  }

  async function onCrawl(p: Provider) {
    if (p.kind !== "crawl") return toast.error("Only crawl providers can be crawled.");
    setBusyId(p.id); setBusyAction("crawl");
    toast.message(`Crawling ${p.name}…`, { description: "Fetching up to 50 items" });
    try {
      const res: any = await triggerCrawl({ data: { slug: p.slug } });
      if (res.status === "succeeded") toast.success(`Crawled ${res.items_upserted} items from ${p.name}`);
      else toast.error(`Crawl failed: ${res.error ?? "unknown error"}`);
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Crawl failed"); }
    setBusyId(null); setBusyAction(null);
  }

  async function onChangeGlobalMode(mode: "test" | "live") {
    setGlobalMode(mode);
    const r = await setGlobalProviderMode({ data: { mode } });
    r.ok ? toast.success(`Switched all providers to ${mode.toUpperCase()} mode`) : toast.error(r.error);
  }

  async function onChangeProviderMode(p: Provider, mode: "test" | "live") {
    const r = await setProviderModeOverride({ data: { id: p.id, mode } });
    if (!r.ok) return toast.error(r.error);
    toast.success(`${p.name} → ${mode.toUpperCase()}`);
    refresh();
  }

  const filtered = useMemo(() => providers.filter((p) => {
    if (filterVertical !== "all" && p.vertical !== filterVertical) return false;
    if (search && !`${p.name} ${p.slug} ${p.base_url ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [providers, search, filterVertical]);

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div>
      <AdminPageHeader
        icon={Plug}
        title="API Providers"
        description="Manage providers powering each booking vertical, browse their inventory, and route traffic between built-in APIs and Travsify."
        action={
          <button onClick={() => setEditing({ vertical: "flights", kind: "api", enabled: true })}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95">
            <Plus className="h-3.5 w-3.5" /> Add provider
          </button>
        }
      />

      {/* Global Test/Live mode (Drafts API) */}
      <div className={`mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${globalMode === "test" ? "border-amber-400/50 bg-gradient-to-r from-amber-50 to-amber-100/40 dark:from-amber-500/10 dark:to-amber-500/5" : "border-success/40 bg-gradient-to-r from-success/10 to-success/5"}`}>
        <div className="flex items-start gap-2">
          {globalMode === "test"
            ? <FlaskConical className="mt-0.5 h-5 w-5 text-amber-600" />
            : <Radio className="mt-0.5 h-5 w-5 text-success" />}
          <div>
            <div className="text-sm font-extrabold">
              {globalMode === "test" ? "Sandbox / Test mode" : "Live / Production mode"}
              <span className="ml-2 rounded-full bg-background/60 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">{globalMode}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {globalMode === "test"
                ? "All providers are using TEST keys (e.g. DUFFEL_TEST_API_KEY). Bookings won't charge real money. Edit and try drafts safely."
                : "All providers are using LIVE keys. Real bookings and payments are processed."}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
              {(["duffel","booking","travsify"] as const).map((slug) => {
                const k = keyStatus[slug];
                if (!k) return null;
                const has = globalMode === "test" ? k.test : k.live;
                return (
                  <span key={slug} className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wider ${has ? "bg-success/20 text-success" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"}`}>
                    {slug} {has ? "✓" : "missing"}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-background p-1">
          <button onClick={() => onChangeGlobalMode("test")}
            className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-extrabold transition ${globalMode === "test" ? "bg-amber-500 text-white shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <FlaskConical className="h-3.5 w-3.5" /> Test
          </button>
          <button onClick={() => onChangeGlobalMode("live")}
            className={`flex items-center gap-1 rounded px-3 py-1.5 text-xs font-extrabold transition ${globalMode === "live" ? "bg-success text-success-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}>
            <Radio className="h-3.5 w-3.5" /> Live
          </button>
        </div>
      </div>

      {/* Travsify status */}
      <div className={`mb-5 flex items-start gap-2 rounded-xl border p-3 text-sm ${travsifyConfigured ? "border-success/40 bg-success/5" : "border-amber-400/40 bg-amber-50 dark:bg-amber-500/10"}`}>
        {travsifyConfigured ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />}
        <div>
          <div className="font-bold">{travsifyConfigured ? "Travsify API key is configured" : "Travsify API key is not set"}</div>
          <p className="text-xs text-muted-foreground">
            {travsifyConfigured
              ? "You can route any vertical through Travsify. Save changes for them to take effect immediately."
              : "Add a TRAVSIFY_API_KEY secret before switching any vertical to Travsify."}
          </p>
        </div>
      </div>

      {/* Routing matrix */}
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold">Vertical routing</h3>
            <p className="text-xs text-muted-foreground">Choose which API powers each vertical at runtime.</p>
          </div>
          <button onClick={saveRouting} disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save routing
          </button>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {VERTICALS.map((v) => {
            const labels = routingLabels[v] ?? { default: "Default", travsify: "Travsify" };
            const active = routing[v];
            return (
              <div key={v} className="rounded-lg border border-border p-2.5">
                <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{v}</div>
                <div className="flex gap-1">
                  {(["default", "travsify"] as const).map((opt) => (
                    <button key={opt} onClick={() => setRouting((r) => ({ ...r, [v]: opt }))}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] font-bold transition ${active === opt ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"}`}>
                      {opt === "default" ? labels.default : labels.travsify}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search providers…"
            className="w-full rounded-md border border-border bg-background pl-8 pr-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value as any)}
          className="rounded-md border border-border bg-background px-2.5 py-2 text-sm font-medium focus:border-primary focus:outline-none">
          <option value="all">All verticals</option>
          {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Provider grid */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const errRate = p.total_calls > 0 ? Math.round((p.total_errors / p.total_calls) * 100) : 0;
          return (
            <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-card transition hover:shadow-lg hover:-translate-y-0.5">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-70" />
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-extrabold">{p.name}</h3>
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${p.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {p.enabled ? "Live" : "Off"}
                    </span>
                    <button
                      onClick={() => onChangeProviderMode(p, p.mode === "test" ? "live" : "test")}
                      title="Toggle test/live mode for this provider"
                      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider transition hover:scale-105 ${p.mode === "test" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-success/15 text-success"}`}
                    >
                      {p.mode === "test" ? <FlaskConical className="h-2.5 w-2.5" /> : <Radio className="h-2.5 w-2.5" />}
                      {p.mode}
                    </button>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="rounded bg-gradient-primary px-1.5 py-0.5 text-primary-foreground shadow-sm">{p.vertical}</span>
                    <span className={`rounded px-1.5 py-0.5 ${p.kind === "crawl" ? "bg-accent/30 text-accent-foreground" : "bg-secondary"}`}>{p.kind}</span>
                    <span className="truncate font-mono normal-case tracking-normal">{p.slug}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button onClick={() => onToggle(p)} title={p.enabled ? "Disable" : "Enable"}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Power className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setEditing(p)} title="Edit"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => onDelete(p)} title="Delete"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              {p.base_url && (
                <a href={p.base_url} target="_blank" rel="noreferrer"
                  className="mb-2 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-muted-foreground hover:text-primary">
                  <ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{p.base_url}</span>
                </a>
              )}

              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Calls" value={p.total_calls.toLocaleString()} />
                <Stat label="Errors" value={p.total_errors.toLocaleString()} tone={p.total_errors > 0 ? "warn" : undefined} />
                <Stat label="Err rate" value={`${errRate}%`} tone={errRate > 5 ? "warn" : undefined} />
              </div>

              <div className="grid gap-1.5" style={{ gridTemplateColumns: p.kind === "crawl" ? "1fr 1fr 1fr" : "1fr 1fr" }}>
                <button onClick={() => onTest(p)} disabled={busyId === p.id}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50">
                  {busyId === p.id && busyAction === "test" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Test
                </button>
                {p.kind === "crawl" && (
                  <button onClick={() => onCrawl(p)} disabled={busyId === p.id}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1.5 text-[11px] font-bold text-accent-foreground hover:bg-accent/20 disabled:opacity-50">
                    {busyId === p.id && busyAction === "crawl" ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Crawl 50
                  </button>
                )}
                <button onClick={() => onOpen(p.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-md bg-gradient-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground hover:opacity-95">
                  <Package className="h-3 w-3" /> Inventory
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No providers match your filters.
          </div>
        )}
      </div>

      {editing && (
        <ProviderFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={`rounded-md border border-border px-1.5 py-1 ${tone === "warn" ? "bg-amber-50 dark:bg-amber-500/10" : "bg-secondary/30"}`}>
      <div className="text-sm font-extrabold">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

// ===================== PROVIDER FORM MODAL =====================
function ProviderFormModal({ initial, onClose, onSaved }: {
  initial: Partial<Provider>; onClose: () => void; onSaved: () => void;
}) {
  const updateProvider = useServerFn(updateProviderFn);
  const createProvider = useServerFn(createProviderFn);
  const isEdit = !!initial.id;
  const [form, setForm] = useState({
    slug: initial.slug ?? "",
    name: initial.name ?? "",
    vertical: (initial.vertical ?? "flights") as Vertical,
    kind: (initial.kind ?? "api") as Kind,
    base_url: initial.base_url ?? "",
    enabled: initial.enabled ?? true,
    notes: initial.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = isEdit
      ? await updateProvider({ data: { id: initial.id!, ...form } })
      : await createProvider({ data: form });
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(isEdit ? "Provider updated" : "Provider added");
    onSaved();
  }

  return (
    <Modal title={isEdit ? "Edit provider" : "Add provider"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Slug" hint="lowercase, dashes only"><input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} className={`${inputCls} font-mono`} /></Field>
          <Field label="Vertical">
            <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value as Vertical })} className={inputCls}>
              {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Kind">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })} className={inputCls}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Base URL"><input type="url" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.example.com" className={inputCls} /></Field>
        <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className={inputCls} /></Field>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 rounded border-border" />
          Enabled
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ===================== DETAIL VIEW (provider's inventory) =====================
function ProviderDetail({ providerId, onBack }: { providerId: string; onBack: () => void }) {
  const listProviderInventory = useServerFn(listProviderInventoryFn);
  const deleteInventoryItem = useServerFn(deleteInventoryItemFn);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<InventoryItem> | null>(null);

  async function refresh() {
    const res = await listProviderInventory({ data: { providerId } });
    if (res.ok) {
      setProvider(res.provider as Provider);
      setItems(res.items as InventoryItem[]);
    } else toast.error(res.error);
    setLoading(false);
  }
  useEffect(() => { void refresh(); }, [providerId]);

  async function onDelete(item: InventoryItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    const res = await deleteInventoryItem({ data: { id: item.id } });
    res.ok ? (toast.success("Item deleted"), refresh()) : toast.error(res.error);
  }

  const filtered = useMemo(() => items.filter((i) =>
    !search || `${i.title} ${i.subtitle ?? ""} ${i.destination ?? ""} ${i.origin ?? ""}`.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  if (loading || !provider) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to providers
      </button>

      <div className="mb-5 rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/30 p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight">{provider.name}</h1>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${provider.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                {provider.enabled ? "Live" : "Disabled"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="rounded bg-gradient-primary px-2 py-0.5 text-primary-foreground">{provider.vertical}</span>
              <span className="rounded bg-secondary px-2 py-0.5">{provider.kind}</span>
              {provider.base_url && (
                <a href={provider.base_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 normal-case tracking-normal hover:text-primary">
                  <ExternalLink className="h-3 w-3" /> {provider.base_url}
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold">{provider.total_calls.toLocaleString()}</span>
              <span className="text-muted-foreground">calls · </span>
              <span className="font-bold text-amber-600">{provider.total_errors.toLocaleString()}</span>
              <span className="text-muted-foreground">errors</span>
            </div>
          </div>
        </div>
        {provider.notes && <p className="mt-3 text-xs text-muted-foreground">{provider.notes}</p>}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold">Inventory ({items.length})</h2>
          <p className="text-xs text-muted-foreground">APIs, listings or items provided by this source.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="rounded-md border border-border bg-background pl-8 pr-3 py-1.5 text-sm focus:border-primary focus:outline-none" />
          </div>
          <button onClick={() => setEditing({ vertical: provider.vertical, currency: "USD", is_active: true })}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-95">
            <Plus className="h-3.5 w-3.5" /> Add item
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Item</th>
                <th className="px-3 py-2 text-left">Route</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-left">Duration</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((it) => (
                <tr key={it.id} className="hover:bg-secondary/20">
                  <td className="px-3 py-2.5">
                    <div className="font-bold">{it.title}</div>
                    {it.subtitle && <div className="text-[11px] text-muted-foreground">{it.subtitle}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    {[it.origin, it.destination].filter(Boolean).join(" → ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[12px]">
                    {it.price != null ? `${it.currency} ${Number(it.price).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{it.duration ?? it.validity ?? "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${it.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {it.is_active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-0.5">
                      {it.source_url && (
                        <a href={it.source_url} target="_blank" rel="noreferrer" title="Open source"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => setEditing(it)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => onDelete(it)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  No inventory items yet. Click <strong>Add item</strong> to create one.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <InventoryFormModal
          providerId={providerId}
          defaultVertical={provider.vertical}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function InventoryFormModal({ providerId, defaultVertical, initial, onClose, onSaved }: {
  providerId: string; defaultVertical: Vertical;
  initial: Partial<InventoryItem>; onClose: () => void; onSaved: () => void;
}) {
  const updateInventoryItem = useServerFn(updateInventoryItemFn);
  const createInventoryItem = useServerFn(createInventoryItemFn);
  const isEdit = !!initial.id;
  const [form, setForm] = useState({
    title: initial.title ?? "",
    subtitle: initial.subtitle ?? "",
    description: initial.description ?? "",
    vertical: (initial.vertical ?? defaultVertical) as Vertical,
    origin: initial.origin ?? "",
    destination: initial.destination ?? "",
    price: initial.price ?? null as number | null,
    currency: initial.currency ?? "USD",
    duration: initial.duration ?? "",
    validity: initial.validity ?? "",
    source_url: initial.source_url ?? "",
    is_active: initial.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: any = { ...form, price: form.price === null || (form.price as any) === "" ? null : Number(form.price) };
    const res = isEdit
      ? await updateInventoryItem({ data: { id: initial.id!, ...payload } })
      : await createInventoryItem({ data: { provider_id: providerId, ...payload } });
    setSaving(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(isEdit ? "Item updated" : "Item added");
    onSaved();
  }

  return (
    <Modal title={isEdit ? "Edit inventory item" : "Add inventory item"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
        <Field label="Subtitle"><input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} /></Field>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vertical">
            <select value={form.vertical} onChange={(e) => setForm({ ...form, vertical: e.target.value as Vertical })} className={inputCls}>
              {VERTICALS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Currency"><input value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className={`${inputCls} font-mono`} /></Field>
          <Field label="Origin"><input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={inputCls} /></Field>
          <Field label="Destination"><input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={inputCls} /></Field>
          <Field label="Price">
            <input type="number" step="0.01" min="0" value={form.price ?? ""}
              onChange={(e) => setForm({ ...form, price: e.target.value === "" ? null : Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label="Duration"><input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 3 days" className={inputCls} /></Field>
          <Field label="Validity"><input value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} placeholder="e.g. 90 days" className={inputCls} /></Field>
          <Field label="Source URL"><input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} className={inputCls} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-border" />
          Active (visible to customers)
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ===================== UI primitives =====================
const inputCls = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>{hint && <span className="font-medium normal-case tracking-normal text-muted-foreground/70">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
