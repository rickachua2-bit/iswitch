// Shared hook for "select an offer & go to booking" CTAs across all verticals.
// Centralises: loading state, error handling, durable persistence, and navigation.
//
// Hardening: every CTA has a hard timeout. SessionStorage is the source of truth
// for navigation — if the backend cache write is slow or fails, we still navigate
// (the booking page can fall back to its own retry/recovery). This guarantees the
// "View rooms & book" / "Apply now" / etc. buttons never stay stuck in a loop.

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { persistSelectedOffer, type Vertical } from "./select-offer";

export type SelectArgs = {
  vertical: Vertical;
  sessionPrefix: string;
  cachePrefix: string;
  id: string;
  payload: Record<string, any>;
  to: string;
  search: Record<string, any>;
};

// Max time to wait for the persistence step before we navigate anyway.
// SessionStorage write is synchronous; the slow part is the optional
// backend cache. Booking pages already retry the server cache on mount.
const SELECT_TIMEOUT_MS = 4000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | { timeout: true }> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timeout: true } as any), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      () => { clearTimeout(t); resolve({ timeout: true } as any); },
    );
  });
}

export function useSelectOffer() {
  const navigate = useNavigate();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const select = useCallback(
    async (args: SelectArgs) => {
      if (selectingId) return; // ignore double-clicks
      setSelectingId(args.id);
      setError(null);

      // 1. Synchronous sessionStorage write so navigation always has data to recover.
      let sessionOk = false;
      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(`${args.sessionPrefix}:${args.id}`, JSON.stringify(args.payload));
          sessionOk = true;
        }
      } catch { /* quota / private mode — keep going */ }

      // 2. Kick off durable backend cache write but don't block forever on it.
      const persistPromise = persistSelectedOffer({
        vertical: args.vertical,
        sessionPrefix: args.sessionPrefix,
        cachePrefix: args.cachePrefix,
        id: args.id,
        payload: args.payload,
      }).catch((e: any) => ({ ok: false as const, error: e?.message ?? "Network error" }));

      const res = await withTimeout(persistPromise, SELECT_TIMEOUT_MS);
      const timedOut = (res as any)?.timeout === true;
      const persistedOk = !timedOut && (res as any)?.ok === true;

      // If persistence completely failed AND we have nothing in session, surface error.
      if (!persistedOk && !sessionOk && !timedOut) {
        const msg = (res as any)?.error || "Could not save your selection. Please try again.";
        if (mounted.current) {
          setError(msg);
          setSelectingId(null);
        }
        return;
      }

      // Always navigate when sessionStorage succeeded (most common path) or persistence
      // succeeded. If persistence merely timed out, the user can still proceed because
      // the booking page reads sessionStorage first and retries the server cache.
      try {
        navigate({ to: args.to as any, search: args.search as never });
      } catch (e: any) {
        if (mounted.current) {
          setError(e?.message ?? "Could not open the booking page. Please try again.");
          setSelectingId(null);
        }
        return;
      }

      // Reset loading on next tick so the button isn't stuck if navigation no-ops.
      setTimeout(() => {
        if (mounted.current) setSelectingId(null);
      }, 250);
    },
    [navigate, selectingId],
  );

  return {
    select,
    selectingId,
    selecting: selectingId != null,
    isSelecting: (id: string) => selectingId === id,
    error,
    clearError: () => setError(null),
  };
}
