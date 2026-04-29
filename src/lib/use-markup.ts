/**
 * Hook + helper to apply admin-configured markups to base prices.
 *
 * Looks up the current user's account_type from `profiles` (defaults to
 * "customer" for guests) and the markup % for the given vertical, then
 * exposes an `apply(price)` function used by every price-display surface.
 *
 * Markups are tiny config (6 rows) so we fetch once on mount and cache.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Vertical = "flights" | "stays" | "visas" | "insurance" | "tours" | "pickups";
type MarkupRow = { vertical: Vertical; customer_pct: number; b2b_pct: number };

let cache: { rows: MarkupRow[]; loadedAt: number } | null = null;
const TTL_MS = 60_000;

async function loadMarkups(): Promise<MarkupRow[]> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.rows;
  const { data } = await supabase
    .from("vertical_markups")
    .select("vertical, customer_pct, b2b_pct");
  const rows = (data ?? []).map((r: any) => ({
    vertical: r.vertical,
    customer_pct: Number(r.customer_pct) || 0,
    b2b_pct: Number(r.b2b_pct) || 0,
  })) as MarkupRow[];
  cache = { rows, loadedAt: Date.now() };
  return rows;
}

/** Manually invalidate the cache (e.g. after admin saves a new markup). */
export function invalidateMarkupCache() {
  cache = null;
}

export function useMarkup(vertical: Vertical) {
  const [pct, setPct] = useState(0);
  const [accountType, setAccountType] = useState<"customer" | "agent">("customer");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Resolve account type (guest = customer).
      const { data: { user } } = await supabase.auth.getUser();
      let acct: "customer" | "agent" = "customer";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles").select("account_type").eq("user_id", user.id).maybeSingle();
        if (profile?.account_type === "agent") acct = "agent";
      }
      if (cancelled) return;
      setAccountType(acct);

      const rows = await loadMarkups();
      if (cancelled) return;
      const row = rows.find((r) => r.vertical === vertical);
      const value = row ? (acct === "agent" ? row.b2b_pct : row.customer_pct) : 0;
      setPct(value);
    })();
    return () => { cancelled = true; };
  }, [vertical]);

  const apply = useCallback(
    (price: number | null | undefined): number | null => {
      if (price == null || Number.isNaN(Number(price))) return null;
      return Number(price) * (1 + pct / 100);
    },
    [pct],
  );

  return { pct, accountType, apply };
}
