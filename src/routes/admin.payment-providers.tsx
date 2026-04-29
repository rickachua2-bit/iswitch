import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Loader2, Save, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminLayout";
import { getPaymentSettings, savePaymentSettings } from "@/server/payment-settings.functions";

export const Route = createFileRoute("/admin/payment-providers")({
  head: () => ({ meta: [{ title: "Payment Providers — Admin" }] }),
  component: PaymentProvidersPage,
});

type Provider = "korapay" | "stripe";

const PROVIDERS: { id: Provider; name: string; help: string; testHint: string; liveHint: string }[] = [
  {
    id: "korapay",
    name: "Korapay",
    help: "Pan-African payments. Use sandbox keys for testing, live keys for production.",
    testHint: "Starts with pk_test_ / sk_test_",
    liveHint: "Starts with pk_live_ / sk_live_",
  },
  {
    id: "stripe",
    name: "Stripe",
    help: "Global card processor. Test mode keys are free and don't move real money.",
    testHint: "pk_test_… / sk_test_…",
    liveHint: "pk_live_… / sk_live_…",
  },
];

function PaymentProvidersPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Record<Provider, any> | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await getPaymentSettings();
      if (res.ok) setSettings(res.settings as never);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <div>
      <AdminPageHeader
        icon={CreditCard}
        title="Payment Providers"
        description="Manage Test and Live API keys for each payment provider. Switch modes per provider without redeploying."
      />
      {loading || !settings ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {PROVIDERS.map((p) => (
            <ProviderCard key={p.id} meta={p} initial={settings[p.id]} onSaved={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProviderCard({
  meta,
  initial,
  onSaved,
}: {
  meta: { id: Provider; name: string; help: string; testHint: string; liveHint: string };
  initial: any;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<"sandbox" | "live">(initial?.mode ?? "sandbox");
  const [form, setForm] = useState({
    test_public_key: initial?.test_public_key ?? "",
    test_secret_key: "",
    test_webhook_secret: "",
    live_public_key: initial?.live_public_key ?? "",
    live_secret_key: "",
    live_webhook_secret: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Indicators of what is already saved (masked secrets returned by server)
  const hasTestSecret = !!initial?.test_secret_key;
  const hasTestWebhook = !!initial?.test_webhook_secret;
  const hasLiveSecret = !!initial?.live_secret_key;
  const hasLiveWebhook = !!initial?.live_webhook_secret;

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await savePaymentSettings({
        data: { provider: meta.id, mode, ...form },
      });
      if (res.ok) {
        setMsg({ type: "ok", text: "Saved successfully." });
        // Clear secret inputs so masked values stay masked
        setForm((f) => ({
          ...f,
          test_secret_key: "",
          test_webhook_secret: "",
          live_secret_key: "",
          live_webhook_secret: "",
        }));
        onSaved();
      } else {
        setMsg({ type: "err", text: res.error });
      }
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-foreground">{meta.name}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                mode === "live"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {mode === "live" ? "Live mode" : "Test mode"}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{meta.help}</p>
        </div>
        <div className="flex rounded-lg border border-border bg-secondary/40 p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("sandbox")}
            className={`rounded-md px-3 py-1.5 transition ${
              mode === "sandbox" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Test
          </button>
          <button
            type="button"
            onClick={() => setMode("live")}
            className={`rounded-md px-3 py-1.5 transition ${
              mode === "live" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Live
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Test column */}
        <KeyColumn
          title="Test (sandbox) keys"
          hint={meta.testHint}
          tone="amber"
          publicKey={form.test_public_key}
          onPublicKeyChange={(v) => setForm({ ...form, test_public_key: v })}
          secretKey={form.test_secret_key}
          onSecretKeyChange={(v) => setForm({ ...form, test_secret_key: v })}
          secretSavedLabel={hasTestSecret ? initial.test_secret_key : ""}
          webhookSecret={form.test_webhook_secret}
          onWebhookChange={(v) => setForm({ ...form, test_webhook_secret: v })}
          webhookSavedLabel={hasTestWebhook ? initial.test_webhook_secret : ""}
        />
        {/* Live column */}
        <KeyColumn
          title="Live (production) keys"
          hint={meta.liveHint}
          tone="emerald"
          publicKey={form.live_public_key}
          onPublicKeyChange={(v) => setForm({ ...form, live_public_key: v })}
          secretKey={form.live_secret_key}
          onSecretKeyChange={(v) => setForm({ ...form, live_secret_key: v })}
          secretSavedLabel={hasLiveSecret ? initial.live_secret_key : ""}
          webhookSecret={form.live_webhook_secret}
          onWebhookChange={(v) => setForm({ ...form, live_webhook_secret: v })}
          webhookSavedLabel={hasLiveWebhook ? initial.live_webhook_secret : ""}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="min-h-[20px] text-xs">
          {msg && (
            <span className={`inline-flex items-center gap-1.5 ${
              msg.type === "ok" ? "text-emerald-600" : "text-destructive"
            }`}>
              {msg.type === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {msg.text}
            </span>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:bg-primary-glow disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {meta.name}
        </button>
      </div>
    </div>
  );
}

function KeyColumn({
  title, hint, tone,
  publicKey, onPublicKeyChange,
  secretKey, onSecretKeyChange, secretSavedLabel,
  webhookSecret, onWebhookChange, webhookSavedLabel,
}: {
  title: string;
  hint: string;
  tone: "amber" | "emerald";
  publicKey: string; onPublicKeyChange: (v: string) => void;
  secretKey: string; onSecretKeyChange: (v: string) => void; secretSavedLabel: string;
  webhookSecret: string; onWebhookChange: (v: string) => void; webhookSavedLabel: string;
}) {
  const ring = tone === "amber" ? "border-amber-500/30" : "border-emerald-500/30";
  return (
    <div className={`rounded-xl border ${ring} bg-secondary/30 p-4`}>
      <div className="mb-1 text-sm font-bold text-foreground">{title}</div>
      <div className="mb-3 text-[11px] text-muted-foreground">{hint}</div>
      <div className="space-y-3">
        <Field label="Public key">
          <input
            value={publicKey}
            onChange={(e) => onPublicKeyChange(e.target.value)}
            placeholder="pk_…"
            className="form-input"
          />
        </Field>
        <SecretField
          label="Secret key"
          value={secretKey}
          onChange={onSecretKeyChange}
          savedLabel={secretSavedLabel}
        />
        <SecretField
          label="Webhook signing secret"
          value={webhookSecret}
          onChange={onWebhookChange}
          savedLabel={webhookSavedLabel}
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function SecretField({
  label, value, onChange, savedLabel,
}: { label: string; value: string; onChange: (v: string) => void; savedLabel: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <span>{label}</span>
        {savedLabel && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">Saved · {savedLabel}</span>}
      </div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={savedLabel ? "Leave blank to keep current" : "sk_…"}
          className="form-input pr-9"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </label>
  );
}
