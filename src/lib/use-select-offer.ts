// Shared hook for "select an offer & go to booking" CTAs across all verticals.
// Centralises: loading state, error handling, durable persistence, and navigation.
//
// Usage:
//   const { selecting, error, select } = useSelectOffer();
//   <button disabled={selecting} onClick={() => select({ ... })}>Book</button>

import { useState, useCallback } from "react";
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

export function useSelectOffer() {
  const navigate = useNavigate();
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = useCallback(
    async (args: SelectArgs) => {
      if (selectingId) return; // ignore double-clicks
      setSelectingId(args.id);
      setError(null);
      try {
        const res = await persistSelectedOffer({
          vertical: args.vertical,
          sessionPrefix: args.sessionPrefix,
          cachePrefix: args.cachePrefix,
          id: args.id,
          payload: args.payload,
        });
        if (!res.ok) {
          setError(res.error || "Could not continue. Please try again.");
          setSelectingId(null);
          return;
        }
        navigate({ to: args.to as any, search: args.search as never });
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong. Please try again.");
        setSelectingId(null);
      }
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
