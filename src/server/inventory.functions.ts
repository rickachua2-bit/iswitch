import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ListInput = z.object({
  vertical: z.enum(["visas", "insurance", "tours", "pickups"]),
  origin: z.string().optional(),
  destination: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(40),
});

export const listInventory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("inventory_items")
      .select("id, provider_id, title, subtitle, description, origin, destination, price, currency, duration, validity, images, source_url, attributes, providers!inner(slug, name)")
      .eq("vertical", data.vertical)
      .eq("is_active", true)
      .order("price", { ascending: true, nullsFirst: false })
      .limit(data.limit);
    if (data.destination) q = q.ilike("destination", `%${data.destination}%`);
    if (data.origin) q = q.ilike("origin", `%${data.origin}%`);
    const { data: rows, error } = await q;
    if (error) return { ok: false as const, items: [], error: error.message };
    return { ok: true as const, items: rows ?? [] };
  });

export const getInventoryItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("inventory_items")
      .select("*, providers(slug, name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) return { ok: false as const, error: error?.message ?? "Not found" };
    return { ok: true as const, item: row };
  });
