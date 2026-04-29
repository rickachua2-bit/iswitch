import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Loader2, CheckCircle2, XCircle, Eye, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/agents")({
  head: () => ({ meta: [{ title: "Agent Applications — Admin" }] }),
  component: AgentApps,
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

function AgentApps() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const { ask, node } = useConfirm();

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("agent_applications").select("*").order("created_at", { ascending: false });
    setApps((data ?? []) as Application[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function decide(app: Application, decision: "approved" | "rejected") {
    const { error } = await supabase
      .from("agent_applications")
      .update({ status: decision, reviewed_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) { toast.error(error.message); return; }

    if (decision === "approved") {
      await supabase.from("user_roles").upsert({ user_id: app.user_id, role: "agent" }, { onConflict: "user_id,role" });
      await supabase.from("profiles").update({ agent_status: "approved" }).eq("user_id", app.user_id);
    } else {
      await supabase.from("profiles").update({ agent_status: "rejected" }).eq("user_id", app.user_id);
    }
    toast.success(`Application ${decision}`);
    void load();
  }

  function confirmDecide(app: Application, decision: "approved" | "rejected") {
    ask({
      title: decision === "approved" ? `Approve ${app.business_name}?` : `Reject ${app.business_name}?`,
      description: decision === "approved"
        ? "This grants the agent role and unlocks B2B pricing for this user."
        : "The applicant will be notified that their application was declined.",
      tone: decision === "approved" ? "primary" : "danger",
      confirmLabel: decision === "approved" ? "Approve agent" : "Reject application",
      onConfirm: async () => { await decide(app, decision); },
    });
  }

  async function viewDoc(path: string) {
    const { data } = await supabase.storage.from("kyb-documents").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);

  return (
    <div>
      <AdminPageHeader icon={Briefcase} title="Agent Applications" description="Review KYB submissions, inspect documents, and grant the agent role." />

      <div className="mb-4 flex items-center gap-1 rounded-md border border-border bg-card p-1 w-fit">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded px-3 py-1.5 text-xs font-bold capitalize ${filter === s ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {s} {s !== "all" && `(${apps.filter((a) => a.status === s).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">No applications.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="font-display text-base font-extrabold">{a.business_name}</span>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground md:grid-cols-4">
                    <span><b className="text-foreground">Reg #:</b> {a.registration_number}</span>
                    <span><b className="text-foreground">Country:</b> {a.country}</span>
                    <span><b className="text-foreground">Type:</b> {a.business_type}</span>
                    <span><b className="text-foreground">Phone:</b> {a.contact_phone}</span>
                  </div>
                  {a.website && (
                    <a href={a.website} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> {a.website}
                    </a>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.document_paths.map((p) => (
                      <button key={p} onClick={() => viewDoc(p)} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold hover:bg-muted">
                        <Eye className="h-3 w-3" /> {p.split("/").pop()}
                      </button>
                    ))}
                  </div>
                </div>
                {a.status === "pending" && (
                  <div className="flex gap-2">
                    <button onClick={() => confirmDecide(a, "approved")} className="flex items-center gap-1 rounded-md bg-success px-3 py-2 text-xs font-bold text-white shadow-md">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => confirmDecide(a, "rejected")} className="flex items-center gap-1 rounded-md bg-destructive px-3 py-2 text-xs font-bold text-white shadow-md">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {node}
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const c = status === "approved" ? "bg-success/10 text-success" : status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-accent/20 text-accent-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c}`}>{status}</span>;
}
