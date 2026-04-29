// Unified orchestrator that the vertical pages call. Each method routes to the
// correct provider (Duffel, LiteAPI, or DB-backed crawled inventory) and falls
// back to Travsify only if the caller explicitly asks. Keeping a single import
// surface means swapping a provider later won't touch UI code.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// === FLIGHTS (Duffel) ===
export { searchFlights, getFlightOffer } from "./duffel.functions";

// === HOTELS (LiteAPI) ===
export { searchHotels, getHotelDetails } from "./liteapi.functions";

// === CRAWLED VERTICALS — read from inventory_items ===
const CrawlListInput = z.object({
  vertical: z.enum(["visas", "insurance", "tours", "pickups"]),
  origin: z.string().optional(),
  destination: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(40),
});

export const listCrawledInventory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CrawlListInput.parse(d))
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("inventory_items")
      .select("id, title, subtitle, description, origin, destination, price, currency, duration, validity, images, source_url, attributes, providers!inner(slug, name)")
      .eq("vertical", data.vertical)
      .eq("is_active", true)
      .order("price", { ascending: true, nullsFirst: false })
      .limit(data.limit);
    if (data.destination) q = q.ilike("destination", `%${data.destination}%`);
    if (data.origin) q = q.ilike("origin", `%${data.origin}%`);
    const { data: rows, error } = await q;
    if (error) return { ok: false as const, items: [], error: "Inventory unavailable. Please try again shortly." };
    return { ok: true as const, items: rows ?? [] };
  });

export const getCrawledItem = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("inventory_items").select("*, providers(slug, name)")
      .eq("id", data.id).maybeSingle();
    if (error || !row) return { ok: false as const, error: "Item not found." };
    return { ok: true as const, item: row };
  });
