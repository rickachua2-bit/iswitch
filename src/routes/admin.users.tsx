import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, Loader2, Search, Shield, ShieldCheck, ShieldOff, Mail, Phone, Globe, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users & Roles — Admin" }] }),
  component: AdminUsers,
});

type Role = "customer" | "agent" | "admin";
type Profile = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  account_type: string;
  agent_status: string;
  country: string | null;
  preferred_currency: string | null;
  created_at: string;
};

function AdminUsers() {
  const [rows, setRows] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const { ask, node } = useConfirm();

  async function load() {
    setLoading(true);
    const [{ data: profs }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map: Record<string, Role[]> = {};
    (r ?? []).forEach((row: any) => {
      map[row.user_id] = [...(map[row.user_id] ?? []), row.role];
    });
    setRoles(map);
    setRows((profs ?? []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((p) => {
      const userRoles = roles[p.user_id] ?? [];
      if (filterRole !== "all" && !userRoles.includes(filterRole)) return false;
      if (!q) return true;
      const hay = `${p.display_name ?? ""} ${p.phone ?? ""} ${p.country ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [rows, roles, q, filterRole]);

  async function toggleRole(userId: string, role: Role) {
    const has = (roles[userId] ?? []).includes(role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) { toast.error(error.message); return; }
      toast.success(`Removed ${role} role`);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast.error(error.message); return; }
      toast.success(`Granted ${role} role`);
    }
    void load();
  }

  function confirmToggleAdmin(p: Profile) {
    const has = (roles[p.user_id] ?? []).includes("admin");
    ask({
      title: has ? "Revoke admin access" : "Grant admin access",
      description: has
        ? `${p.display_name ?? "This user"} will lose access to the admin console.`
        : `${p.display_name ?? "This user"} will gain full administrative privileges across the platform.`,
      tone: has ? "danger" : "warn",
      confirmLabel: has ? "Revoke admin" : "Grant admin",
      requirePhrase: has ? undefined : "GRANT ADMIN",
      onConfirm: async () => { await toggleRole(p.user_id, "admin"); },
    });
  }

  return (
    <div>
      <AdminPageHeader icon={Users} title="Users & Roles" description="Search every account and grant or revoke privileges. Admin grants require typed confirmation." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, country…"
            className="w-full rounded-md border-2 border-border bg-card pl-9 pr-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
          <Filter className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
          {(["all", "customer", "agent", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`rounded px-2.5 py-1 text-xs font-bold capitalize ${filterRole === r ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No users match your filters.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-left">Roles</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const userRoles = roles[p.user_id] ?? [];
                const isAdmin = userRoles.includes("admin");
                const isAgent = userRoles.includes("agent");
                return (
                  <tr key={p.user_id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3">
                      <div className="font-bold">{p.display_name || "Unnamed"}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.user_id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</div>}
                      {p.country && <div className="flex items-center gap-1"><Globe className="h-3 w-3" />{p.country}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase">{p.account_type}</span>
                      {p.agent_status !== "none" && (
                        <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${p.agent_status === "approved" ? "bg-success/10 text-success" : p.agent_status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground"}`}>
                          {p.agent_status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {userRoles.map((r) => (
                          <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r === "admin" ? "bg-gradient-primary text-primary-foreground" : r === "agent" ? "bg-accent/30 text-accent-foreground" : "bg-secondary text-foreground"}`}>{r}</span>
                        ))}
                        {userRoles.length === 0 && <span className="text-[10px] text-muted-foreground">No roles</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => toggleRole(p.user_id, "agent")}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${isAgent ? "border-accent bg-accent/20 text-accent-foreground" : "border-border hover:border-accent"}`}
                          title={isAgent ? "Revoke agent" : "Grant agent"}
                        >
                          {isAgent ? <ShieldOff className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                          {isAgent ? "Revoke agent" : "Make agent"}
                        </button>
                        <button
                          onClick={() => confirmToggleAdmin(p)}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-bold ${isAdmin ? "border-destructive text-destructive" : "border-border hover:border-primary hover:text-primary"}`}
                        >
                          <Shield className="h-3 w-3" />
                          {isAdmin ? "Revoke admin" : "Make admin"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {node}
    </div>
  );
}
