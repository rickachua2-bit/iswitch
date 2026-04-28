import { useRouterState } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SearchingOverlayProps {
  /** Path prefix this overlay belongs to, e.g. "/visas" */
  match: string;
  label?: string;
  sublabel?: string;
  /** Minimum time (ms) the overlay stays visible once shown. */
  minDurationMs?: number;
}

/**
 * Full-screen-ish animated overlay shown while a route loader is fetching
 * results for a search. Uses TanStack Router's pending state so it appears
 * the moment the user clicks "Search" and disappears when results arrive.
 *
 * We also enforce a minimum visible duration so very fast responses (or
 * fast failures) still produce visible feedback for the user.
 */
export function SearchingOverlay({
  match,
  label = "Searching…",
  sublabel,
  minDurationMs = 900,
}: SearchingOverlayProps) {
  const routerPending = useRouterState({
    select: (s) => {
      const status = (s as any).status as string | undefined;
      const pendingMatches = ((s as any).pendingMatches ?? []) as Array<{ pathname?: string }>;
      const isLoading = (s as any).isLoading as boolean | undefined;
      const isTransitioning = (s as any).isTransitioning as boolean | undefined;
      const onMatch = s.location.pathname.startsWith(match);
      const hasPendingForMatch = pendingMatches.some((m) => m.pathname?.startsWith(match));
      return (
        (onMatch && (isLoading || isTransitioning || status === "pending")) ||
        hasPendingForMatch
      );
    },
  });

  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (routerPending) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!visible) {
        shownAtRef.current = Date.now();
        setVisible(true);
      }
    } else if (visible) {
      const elapsed = Date.now() - (shownAtRef.current ?? Date.now());
      const remaining = Math.max(0, minDurationMs - elapsed);
      hideTimerRef.current = setTimeout(() => setVisible(false), remaining);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [routerPending, visible, minDurationMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in"
    >
      <div className="mx-4 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-elevated animate-scale-in">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
          <Search className="relative h-7 w-7 text-primary" strokeWidth={2.4} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 font-display text-base font-bold text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {label}
          </div>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
          <div className="h-full w-1/3 animate-[slide-in-right_1.2s_ease-in-out_infinite] rounded-full bg-gradient-primary" />
        </div>
      </div>
    </div>
  );
}
