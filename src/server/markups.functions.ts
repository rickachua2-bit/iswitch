/**
 * Markup configuration.
 *
 * Admins set a per-vertical commission split:
 *  - customer_pct: applied to customer-facing prices
 *  - b2b_pct:      applied to B2B agent-facing prices
 *
 * The displayed price = base price * (1 + pct/100). The delta vs base is the
 * commission earned on that booking. Stored in `vertical_markups` (one row
 * per vertical, seeded at 0%).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAuth } from "@/integrations/supabase/auth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VERTICALS = ["flights", "stays", "visas", "insurance", "tours", "pickups"] as const;
type Vertical = (typeof VERTICALS)[number];

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin access required");
}

/** Public read — both guests and signed-in users need this to see prices. */
export const listMarkups = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("vertical_markups")
    .select("vertical, customer_pct, b2b_pct, updated_at");
  if (error) return { ok: false as const, error: error.message, markups: [] };
  // Always return one row per vertical (fill missing with 0).
  const map = new Map((data ?? []).map((r: any) => [r.vertical, r]));
  const markups = VERTICALS.map((v) =>
    map.get(v) ?? { vertical: v, customer_pct: 0, b2b_pct: 0, updated_at: null },
  );
  return { ok: true as const, markups };
});

/** Admin-only update for a single vertical. */
export const setMarkup = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        vertical: z.enum(VERTICALS),
        customer_pct: z.number().min(0).max(100),
        b2b_pct: z.number().min(0).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = (context as any).userId as string;
    await assertAdmin(userId);
    const { error } = await supabaseAdmin
      .from("vertical_markups")
      .upsert(
        {
          vertical: data.vertical,
          customer_pct: data.customer_pct,
          b2b_pct: data.b2b_pct,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "vertical" },
      );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
