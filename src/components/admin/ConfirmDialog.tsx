import { useState, type ReactNode } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type Tone = "danger" | "primary" | "warn";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  requirePhrase,
  busy,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  requirePhrase?: string; // require user to type this exact phrase
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const [phrase, setPhrase] = useState("");
  if (!open) return null;

  const toneCls =
    tone === "danger"
      ? "bg-destructive text-white"
      : tone === "warn"
      ? "bg-accent text-accent-foreground"
      : "bg-gradient-primary text-primary-foreground";

  const canConfirm = requirePhrase ? phrase.trim() === requirePhrase : true;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start gap-3 border-b border-border bg-secondary/40 p-5">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone === "danger" ? "bg-destructive/10 text-destructive" : tone === "warn" ? "bg-accent/30 text-accent-foreground" : "bg-primary/10 text-primary"}`}>
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-base font-extrabold">{title}</h3>
            {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
          </div>
          <button onClick={onCancel} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          {children}
          {requirePhrase && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Type <span className="font-mono font-bold text-destructive">{requirePhrase}</span> to confirm
              </label>
              <input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                className="mt-1 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm focus:border-destructive focus:outline-none"
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-secondary/30 p-4">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-border bg-card px-4 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => void onConfirm()}
            disabled={busy || !canConfirm}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-extrabold shadow-md disabled:opacity-50 ${toneCls}`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook helper to manage confirm state
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description?: ReactNode;
    tone?: Tone;
    confirmLabel?: string;
    requirePhrase?: string;
    onConfirm?: () => Promise<void> | void;
  }>({ open: false, title: "" });
  const [busy, setBusy] = useState(false);

  function ask(opts: Omit<typeof state, "open">) {
    setState({ ...opts, open: true });
  }
  function close() {
    setState((s) => ({ ...s, open: false }));
    setBusy(false);
  }
  async function confirm() {
    if (!state.onConfirm) return close();
    try {
      setBusy(true);
      await state.onConfirm();
    } finally {
      close();
    }
  }

  const node = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      tone={state.tone}
      confirmLabel={state.confirmLabel}
      requirePhrase={state.requirePhrase}
      busy={busy}
      onConfirm={confirm}
      onCancel={close}
    />
  );

  return { ask, node };
}
