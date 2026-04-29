import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runCrawl, runAllCrawls, CRAWLER_SOURCES } from "./crawler.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin access required");
}

export const triggerCrawl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin((context as any).userId);
    return runCrawl(data.slug, (context as any).userId);
  });

/**
 * Global seeder. Crawls every supported vertical (visas, insurance, tours,
 * pickups) and stores up to 50 items per vertical in inventory_items.
 * Idempotent — re-running refreshes existing items.
 */
export const seedAllInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin((context as any).userId);
    const results = await runAllCrawls((context as any).userId);
    const total = results.reduce((s, r) => s + (r.items_upserted ?? 0), 0);
    return { ok: true as const, total, results };
  });

export const listCrawlerSources = createServerFn({ method: "GET" })
  .handler(async () => ({ sources: CRAWLER_SOURCES }));
