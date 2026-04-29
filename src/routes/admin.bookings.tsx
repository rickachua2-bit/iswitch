import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Receipt, Loader2, Search, Eye, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/bookings")({
  head: () => ({ meta: [{ title: "Bookings — Admin" }] }),
  component: AdminBookings,
});

type Booking = {
  id: string;
  user_id: string | null;
  vertical: string;
  status: string;
  amount: number;
  currency: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  external_reference: string | null;
  payload: any;
  created_at: string;
};

const STATUSES = ["pending", "confirmed", "failed", "cancelled", "refunded"] as const;

function AdminBookings() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verticalFilter, setVerticalFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Booking | null>(null);
  const { ask, node } = useConfirm();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("bookings_unified").select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as Booking[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const verticals = useMemo(() => Array.from(new Set(rows.map((r) => r.vertical))), [rows]);
  const filtered = useMemo(() => {
    return rows.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (verticalFilter !== "all" && b.vertical !== verticalFilter) return false;
      if (!q) return true;
      const hay = `${b.customer_email} ${b.customer_name} ${b.external_reference ?? ""} ${b.id}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [rows, q, statusFilter, verticalFilter]);

  async function changeStatus(b: Booking, status: string) {
    const { error } = await supabase.from("bookings_unified").update({ status }).eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Booking marked ${status}`);
    void load();
  }

  function confirmChange(b: Booking, status: string) {
    ask({
      title: `Set booking to ${status}?`,
      description: `Booking ${b.id.slice(0, 8)} for ${b.customer_email}.`,
      tone: status === "refunded" || status === "cancelled" ? "danger" : "primary",
      confirmLabel: `Mark ${status}`,
      onConfirm: async () => { await changeStatus(b, status); },
    });
  }

  return (
    <div>
      <AdminPageHeader icon={Receipt} title="Bookings" description="Search, inspect, and update the status of every booking across all verticals." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email, name, reference, ID…" className="w-full rounded-md border-2 border-border bg-card pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </div>
        <select value={verticalFilter} onChange={(e) => setVerticalFilter(e.target.value)} className="rounded-md border-2 border-border bg-card px-3 py-2 text-xs font-bold">
          <option value="all">All verticals</option>
          {verticals.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
          {(["all", ...STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`rounded px-2 py-1 text-[11px] font-bold capitalize ${statusFilter === s ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Vertical</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-2.5">
                    <div className="font-bold">{b.customer_name || "Guest"}</div>
                    <div className="text-[11px] text-muted-foreground">{b.customer_email}</div>
                  </td>
                  <td className="px-4 py-2.5"><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{b.vertical}</span></td>
                  <td className="px-4 py-2.5 font-extrabold">{b.currency} {Number(b.amount).toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <select value={b.status} onChange={(e) => confirmChange(b, e.target.value)} className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${b.status === "confirmed" ? "bg-success/10 text-success" : b.status === "failed" || b.status === "cancelled" ? "bg-destructive/10 text-destructive" : b.status === "refunded" ? "bg-accent/30 text-accent-foreground" : "bg-secondary text-foreground"}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => setSelected(b)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-primary hover:text-primary">
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">No bookings match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-extrabold">Booking {selected.id.slice(0, 8)}</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Field label="Customer" value={selected.customer_name} />
              <Field label="Email" value={selected.customer_email} />
              <Field label="Phone" value={selected.customer_phone ?? "—"} />
              <Field label="Vertical" value={selected.vertical} />
              <Field label="Amount" value={`${selected.currency} ${Number(selected.amount).toFixed(2)}`} />
              <Field label="Reference" value={selected.external_reference ?? "—"} />
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payload</div>
              <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-secondary p-3 text-[11px]">{JSON.stringify(selected.payload, null, 2)}</pre>
            </div>
            <button onClick={() => setSelected(null)} className="mt-4 rounded-md bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">Close</button>
          </div>
        </div>
      )}
      {node}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}
