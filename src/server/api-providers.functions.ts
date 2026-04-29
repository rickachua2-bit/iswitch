import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VERTICALS = ["flights", "stays", "visas", "insurance", "tours", "pickups"] as const;
const Choice = z.enum(["default", "travsify"]);
const RoutingSchema = z.object(
  Object.fromEntries(VERTICALS.map((v) => [v, Choice])) as Record<(typeof VERTICALS)[number], typeof Choice>,
);

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin access required.");
}

export const getApiProviderRouting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "provider_routing")
      .maybeSingle();
    const fallback = Object.fromEntries(VERTICALS.map((v) => [v, "default"])) as Record<string, string>;
    const routing = { ...fallback, ...((data?.value as Record<string, string>) ?? {}) };
    return {
      routing,
      travsifyConfigured: !!process.env.TRAVSIFY_API_KEY,
      providers: {
        flights: { default: "Duffel", travsify: "Travsify" },
        stays: { default: "LiteAPI", travsify: "Travsify" },
        visas: { default: "Crawled inventory", travsify: "Travsify" },
        insurance: { default: "Crawled inventory", travsify: "Travsify" },
        tours: { default: "Crawled inventory", travsify: "Travsify" },
        pickups: { default: "Crawled inventory", travsify: "Travsify" },
      },
    };
  });

export const updateApiProviderRouting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RoutingSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("system_settings")
      .update({ value: data, updated_at: new Date().toISOString(), updated_by: context.userId })
      .eq("key", "provider_routing");
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
