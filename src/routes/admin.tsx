import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Users, Briefcase, Settings as SettingsIcon, CheckCircle2, XCircle, Eye, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CurrencyAdmin } from "@/components/admin/CurrencyAdmin";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — iSwitch" }] }),
  component: AdminPage,
});

type Application = {
  id: string;
  user_id: string;
  business_name: string;
  registration_number: string;
  country: string;
  contact_phone: string;
  business_type: string;
  website: string | null;
  document_paths: string[];
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
};

type Setting = { key: string; value: number; description: string | null };

function AdminPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, hasRole } = useAuth();
  const [tab, setTab] = useState<"agents" | "settings" | "currencies">("agents");

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user) {
    void navigate({ to: "/login" });
    return null;
  }
  if (!hasRole("admin")) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <Header />
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <ShieldAlert className="mx-auto h-14 w-14 text-destructive" />
          <h1 className="mt-4 font-display text-2xl font-extrabold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have admin permissions. To grant admin access to a user, run this in your Cloud SQL editor:
          </p>
          <pre className="mt-4 overflow-auto rounded-md bg-card p-3 text-left font-mono text-[11px] text-foreground">
{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${user.id}', 'admin');`}
          </pre>
          <Link to="/dashboard" className="mt-6 inline-block rounded-md bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">Back to dashboard</Link>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h1 className="font-display text-3xl font-extrabold">Admin panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage agents, markups & system settings.</p>

        <div className="mt-6 flex gap-2 border-b border-border">
          <TabBtn active={tab === "agents"} onClick={() => setTab("agents")} icon={Users}>Agent applications</TabBtn>
          <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={SettingsIcon}>Markups & commission</TabBtn>
          <TabBtn active={tab === "currencies"} onClick={() => setTab("currencies")} icon={DollarSign}>Currencies</TabBtn>
        </div>

        <div className="mt-6">
          {tab === "agents" && <AgentApplications />}
          {tab === "settings" && <SystemSettings />}
          {tab === "currencies" && <CurrencyAdmin />}
        </div>
      </section>
      <Footer />
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Users; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-bold transition ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function AgentApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("agent_applications").select("*").order("created_at", { ascending: false });
    setApps((data ?? []) as Application[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function decide(app: Application, decision: "approved" | "rejected") {
    setBusy(app.id);
    const { error } = await supabase
      .from("agent_applications")
      .update({ status: decision, reviewed_at: new Date().toISOString() })
      .eq("id", app.id);

    if (!error && decision === "approved") {
      // Grant agent role + flip profile flag
      await supabase.from("user_roles").upsert({ user_id: app.user_id, role: "agent" }, { onConflict: "user_id,role" });
      await supabase.from("profiles").update({ agent_status: "approved" }).eq("user_id", app.user_id);
    }
    if (!error && decision === "rejected") {
      await supabase.from("profiles").update({ agent_status: "rejected" }).eq("user_id", app.user_id);
    }
    setBusy(null);
    void load();
  }

  async function viewDoc(path: string) {
    const { data } = await supabase.storage.from("kyb-documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (apps.length === 0) return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No agent applications yet.</div>;

  return (
    <div className="space-y-3">
      {apps.map((a) => (
        <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="font-display text-base font-extrabold">{a.business_name}</span>
                <StatusPill status={a.status} />
              </div>
              <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-muted-foreground md:grid-cols-4">
                <span><b className="text-foreground">Reg #:</b> {a.registration_number}</span>
                <span><b className="text-foreground">Country:</b> {a.country}</span>
                <span><b className="text-foreground">Type:</b> {a.business_type}</span>
                <span><b className="text-foreground">Phone:</b> {a.contact_phone}</span>
              </div>
              {a.website && <a href={a.website} target="_blank" rel="noopener" className="mt-1 block text-xs text-primary hover:underline">{a.website}</a>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {a.document_paths.map((p) => (
                  <button key={p} onClick={() => viewDoc(p)} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                    <Eye className="h-3 w-3" /> {p.split("/").pop()}
                  </button>
                ))}
              </div>
            </div>
            {a.status === "pending" && (
              <div className="flex gap-2">
                <button disabled={busy === a.id} onClick={() => decide(a, "approved")} className="flex items-center gap-1 rounded-md bg-success px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </button>
                <button disabled={busy === a.id} onClick={() => decide(a, "rejected")} className="flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const c = status === "approved" ? "bg-success/10 text-success" : status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c}`}>{status}</span>;
}

function SystemSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("system_settings").select("key, value, description").order("key");
    setSettings((data ?? []).map((s) => ({ ...s, value: Number(s.value) })) as Setting[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function save(key: string, value: number) {
    setSavingKey(key);
    await supabase.from("system_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    setSavingKey(null);
  }

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-3">
      {settings.map((s) => (
        <div key={s.key} className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-foreground">{s.key.replace(/_/g, " ")}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                defaultValue={s.value}
                onBlur={(e) => save(s.key, Number(e.target.value))}
                className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-right text-sm font-bold focus:border-primary focus:outline-none"
              />
              <span className="text-sm font-bold text-muted-foreground">%</span>
              {savingKey === s.key && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
