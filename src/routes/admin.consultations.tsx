import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Loader2, Plus, Trash2, Power, RefreshCcw, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/consultations")({
  head: () => ({ meta: [{ title: "Consultations — Admin" }] }),
  component: AdminConsultations,
});

type Service = { id: string; name: string; category: string; description: string | null; is_active: boolean };
type Tier = { id: string; service_id: string; duration_minutes: number; price_cents: number; currency: string; is_active: boolean };
type Slot = { id: string; service_id: string; starts_at: string; ends_at: string; is_booked: boolean };
type Booking = { id: string; service_id: string; tier_id: string; slot_id: string; user_id: string | null; guest_name: string | null; guest_email: string | null; guest_phone: string | null; notes: string | null; status: string; amount_cents: number; currency: string; created_at: string };

function AdminConsultations() {
  const [tab, setTab] = useState<"services" | "tiers" | "slots" | "bookings">("services");

  return (
    <div>
      <AdminPageHeader icon={Calendar} title="Consultations" description="Curate consultation services, pricing tiers, time slots, and review every booking. Click ✎ on any row to edit." />
      <div className="mb-4 flex items-center gap-1 rounded-md border border-border bg-card p-1 w-fit">
        {(["services", "tiers", "slots", "bookings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded px-3 py-1.5 text-xs font-bold capitalize ${tab === t ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>{t}</button>
        ))}
      </div>
      {tab === "services" && <ServicesPanel />}
      {tab === "tiers" && <TiersPanel />}
      {tab === "slots" && <SlotsPanel />}
      {tab === "bookings" && <BookingsPanel />}
    </div>
  );
}

function ServicesPanel() {
  const [rows, setRows] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "", description: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Service>>({});
  const { ask, node } = useConfirm();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("consultation_services").select("*").order("category");
    setRows((data ?? []) as Service[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function add() {
    if (!draft.name || !draft.category) { toast.error("Name and category are required"); return; }
    const { error } = await supabase.from("consultation_services").insert({ ...draft, is_active: true });
    if (error) { toast.error(error.message); return; }
    setDraft({ name: "", category: "", description: "" });
    setAdding(false);
    void load();
  }
  async function toggle(s: Service) {
    await supabase.from("consultation_services").update({ is_active: !s.is_active }).eq("id", s.id);
    void load();
  }
  function startEdit(s: Service) {
    setEditId(s.id);
    setEditDraft({ name: s.name, category: s.category, description: s.description ?? "" });
  }
  async function saveEdit() {
    if (!editId) return;
    const { error } = await supabase.from("consultation_services").update(editDraft).eq("id", editId);
    if (error) toast.error(error.message); else { toast.success("Saved"); setEditId(null); void load(); }
  }
  function confirmDelete(s: Service) {
    ask({
      title: `Delete service "${s.name}"?`,
      description: "This cannot be undone. Existing bookings will keep their references but the service will disappear from listings.",
      tone: "danger", confirmLabel: "Delete service",
      onConfirm: async () => {
        const { error } = await supabase.from("consultation_services").delete().eq("id", s.id);
        if (error) toast.error(error.message); else { toast.success("Deleted"); void load(); }
      },
    });
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Add service</button>
      </div>
      {adding && (
        <div className="mb-3 rounded-2xl border-2 border-primary/30 bg-card p-4">
          <div className="grid gap-2 md:grid-cols-3">
            <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
            <input placeholder="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
            <input placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={add} className="rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Save</button>
            <button onClick={() => setAdding(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold">Cancel</button>
          </div>
        </div>
      )}
      <Table headers={["Name", "Category", "Status", "Actions"]}>
        {rows.map((s) => editId === s.id ? (
          <tr key={s.id} className="bg-primary/5">
            <td className="px-4 py-2.5">
              <input value={editDraft.name ?? ""} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} className="mb-1 w-full rounded-md border-2 border-primary/40 px-2 py-1 text-sm font-bold" />
              <input value={editDraft.description ?? ""} onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })} placeholder="Description" className="w-full rounded-md border border-border px-2 py-1 text-[11px]" />
            </td>
            <td className="px-4 py-2.5"><input value={editDraft.category ?? ""} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })} className="w-full rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-bold uppercase" /></td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{s.is_active ? "Active" : "Disabled"}</span></td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={saveEdit} className="mr-1 inline-flex items-center gap-1 rounded-md bg-gradient-primary px-2 py-1 text-[11px] font-bold text-primary-foreground"><Save className="h-3 w-3" /> Save</button>
              <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold"><X className="h-3 w-3" /> Cancel</button>
            </td>
          </tr>
        ) : (
          <tr key={s.id} className="hover:bg-secondary/40">
            <td className="px-4 py-2.5"><div className="font-bold">{s.name}</div><div className="text-[11px] text-muted-foreground">{s.description}</div></td>
            <td className="px-4 py-2.5"><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{s.category}</span></td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{s.is_active ? "Active" : "Disabled"}</span></td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={() => startEdit(s)} className="mr-1 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-primary"><Pencil className="h-3 w-3" /> Edit</button>
              <button onClick={() => toggle(s)} className="mr-1 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-primary"><Power className="h-3 w-3" /> {s.is_active ? "Disable" : "Enable"}</button>
              <button onClick={() => confirmDelete(s)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Delete</button>
            </td>
          </tr>
        ))}
      </Table>
      {node}
    </div>
  );
}

