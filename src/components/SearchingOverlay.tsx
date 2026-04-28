import { useRouterState } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";

interface SearchingOverlayProps {
  /** Path prefix this overlay belongs to, e.g. "/visas" */
  match: string;
  label?: string;
  sublabel?: string;
}

/**
 * Full-screen-ish animated overlay shown while a route loader is fetching
 * results for a search. Uses TanStack Router's pending state so it appears
 * the moment the user clicks "Search" and disappears when results arrive.
 */
export function SearchingOverlay({ match, label = "Searching…", sublabel }: SearchingOverlayProps) {
  const isPending = useRouterState({
    select: (s) =>
      s.isLoading &&
      s.pendingMatches.some((m) => m.pathname.startsWith(match)),
  });

  if (!isPending) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm animate-fade-in"
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
