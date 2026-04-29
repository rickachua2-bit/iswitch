import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Wallet, Loader2, Search, ArrowDown, ArrowUp, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin/wallets")({
  head: () => ({ meta: [{ title: "Wallets & Ledger — Admin" }] }),
  component: AdminWallets,
});

type Balance = { id: string; user_id: string; currency: string; balance: number; updated_at: string };
type Tx = { id: string; user_id: string; tx_type: string; amount: number; currency: string; description: string | null; reference: string | null; created_at: string };

function AdminWallets() {
  const [tab, setTab] = useState<"balances" | "transactions">("balances");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const [b, t] = await Promise.all([
      supabase.from("wallet_balances").select("*").order("updated_at", { ascending: false }),
      supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    setBalances((b.data ?? []) as Balance[]);
    setTxs((t.data ?? []) as Tx[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    balances.forEach((b) => { t[b.currency] = (t[b.currency] ?? 0) + Number(b.balance); });
    return t;
  }, [balances]);

  const filteredBalances = balances.filter((b) =>
    !q || b.user_id.toLowerCase().includes(q.toLowerCase()) || b.currency.toLowerCase().includes(q.toLowerCase())
  );
  const filteredTxs = txs.filter((t) =>
    !q || t.user_id.toLowerCase().includes(q.toLowerCase()) || (t.reference ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <AdminPageHeader
        icon={Wallet}
        title="Wallets & Ledger"
        description="View every user balance and the full transaction ledger. Wallets are credited only after confirmed payments."
        action={<button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold hover:border-primary"><RefreshCcw className="h-3.5 w-3.5" /> Refresh</button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Object.entries(totals).map(([cur, total]) => (
          <div key={cur} className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/10 p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Float in {cur}</div>
            <div className="mt-1 font-display text-xl font-extrabold">{cur} {total.toFixed(2)}</div>
          </div>
        ))}
        {Object.keys(totals).length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No funded wallets yet.</div>
        )}
      </div>

      <div className="mb-3 flex items-center gap-1 rounded-md border border-border bg-card p-1 w-fit">
        <button onClick={() => setTab("balances")} className={`rounded px-3 py-1.5 text-xs font-bold ${tab === "balances" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Balances ({balances.length})</button>
        <button onClick={() => setTab("transactions")} className={`rounded px-3 py-1.5 text-xs font-bold ${tab === "transactions" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Transactions ({txs.length})</button>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user id, currency, reference…" className="w-full rounded-md border-2 border-border bg-card pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none" />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : tab === "balances" ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Currency</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-left">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBalances.map((b) => (
                <tr key={b.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-2.5 font-mono text-[11px]">{b.user_id.slice(0, 12)}…</td>
                  <td className="px-4 py-2.5"><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">{b.currency}</span></td>
                  <td className="px-4 py-2.5 text-right font-extrabold">{Number(b.balance).toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{new Date(b.updated_at).toLocaleString()}</td>
                </tr>
              ))}
              {filteredBalances.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No balances.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">When</th>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTxs.map((t) => {
                const credit = Number(t.amount) > 0;
                return (
                  <tr key={t.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px]">{t.user_id.slice(0, 12)}…</td>
                    <td className="px-4 py-2.5"><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{t.tx_type}</span></td>
                    <td className={`px-4 py-2.5 text-right font-extrabold ${credit ? "text-success" : "text-destructive"}`}>
                      <span className="inline-flex items-center gap-1">{credit ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />} {t.currency} {Math.abs(Number(t.amount)).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{t.reference ?? t.description ?? "—"}</td>
                  </tr>
                );
              })}
              {filteredTxs.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No transactions.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