function TiersPanel() {
  const [rows, setRows] = useState<Tier[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ service_id: "", duration_minutes: 30, price_cents: 5000, currency: "USD" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ service_id?: string; duration_minutes?: number; price?: number; currency?: string; is_active?: boolean }>({});
  const { ask, node } = useConfirm();

  async function load() {
    setLoading(true);
    const [t, s] = await Promise.all([
      supabase.from("consultation_tiers").select("*").order("duration_minutes"),
      supabase.from("consultation_services").select("*"),
    ]);
    setRows((t.data ?? []) as Tier[]); setServices((s.data ?? []) as Service[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  function name(id: string) { return services.find((s) => s.id === id)?.name ?? id.slice(0, 8); }
  async function add() {
    if (!draft.service_id) return toast.error("Pick a service");
    const { error } = await supabase.from("consultation_tiers").insert({ ...draft, is_active: true });
    if (error) toast.error(error.message); else { setAdding(false); void load(); }
  }
  function startEdit(t: Tier) {
    setEditId(t.id);
    setEditDraft({ service_id: t.service_id, duration_minutes: t.duration_minutes, price: t.price_cents / 100, currency: t.currency, is_active: t.is_active });
  }
  async function saveEdit() {
    if (!editId) return;
    const update: any = {
      service_id: editDraft.service_id,
      duration_minutes: editDraft.duration_minutes,
      price_cents: Math.round((editDraft.price ?? 0) * 100),
      currency: (editDraft.currency ?? "USD").toUpperCase(),
      is_active: editDraft.is_active,
    };
    const { error } = await supabase.from("consultation_tiers").update(update).eq("id", editId);
    if (error) toast.error(error.message); else { toast.success("Saved"); setEditId(null); void load(); }
  }
  function confirmDelete(t: Tier) {
    ask({ title: "Delete tier?", description: `${t.duration_minutes} min · ${t.currency} ${(t.price_cents / 100).toFixed(2)}`, tone: "danger", confirmLabel: "Delete", onConfirm: async () => { await supabase.from("consultation_tiers").delete().eq("id", t.id); void load(); } });
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-md bg-gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Plus className="h-3.5 w-3.5" /> Add tier</button>
      </div>
      {adding && (
        <div className="mb-3 rounded-2xl border-2 border-primary/30 bg-card p-4">
          <div className="grid gap-2 md:grid-cols-4">
            <select value={draft.service_id} onChange={(e) => setDraft({ ...draft, service_id: e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm">
              <option value="">Select service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="number" placeholder="Minutes" value={draft.duration_minutes} onChange={(e) => setDraft({ ...draft, duration_minutes: +e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="Price (e.g. 50.00)" value={draft.price_cents / 100} onChange={(e) => setDraft({ ...draft, price_cents: Math.round(+e.target.value * 100) })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
            <input placeholder="Currency" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={add} className="rounded-md bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Save</button>
            <button onClick={() => setAdding(false)} className="rounded-md border border-border px-3 py-1.5 text-xs font-bold">Cancel</button>
          </div>
        </div>
      )}
      <Table headers={["Service", "Duration", "Price", "Status", "Actions"]}>
        {rows.map((t) => editId === t.id ? (
          <tr key={t.id} className="bg-primary/5">
            <td className="px-4 py-2.5">
              <select value={editDraft.service_id ?? ""} onChange={(e) => setEditDraft({ ...editDraft, service_id: e.target.value })} className="w-full rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-bold">
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </td>
            <td className="px-4 py-2.5"><input type="number" value={editDraft.duration_minutes ?? 0} onChange={(e) => setEditDraft({ ...editDraft, duration_minutes: +e.target.value })} className="w-20 rounded-md border-2 border-primary/40 px-2 py-1 text-xs" /> min</td>
            <td className="px-4 py-2.5">
              <input value={editDraft.currency ?? ""} onChange={(e) => setEditDraft({ ...editDraft, currency: e.target.value.toUpperCase() })} className="mr-1 w-14 rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-bold" />
              <input type="number" step="0.01" value={editDraft.price ?? 0} onChange={(e) => setEditDraft({ ...editDraft, price: +e.target.value })} className="w-24 rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-extrabold" />
            </td>
            <td className="px-4 py-2.5">
              <select value={editDraft.is_active ? "1" : "0"} onChange={(e) => setEditDraft({ ...editDraft, is_active: e.target.value === "1" })} className="rounded-md border-2 border-primary/40 px-2 py-1 text-[11px] font-bold">
                <option value="1">Active</option><option value="0">Disabled</option>
              </select>
            </td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={saveEdit} className="mr-1 inline-flex items-center gap-1 rounded-md bg-gradient-primary px-2 py-1 text-[11px] font-bold text-primary-foreground"><Save className="h-3 w-3" /> Save</button>
              <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold"><X className="h-3 w-3" /> Cancel</button>
            </td>
          </tr>
        ) : (
          <tr key={t.id} className="hover:bg-secondary/40">
            <td className="px-4 py-2.5 font-bold">{name(t.service_id)}</td>
            <td className="px-4 py-2.5">{t.duration_minutes} min</td>
            <td className="px-4 py-2.5 font-extrabold">{t.currency} {(t.price_cents / 100).toFixed(2)}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${t.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{t.is_active ? "Active" : "Disabled"}</span></td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={() => startEdit(t)} className="mr-1 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-primary"><Pencil className="h-3 w-3" /> Edit</button>
              <button onClick={() => confirmDelete(t)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Delete</button>
            </td>
          </tr>
        ))}
      </Table>
      {node}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function SlotsPanel() {
  const [rows, setRows] = useState<Slot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ service_id: "", starts_at: "", duration: 30 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ service_id?: string; starts_at?: string; ends_at?: string; is_booked?: boolean }>({});
  const { ask, node } = useConfirm();

  async function load() {
    setLoading(true);
    const [s, srv] = await Promise.all([
      supabase.from("consultation_slots").select("*").order("starts_at", { ascending: true }).limit(200),
      supabase.from("consultation_services").select("*"),
    ]);
    setRows((s.data ?? []) as Slot[]); setServices((srv.data ?? []) as Service[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function add() {
    if (!draft.service_id || !draft.starts_at) return toast.error("Service + start time required");
    const start = new Date(draft.starts_at);
    const end = new Date(start.getTime() + draft.duration * 60_000);
    const { error } = await supabase.from("consultation_slots").insert({ service_id: draft.service_id, starts_at: start.toISOString(), ends_at: end.toISOString(), is_booked: false });
    if (error) toast.error(error.message); else { toast.success("Slot added"); void load(); }
  }
  function startEdit(s: Slot) {
    setEditId(s.id);
    setEditDraft({ service_id: s.service_id, starts_at: toLocalInput(s.starts_at), ends_at: toLocalInput(s.ends_at), is_booked: s.is_booked });
  }
  async function saveEdit() {
    if (!editId) return;
    const update: any = {
      service_id: editDraft.service_id,
      starts_at: editDraft.starts_at ? new Date(editDraft.starts_at).toISOString() : undefined,
      ends_at: editDraft.ends_at ? new Date(editDraft.ends_at).toISOString() : undefined,
      is_booked: editDraft.is_booked,
    };
    const { error } = await supabase.from("consultation_slots").update(update).eq("id", editId);
    if (error) toast.error(error.message); else { toast.success("Saved"); setEditId(null); void load(); }
  }
  function confirmDelete(s: Slot) {
    ask({ title: "Delete slot?", tone: "danger", confirmLabel: "Delete", onConfirm: async () => { await supabase.from("consultation_slots").delete().eq("id", s.id); void load(); } });
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <div className="mb-3 rounded-2xl border-2 border-primary/30 bg-card p-4">
        <div className="grid gap-2 md:grid-cols-4">
          <select value={draft.service_id} onChange={(e) => setDraft({ ...draft, service_id: e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm">
            <option value="">Select service</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="datetime-local" value={draft.starts_at} onChange={(e) => setDraft({ ...draft, starts_at: e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
          <input type="number" placeholder="Minutes" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: +e.target.value })} className="rounded-md border-2 border-border px-3 py-2 text-sm" />
          <button onClick={add} className="rounded-md bg-gradient-primary text-xs font-bold text-primary-foreground"><Plus className="mr-1 inline h-3.5 w-3.5" /> Add slot</button>
        </div>
      </div>
      <Table headers={["Service", "Starts", "Ends", "Status", "Actions"]}>
        {rows.map((s) => editId === s.id ? (
          <tr key={s.id} className="bg-primary/5">
            <td className="px-4 py-2.5">
              <select value={editDraft.service_id ?? ""} onChange={(e) => setEditDraft({ ...editDraft, service_id: e.target.value })} className="w-full rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-bold">
                {services.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </td>
            <td className="px-4 py-2.5"><input type="datetime-local" value={editDraft.starts_at ?? ""} onChange={(e) => setEditDraft({ ...editDraft, starts_at: e.target.value })} className="rounded-md border-2 border-primary/40 px-2 py-1 text-[11px]" /></td>
            <td className="px-4 py-2.5"><input type="datetime-local" value={editDraft.ends_at ?? ""} onChange={(e) => setEditDraft({ ...editDraft, ends_at: e.target.value })} className="rounded-md border-2 border-primary/40 px-2 py-1 text-[11px]" /></td>
            <td className="px-4 py-2.5">
              <select value={editDraft.is_booked ? "1" : "0"} onChange={(e) => setEditDraft({ ...editDraft, is_booked: e.target.value === "1" })} className="rounded-md border-2 border-primary/40 px-2 py-1 text-[11px] font-bold">
                <option value="0">Available</option><option value="1">Booked</option>
              </select>
            </td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={saveEdit} className="mr-1 inline-flex items-center gap-1 rounded-md bg-gradient-primary px-2 py-1 text-[11px] font-bold text-primary-foreground"><Save className="h-3 w-3" /> Save</button>
              <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold"><X className="h-3 w-3" /> Cancel</button>
            </td>
          </tr>
        ) : (
          <tr key={s.id} className="hover:bg-secondary/40">
            <td className="px-4 py-2.5 font-bold">{services.find((x) => x.id === s.service_id)?.name ?? s.service_id.slice(0, 8)}</td>
            <td className="px-4 py-2.5 text-[11px]">{new Date(s.starts_at).toLocaleString()}</td>
            <td className="px-4 py-2.5 text-[11px]">{new Date(s.ends_at).toLocaleString()}</td>
            <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.is_booked ? "bg-accent/30 text-accent-foreground" : "bg-success/10 text-success"}`}>{s.is_booked ? "Booked" : "Available"}</span></td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={() => startEdit(s)} className="mr-1 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-primary"><Pencil className="h-3 w-3" /> Edit</button>
              <button onClick={() => confirmDelete(s)} className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /> Delete</button>
            </td>
          </tr>
        ))}
      </Table>
      {node}
    </div>
  );
}

function BookingsPanel() {
  const [rows, setRows] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ guest_name?: string; guest_email?: string; guest_phone?: string; notes?: string; price?: number; currency?: string; status?: string }>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("consultation_bookings").select("*").order("created_at", { ascending: false }).limit(300);
    setRows((data ?? []) as Booking[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function setStatus(b: Booking, status: string) {
    const { error } = await supabase.from("consultation_bookings").update({ status: status as any }).eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); void load(); }
  }
  function startEdit(b: Booking) {
    setEditId(b.id);
    setEditDraft({ guest_name: b.guest_name ?? "", guest_email: b.guest_email ?? "", guest_phone: b.guest_phone ?? "", notes: b.notes ?? "", price: b.amount_cents / 100, currency: b.currency, status: b.status });
  }
  async function saveEdit() {
    if (!editId) return;
    const update: any = {
      guest_name: editDraft.guest_name || null,
      guest_email: editDraft.guest_email || null,
      guest_phone: editDraft.guest_phone || null,
      notes: editDraft.notes || null,
      amount_cents: Math.round((editDraft.price ?? 0) * 100),
      currency: (editDraft.currency ?? "USD").toUpperCase(),
      status: editDraft.status,
    };
    const { error } = await supabase.from("consultation_bookings").update(update).eq("id", editId);
    if (error) toast.error(error.message); else { toast.success("Saved"); setEditId(null); void load(); }
  }

  if (loading) return <Spinner />;
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-bold hover:border-primary"><RefreshCcw className="h-3.5 w-3.5" /> Refresh</button>
      </div>
      <Table headers={["When", "Customer", "Amount", "Status", "Actions"]}>
        {rows.map((b) => editId === b.id ? (
          <tr key={b.id} className="bg-primary/5">
            <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
            <td className="px-4 py-2.5 space-y-1">
              <input value={editDraft.guest_name ?? ""} onChange={(e) => setEditDraft({ ...editDraft, guest_name: e.target.value })} placeholder="Name" className="w-full rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-bold" />
              <input value={editDraft.guest_email ?? ""} onChange={(e) => setEditDraft({ ...editDraft, guest_email: e.target.value })} placeholder="Email" className="w-full rounded-md border border-border px-2 py-1 text-[11px]" />
              <input value={editDraft.guest_phone ?? ""} onChange={(e) => setEditDraft({ ...editDraft, guest_phone: e.target.value })} placeholder="Phone" className="w-full rounded-md border border-border px-2 py-1 text-[11px]" />
              <textarea value={editDraft.notes ?? ""} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} placeholder="Notes" rows={2} className="w-full rounded-md border border-border px-2 py-1 text-[11px]" />
            </td>
            <td className="px-4 py-2.5">
              <input value={editDraft.currency ?? ""} onChange={(e) => setEditDraft({ ...editDraft, currency: e.target.value.toUpperCase() })} className="mr-1 w-14 rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-bold" />
              <input type="number" step="0.01" value={editDraft.price ?? 0} onChange={(e) => setEditDraft({ ...editDraft, price: +e.target.value })} className="w-24 rounded-md border-2 border-primary/40 px-2 py-1 text-xs font-extrabold" />
            </td>
            <td className="px-4 py-2.5">
              <select value={editDraft.status ?? "pending"} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })} className="rounded-md border-2 border-primary/40 bg-card px-2 py-1 text-[11px] font-bold">
                {["pending", "confirmed", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={saveEdit} className="mr-1 inline-flex items-center gap-1 rounded-md bg-gradient-primary px-2 py-1 text-[11px] font-bold text-primary-foreground"><Save className="h-3 w-3" /> Save</button>
              <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold"><X className="h-3 w-3" /> Cancel</button>
            </td>
          </tr>
        ) : (
          <tr key={b.id} className="hover:bg-secondary/40">
            <td className="px-4 py-2.5 text-[11px] text-muted-foreground">{new Date(b.created_at).toLocaleString()}</td>
            <td className="px-4 py-2.5">
              <div className="font-bold">{b.guest_name ?? "Member"}</div>
              <div className="text-[11px] text-muted-foreground">{b.guest_email ?? b.user_id?.slice(0, 8)}</div>
              {b.guest_phone && <div className="text-[11px] text-muted-foreground">{b.guest_phone}</div>}
            </td>
            <td className="px-4 py-2.5 font-extrabold">{b.currency} {(b.amount_cents / 100).toFixed(2)}</td>
            <td className="px-4 py-2.5">
              <select value={b.status} onChange={(e) => setStatus(b, e.target.value)} className="rounded-md border-2 border-border bg-card px-2 py-1 text-[11px] font-bold">
                {["pending", "confirmed", "completed", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </td>
            <td className="px-4 py-2.5 text-right">
              <button onClick={() => startEdit(b)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-bold hover:border-primary"><Pencil className="h-3 w-3" /> Edit</button>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No consultation bookings yet.</td></tr>}
      </Table>
    </div>
  );
}

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr>{headers.map((h, i) => <th key={i} className={`px-4 py-3 ${i === headers.length - 1 ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
function Spinner() { return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>; }
