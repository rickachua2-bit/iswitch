import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CreateInput = z.object({
  vertical: z.enum(["flights", "stays", "visas", "insurance", "tours", "pickups"]),
  provider_slug: z.string(),
  inventory_item_id: z.string().uuid().optional(),
  external_reference: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.string().default("USD"),
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  customer_phone: z.string().optional(),
  user_id: z.string().uuid().optional(),
  payload: z.record(z.string(), z.any()).default({}),
});

export const createUnifiedBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data }) => {
    const { data: prov } = await supabaseAdmin.from("providers").select("id").eq("slug", data.provider_slug).maybeSingle();
    const { data: row, error } = await supabaseAdmin.from("bookings_unified").insert({
      vertical: data.vertical,
      provider_id: prov?.id ?? null,
      inventory_item_id: data.inventory_item_id ?? null,
      external_reference: data.external_reference ?? null,
      amount: data.amount,
      currency: data.currency,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone ?? null,
      user_id: data.user_id ?? null,
      payload: data.payload,
      status: "pending",
    }).select("id, status, created_at").single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, booking: row };
  });
