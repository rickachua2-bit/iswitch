import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VERTICALS = ["flights", "stays", "visas", "insurance", "tours", "pickups"] as const;
const KINDS = ["api", "crawl"] as const;
const Choice = z.enum(["default", "travsify"]);
const RoutingSchema = z.object(
  Object.fromEntries(VERTICALS.map((v) => [v, Choice])) as Record<(typeof VERTICALS)[number], typeof Choice>,
);

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin access required.");
}

// ============ ROUTING (existing) ============
export const getApiProviderRouting = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("system_settings").select("value").eq("key", "provider_routing").maybeSingle();
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

// ============ PROVIDERS CRUD ============
export const listProviders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("providers")
      .select("id, slug, name, vertical, kind, base_url, enabled, notes, total_calls, total_errors, last_ok_at, last_error_at, last_error, created_at, updated_at")
      .order("vertical", { ascending: true })
      .order("name", { ascending: true });
    if (error) return { ok: false as const, error: error.message, providers: [] as any[] };
    return { ok: true as const, providers: data ?? [] };
  });

const ProviderInput = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, dashes only"),
  name: z.string().min(2).max(120),
  vertical: z.enum(VERTICALS),
  kind: z.enum(KINDS),
  base_url: z.string().url().optional().or(z.literal("")),
  enabled: z.boolean().default(true),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const createProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProviderInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("providers")
      .insert({ ...data, base_url: data.base_url || null, notes: data.notes || null })
      .select().single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, provider: row };
  });

export const updateProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProviderInput.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const clean: any = { ...patch, updated_at: new Date().toISOString() };
    if ("base_url" in clean) clean.base_url = clean.base_url || null;
    if ("notes" in clean) clean.notes = clean.notes || null;
    const { error } = await supabaseAdmin.from("providers").update(clean).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("providers").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============ INVENTORY (per-provider listings) ============
export const listProviderInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ providerId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const [{ data: provider }, { data: items, error }] = await Promise.all([
      supabaseAdmin.from("providers").select("*").eq("id", data.providerId).maybeSingle(),
      supabaseAdmin.from("inventory_items")
        .select("id, title, subtitle, description, vertical, origin, destination, price, currency, duration, validity, source_url, is_active, last_seen_at, created_at, updated_at")
        .eq("provider_id", data.providerId)
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);
    if (error) return { ok: false as const, error: error.message, provider: null, items: [] as any[] };
    return { ok: true as const, provider, items: items ?? [] };
  });

const InventoryInput = z.object({
  provider_id: z.string().uuid(),
  vertical: z.enum(VERTICALS),
  title: z.string().min(2).max(200),
  subtitle: z.string().max(300).optional().or(z.literal("")),
  description: z.string().max(4000).optional().or(z.literal("")),
  origin: z.string().max(120).optional().or(z.literal("")),
  destination: z.string().max(120).optional().or(z.literal("")),
  price: z.number().nonnegative().nullable().optional(),
  currency: z.string().min(3).max(3).default("USD"),
  duration: z.string().max(80).optional().or(z.literal("")),
  validity: z.string().max(80).optional().or(z.literal("")),
  source_url: z.string().url().optional().or(z.literal("")),
  is_active: z.boolean().default(true),
});

export const createInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InventoryInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const payload: any = { ...data };
    for (const k of ["subtitle","description","origin","destination","duration","validity","source_url"]) {
      if (payload[k] === "") payload[k] = null;
    }
    const { data: row, error } = await supabaseAdmin.from("inventory_items").insert(payload).select().single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, item: row };
  });

export const updateInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InventoryInput.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { id, ...patch } = data;
    const clean: any = { ...patch, updated_at: new Date().toISOString() };
    for (const k of ["subtitle","description","origin","destination","duration","validity","source_url"]) {
      if (clean[k] === "") clean[k] = null;
    }
    const { error } = await supabaseAdmin.from("inventory_items").update(clean).eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const deleteInventoryItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("inventory_items").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ============ TEST PROVIDER (health probe) ============
export const testProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: prov } = await supabaseAdmin
      .from("providers").select("id, slug, kind, base_url").eq("id", data.id).maybeSingle();
    if (!prov) return { ok: false as const, error: "Provider not found" };

    const t0 = Date.now();
    let status: number | null = null;
    let ok = false;
    let message = "";

    try {
      if (prov.slug === "duffel") {
        const key = process.env.DUFFEL_API_KEY;
        if (!key) throw new Error("DUFFEL_API_KEY not configured");
        const r = await fetch("https://api.duffel.com/air/airlines?limit=1", {
          headers: { Authorization: `Bearer ${key}`, "Duffel-Version": "v2", Accept: "application/json" },
        });
        status = r.status; ok = r.ok;
        message = r.ok ? "Duffel API responding" : (await r.text()).slice(0, 200);
      } else if (prov.slug === "liteapi") {
        const key = process.env.LITEAPI_KEY;
        if (!key) throw new Error("LITEAPI_KEY not configured");
        const r = await fetch("https://api.liteapi.travel/v3.0/data/countries", {
          headers: { "X-API-Key": key, Accept: "application/json" },
        });
        status = r.status; ok = r.ok;
        message = r.ok ? "LiteAPI responding" : (await r.text()).slice(0, 200);
      } else if (prov.kind === "crawl" && prov.base_url) {
        const r = await fetch(prov.base_url, { method: "HEAD", redirect: "follow" });
        status = r.status; ok = r.status < 400;
        message = ok ? "Source URL reachable" : `HTTP ${r.status}`;
      } else if (prov.base_url) {
        const r = await fetch(prov.base_url, { method: "HEAD", redirect: "follow" });
        status = r.status; ok = r.status < 500;
        message = `HTTP ${r.status}`;
      } else {
        return { ok: false as const, error: "No base URL configured for this provider." };
      }
    } catch (e: any) {
      message = String(e?.message ?? e).slice(0, 300);
    }

    const latency = Date.now() - t0;
    await supabaseAdmin.from("provider_health_events").insert({
      provider_id: prov.id, ok, status_code: status, latency_ms: latency, message,
    });
    await supabaseAdmin.from("providers").update({
      total_calls: undefined, // updated atomically below via rpc-less increment
      last_ok_at: ok ? new Date().toISOString() : undefined,
      last_error_at: ok ? undefined : new Date().toISOString(),
      last_error: ok ? null : message,
    }).eq("id", prov.id);

    return { ok: true as const, healthy: ok, status, latency, message };
  });
