import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Settings,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Lock,
  Bell,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import {
  changeAdminPassword,
  getAdminProfile,
  getBrandSettings,
  saveBrandSettings,
  updateAdminNotifications,
  updateAdminProfile,
} from "@/server/admin-settings.functions";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin Settings — iSwitch" }] }),
  component: AdminSettingsPage,
});

type Tab = "profile" | "password" | "notifications" | "brand";

function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const tabs: { id: Tab; label: string; icon: typeof UserIcon }[] = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "password", label: "Password", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "brand", label: "Brand & Site", icon: Sparkles },
  ];

  return (
    <div>
      <AdminPageHeader
        icon={Settings}
        title="Admin Settings"
        description="Manage your account, security, notifications, and global brand identity."
      />

      <div className="mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-card">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "profile" && <ProfilePanel />}
      {tab === "password" && <PasswordPanel />}
      {tab === "notifications" && <NotificationsPanel />}
      {tab === "brand" && <BrandPanel />}
    </div>
  );
}

function Status({ msg }: { msg: { type: "ok" | "err"; text: string } | null }) {
  if (!msg) return <span className="min-h-[20px] block" />;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs ${
        msg.type === "ok" ? "text-emerald-600" : "text-destructive"
      }`}
    >
      {msg.type === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      {msg.text}
    </span>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="mb-5 border-b border-border pb-4">
        <h2 className="font-display text-lg font-extrabold text-foreground">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </label>
  );
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-extrabold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {label}
    </button>
  );
}

function ProfilePanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState({
    email: "",
    display_name: "",
    phone: "",
    avatar_url: "",
    bio: "",
  });

  useEffect(() => {
    void (async () => {
      const res = await getAdminProfile();
      if (res.ok) {
        setForm((f) => ({
          ...f,
          email: res.profile.email,
          display_name: res.profile.display_name,
          phone: res.profile.phone,
          avatar_url: res.profile.avatar_url,
          bio: res.profile.bio,
        }));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Card title="Profile">
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      </Card>
    );
  }

  return (
    <Card title="Profile" description="How you appear inside the admin console.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setMsg(null);
          try {
            const res = await updateAdminProfile({
              data: {
                display_name: form.display_name,
                phone: form.phone,
                avatar_url: form.avatar_url,
                bio: form.bio,
              },
            });
            setMsg(res.ok ? { type: "ok", text: "Profile updated." } : { type: "err", text: res.error });
          } catch (err: any) {
            setMsg({ type: "err", text: err?.message ?? "Failed" });
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            {form.avatar_url ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={form.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-xl font-extrabold">
                {(form.display_name || form.email || "A").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="text-sm">
            <div className="font-extrabold text-foreground">{form.display_name || "Admin"}</div>
            <div className="text-xs text-muted-foreground">{form.email}</div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display name">
            <input className="form-input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Avatar URL" hint="A direct link to a square image works best.">
            <input className="form-input" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Email">
            <input className="form-input bg-muted" value={form.email} disabled readOnly />
          </Field>
        </div>
        <Field label="Bio" hint="Optional — visible only inside the admin console.">
          <textarea
            className="form-input min-h-[80px]"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            maxLength={500}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Status msg={msg} />
          <SubmitButton saving={saving} label="Save profile" />
        </div>
      </form>
    </Card>
  );
}

function PasswordPanel() {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [show, setShow] = useState({ cur: false, n: false, c: false });
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });

  return (
    <Card title="Change password" description="Use a strong, unique password — at least 8 characters.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          if (form.new_password.length < 8) {
            setMsg({ type: "err", text: "New password must be at least 8 characters." });
            return;
          }
          if (form.new_password !== form.confirm) {
            setMsg({ type: "err", text: "New passwords do not match." });
            return;
          }
          setSaving(true);
          try {
            const res = await changeAdminPassword({
              data: { current_password: form.current_password, new_password: form.new_password },
            });
            if (res.ok) {
              setMsg({ type: "ok", text: "Password updated." });
              setForm({ current_password: "", new_password: "", confirm: "" });
            } else {
              setMsg({ type: "err", text: res.error });
            }
          } catch (err: any) {
            setMsg({ type: "err", text: err?.message ?? "Failed" });
          } finally {
            setSaving(false);
          }
        }}
      >
        <PwField
          label="Current password"
          show={show.cur}
          toggle={() => setShow({ ...show, cur: !show.cur })}
          value={form.current_password}
          onChange={(v) => setForm({ ...form, current_password: v })}
        />
        <PwField
          label="New password"
          show={show.n}
          toggle={() => setShow({ ...show, n: !show.n })}
          value={form.new_password}
          onChange={(v) => setForm({ ...form, new_password: v })}
        />
        <PwField
          label="Confirm new password"
          show={show.c}
          toggle={() => setShow({ ...show, c: !show.c })}
          value={form.confirm}
          onChange={(v) => setForm({ ...form, confirm: v })}
        />
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Status msg={msg} />
          <SubmitButton saving={saving} label="Update password" />
        </div>
      </form>
    </Card>
  );
}

function PwField({
  label, show, toggle, value, onChange,
}: { label: string; show: boolean; toggle: () => void; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className="form-input pr-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </Field>
  );
}

function NotificationsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState({ marketing_emails: true, sms_notifications: true });

  useEffect(() => {
    void (async () => {
      const res = await getAdminProfile();
      if (res.ok) {
        setForm({
          marketing_emails: res.profile.marketing_emails,
          sms_notifications: res.profile.sms_notifications,
        });
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <Card title="Notifications"><div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></Card>;
  }

  return (
    <Card title="Notifications" description="Choose how the system reaches you.">
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setMsg(null);
          try {
            const res = await updateAdminNotifications({ data: form });
            setMsg(res.ok ? { type: "ok", text: "Preferences saved." } : { type: "err", text: res.error });
          } finally {
            setSaving(false);
          }
        }}
      >
        <Toggle
          label="Email updates"
          description="Operational alerts, agent applications, payment events."
          checked={form.marketing_emails}
          onChange={(v) => setForm({ ...form, marketing_emails: v })}
        />
        <Toggle
          label="SMS notifications"
          description="Critical alerts only — webhook failures, payment disputes."
          checked={form.sms_notifications}
          onChange={(v) => setForm({ ...form, sms_notifications: v })}
        />
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Status msg={msg} />
          <SubmitButton saving={saving} label="Save preferences" />
        </div>
      </form>
    </Card>
  );
}

function Toggle({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/30 p-4">
      <div>
        <div className="text-sm font-bold text-foreground">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? "bg-gradient-primary" : "bg-border"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-card shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

function BrandPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState({
    brand_name: "",
    logo_url: "",
    support_email: "",
    support_phone: "",
    tagline: "",
  });

  useEffect(() => {
    void (async () => {
      const res = await getBrandSettings();
      if (res.ok) setForm(res.settings);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <Card title="Brand & Site"><div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div></Card>;
  }

  return (
    <Card title="Brand & Site" description="Identity, logo, and support contact shown across the platform.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setMsg(null);
          try {
            const res = await saveBrandSettings({ data: form });
            setMsg(res.ok ? { type: "ok", text: "Brand settings saved." } : { type: "err", text: res.error });
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brand name">
            <input className="form-input" value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
          </Field>
          <Field label="Tagline">
            <input className="form-input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </Field>
          <Field label="Logo URL">
            <input className="form-input" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Support email">
            <input className="form-input" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} placeholder="hello@…" />
          </Field>
          <Field label="Support phone">
            <input className="form-input" value={form.support_phone} onChange={(e) => setForm({ ...form, support_phone: e.target.value })} />
          </Field>
        </div>

        {form.logo_url && (
          <div className="rounded-xl border border-border bg-gradient-card p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Preview</div>
            <img src={form.logo_url} alt="Logo preview" className="h-12" />
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Status msg={msg} />
          <SubmitButton saving={saving} label="Save brand settings" />
        </div>
      </form>
    </Card>
  );
}
