import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Percent, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/markups")({
  head: () => ({ meta: [{ title: "Markups & Settings — Admin" }] }),
  component: AdminMarkups,
});

type Markup = { vertical: string; customer_pct: number; b2b_pct: number };
type Setting = { key: string; value: any; description: string | null };

function AdminMarkups() {
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [m, s] = await Promise.all([
      supabase.from("vertical_markups").select("*").order("vertical"),
      supabase.from("system_settings").select("key, value, description").order("key"),
    ]);
    setMarkups(((m.data ?? []) as any[]).map((r) => ({ ...r, customer_pct: Number(r.customer_pct), b2b_pct: Number(r.b2b_pct) })));
    setSettings((s.data ?? []) as Setting[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function saveMarkup(m: Markup) {
    setSavingKey(`m:${m.vertical}`);
    const { error } = await supabase.from("vertical_markups").update({ customer_pct: m.customer_pct, b2b_pct: m.b2b_pct, updated_at: new Date().toISOString() }).eq("vertical", m.vertical as any);
    setSavingKey(null);
    if (error) toast.error(error.message); else toast.success(`${m.vertical} updated`);
  }
  async function saveSetting(s: Setting) {
    setSavingKey(`s:${s.key}`);
    const { error } = await supabase.from("system_settings").update({ value: s.value, updated_at: new Date().toISOString() }).eq("key", s.key);
    setSavingKey(null);
    if (error) toast.error(error.message); else toast.success(`${s.key} saved`);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div>
      <AdminPageHeader icon={Percent} title="Markups & System Settings" description="Set per-vertical customer and B2B markups, and adjust global system constants." />

      <div className="mb-6">
        <h2 className="font-display text-base font-extrabold">Vertical markups</h2>
        <p className="mb-3 text-xs text-muted-foreground">Percentages are applied on top of supplier net price.</p>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {markups.map((m, i) => (
            <div key={m.vertical} className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-gradient-primary px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary-foreground">{m.vertical}</span>
                <button onClick={() => saveMarkup(m)} disabled={savingKey === `m:${m.vertical}`} className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-50">
                  {savingKey === `m:${m.vertical}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                </button>
              </div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Customer %</label>
              <input type="number" step="0.01" value={m.customer_pct} onChange={(e) => setMarkups((mk) => mk.map((x, j) => j === i ? { ...x, customer_pct: +e.target.value } : x))} className="w-full rounded-md border-2 border-border bg-background px-3 py-1.5 text-sm font-bold focus:border-primary focus:outline-none" />
              <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">B2B / Agent %</label>
              <input type="number" step="0.01" value={m.b2b_pct} onChange={(e) => setMarkups((mk) => mk.map((x, j) => j === i ? { ...x, b2b_pct: +e.target.value } : x))} className="w-full rounded-md border-2 border-border bg-background px-3 py-1.5 text-sm font-bold focus:border-primary focus:outline-none" />
            </div>
          ))}
          {markups.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No markups configured.</div>}
        </div>
      </div>

      <div>
        <h2 className="font-display text-base font-extrabold">System settings</h2>
        <p className="mb-3 text-xs text-muted-foreground">Global flags and constants used across the platform.</p>
        <div className="space-y-3">
          {settings.map((s, i) => {
            const isNum = typeof s.value === "number";
            const isBool = typeof s.value === "boolean";
            return (
              <div key={s.key} className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-bold capitalize">{s.key.replace(/_/g, " ")}</div>
                    {s.description && <div className="text-[11px] text-muted-foreground">{s.description}</div>}
                  </div>
                  {isBool ? (
                    <button onClick={() => setSettings((st) => st.map((x, j) => j === i ? { ...x, value: !x.value } : x))} className={`rounded-full px-3 py-1 text-[11px] font-bold ${s.value ? "bg-success text-white" : "bg-muted"}`}>
                      {s.value ? "Enabled" : "Disabled"}
                    </button>
                  ) : isNum ? (
                    <input type="number" step="0.01" value={s.value as number} onChange={(e) => setSettings((st) => st.map((x, j) => j === i ? { ...x, value: +e.target.value } : x))} className="w-32 rounded-md border-2 border-border bg-background px-3 py-1.5 text-sm font-bold focus:border-primary focus:outline-none" />
                  ) : (
                    <input value={JSON.stringify(s.value)} onChange={(e) => { try { setSettings((st) => st.map((x, j) => j === i ? { ...x, value: JSON.parse(e.target.value) } : x)); } catch {} }} className="w-64 rounded-md border-2 border-border bg-background px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none" />
                  )}
                  <button onClick={() => saveSetting(s)} disabled={savingKey === `s:${s.key}`} className="inline-flex items-center gap-1 rounded-md bg-gradient-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-50">
                    {savingKey === `s:${s.key}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
                  </button>
                </div>
              </div>
            );
          })}
          {settings.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No settings yet.</div>}
        </div>
      </div>
    </div>
  );
}
