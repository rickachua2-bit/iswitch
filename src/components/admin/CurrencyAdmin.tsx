import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Currency = {
  code: string;
  name: string;
  symbol: string;
  rate_to_usd: number;
  is_enabled: boolean;
  sort_order: number;
};

export function CurrencyAdmin() {
  const [rows, setRows] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Currency>({ code: "", name: "", symbol: "", rate_to_usd: 1, is_enabled: true, sort_order: 100 });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("currencies").select("*").order("sort_order");
    setRows((data ?? []).map((r) => ({ ...r, rate_to_usd: Number(r.rate_to_usd) })) as Currency[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function saveRow(c: Currency, patch: Partial<Currency>) {
    setSaving(c.code);
    setError(null);
    const { error: e } = await supabase.from("currencies").update(patch).eq("code", c.code);
    setSaving(null);
    if (e) { setError(e.message); return; }
    setRows((rs) => rs.map((r) => (r.code === c.code ? { ...r, ...patch } : r)));
  }

  async function deleteRow(code: string) {
    if (!confirm(`Delete currency ${code}?`)) return;
    setSaving(code);
    const { error: e } = await supabase.from("currencies").delete().eq("code", code);
    setSaving(null);
    if (e) { setError(e.message); return; }
    setRows((rs) => rs.filter((r) => r.code !== code));
  }

  async function addRow() {
    setError(null);
    if (!/^[A-Z]{3}$/.test(draft.code)) { setError("Code must be 3 uppercase letters (e.g. USD)."); return; }
    if (!draft.name.trim() || !draft.symbol.trim()) { setError("Name and symbol are required."); return; }
    if (draft.rate_to_usd <= 0) { setError("Rate must be > 0."); return; }
    setSaving(draft.code);
    const { error: e } = await supabase.from("currencies").insert(draft);
    setSaving(null);
    if (e) { setError(e.message); return; }
    setAdding(false);
    setDraft({ code: "", name: "", symbol: "", rate_to_usd: 1, is_enabled: true, sort_order: 100 });
    void load();
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}

      <div className="flex justify-between">
        <p className="text-xs text-muted-foreground">All prices on the site are stored in USD cents and converted to the user's selected currency using these rates.</p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            <Plus className="h-3 w-3" /> Add currency
          </button>
        )}
      </div>

      {adding && (
        <div className="rounded-2xl border border-primary/30 bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold">New currency</h3>
            <button onClick={() => setAdding(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
            <Input label="Code" value={draft.code} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} placeholder="USD" />
            <Input label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder="US Dollar" wide />
            <Input label="Symbol" value={draft.symbol} onChange={(v) => setDraft({ ...draft, symbol: v })} placeholder="$" />
            <Input label="Rate / USD" type="number" value={String(draft.rate_to_usd)} onChange={(v) => setDraft({ ...draft, rate_to_usd: Number(v) })} />
            <Input label="Sort" type="number" value={String(draft.sort_order)} onChange={(v) => setDraft({ ...draft, sort_order: Number(v) })} />
            <button onClick={addRow} disabled={saving === draft.code} className="self-end rounded-md bg-success px-3 py-2 text-xs font-bold text-white">
              {saving === draft.code ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Symbol</Th>
              <Th>Rate / USD</Th>
              <Th>Sort</Th>
              <Th>Enabled</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.code} className="border-t border-border">
                <Td><span className="font-mono font-bold">{c.code}</span></Td>
                <Td>
                  <CellInput defaultValue={c.name} onSave={(v) => saveRow(c, { name: v })} />
                </Td>
                <Td>
                  <CellInput defaultValue={c.symbol} onSave={(v) => saveRow(c, { symbol: v })} className="w-16" />
                </Td>
                <Td>
                  <CellInput type="number" step="0.000001" defaultValue={String(c.rate_to_usd)} onSave={(v) => saveRow(c, { rate_to_usd: Number(v) })} className="w-28" />
                </Td>
                <Td>
                  <CellInput type="number" defaultValue={String(c.sort_order)} onSave={(v) => saveRow(c, { sort_order: Number(v) })} className="w-16" />
                </Td>
                <Td>
                  <input
                    type="checkbox"
                    checked={c.is_enabled}
                    onChange={(e) => saveRow(c, { is_enabled: e.target.checked })}
                    className="h-4 w-4 cursor-pointer"
                  />
                </Td>
                <Td>
                  <div className="flex items-center gap-1">
                    {saving === c.code && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    <button onClick={() => deleteRow(c.code)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" aria-label={`Delete ${c.code}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No currencies. Add one to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-left font-bold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-middle">{children}</td>;
}

function Input({ label, value, onChange, placeholder, type = "text", wide }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "md:col-span-2" : ""}`}>
      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function CellInput({ defaultValue, onSave, type = "text", step, className }: { defaultValue: string; onSave: (v: string) => void; type?: string; step?: string; className?: string }) {
  const [v, setV] = useState(defaultValue);
  const [dirty, setDirty] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <input
        type={type}
        step={step}
        value={v}
        onChange={(e) => { setV(e.target.value); setDirty(e.target.value !== defaultValue); }}
        onBlur={() => { if (dirty) { onSave(v); setDirty(false); } }}
        className={`rounded-md border border-input bg-background px-2 py-1 text-xs focus:border-primary focus:outline-none ${className ?? "w-full"}`}
      />
      {dirty && <Save className="h-3 w-3 text-primary" />}
    </div>
  );
}
