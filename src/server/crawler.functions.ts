import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAuth } from "@/integrations/supabase/auth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { runCrawl, runAllCrawls, CRAWLER_SOURCES } from "./crawler.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin access required");
}

export const triggerCrawl = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      await assertAdmin((context as any).userId);
      return await runCrawl(data.slug, (context as any).userId);
    } catch (e: any) {
      console.error("triggerCrawl failed:", e);
      return { status: "failed" as const, error: e?.message ?? "Crawl failed", items_upserted: 0 };
    }
  });

/**
 * Global seeder. Crawls every supported vertical (visas, insurance, tours,
 * pickups) and stores up to 50 items per vertical in inventory_items.
 * Idempotent — re-running refreshes existing items.
 */
export const seedAllInventory = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .handler(async ({ context }) => {
    try {
      await assertAdmin((context as any).userId);
      const results = await runAllCrawls((context as any).userId);
      const total = results.reduce((s, r) => s + (r.items_upserted ?? 0), 0);
      return { ok: true as const, total, results };
    } catch (e: any) {
      console.error("seedAllInventory failed:", e);
      return { ok: false as const, total: 0, results: [], error: e?.message ?? "Seeding failed" };
    }
  });

export const listCrawlerSources = createServerFn({ method: "GET" })
  .handler(async () => ({ sources: CRAWLER_SOURCES }));
