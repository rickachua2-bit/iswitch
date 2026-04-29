import { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

/**
 * Tiny inline error toast used by select-offer flows so users get clear
 * feedback if a CTA fails (network, cache, etc.) instead of silently
 * landing on a broken booking page.
 */
export function ErrorToast({
  message,
  onDismiss,
  durationMs = 5000,
}: {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-[200] flex justify-center px-4 animate-fade-in"
    >
      <div className="flex max-w-md items-start gap-3 rounded-xl border border-destructive/30 bg-card px-4 py-3 shadow-elevated">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-destructive" />
        <div className="flex-1 text-sm text-foreground">{message}</div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
