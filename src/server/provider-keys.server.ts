/**
 * Provider key resolver.
 *
 * Each external provider can be operated in two modes:
 *   - "live"  → uses production secrets like DUFFEL_API_KEY
 *   - "test"  → uses sandbox secrets like DUFFEL_TEST_API_KEY
 *
 * Mode resolution order:
 *   1. The provider row's `mode` column (if the provider exists in the DB)
 *   2. The global system setting `provider_mode`
 *   3. Fallback to "live"
 *
 * Falls back to the live key if the test-mode secret is missing,
 * so admins don't get locked out when only one key is configured.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ProviderMode = "test" | "live";

const KEY_MAP: Record<string, { live: string; test: string }> = {
  duffel:   { live: "DUFFEL_API_KEY",        test: "DUFFEL_TEST_API_KEY" },
  liteapi:  { live: "LITEAPI_KEY",           test: "LITEAPI_TEST_KEY" },
  travsify: { live: "TRAVSIFY_API_KEY",      test: "TRAVSIFY_TEST_API_KEY" },
  booking:  { live: "RAPIDAPI_BOOKING_KEY",  test: "RAPIDAPI_BOOKING_KEY" },
};

let cachedGlobal: { mode: ProviderMode; at: number } | null = null;

export async function getGlobalMode(): Promise<ProviderMode> {
  if (cachedGlobal && Date.now() - cachedGlobal.at < 30_000) return cachedGlobal.mode;
  const { data } = await supabaseAdmin
    .from("system_settings").select("value").eq("key", "provider_mode").maybeSingle();
  const v = (data?.value as string) ?? "live";
  const mode: ProviderMode = v === "test" ? "test" : "live";
  cachedGlobal = { mode, at: Date.now() };
  return mode;
}

export function invalidateModeCache() { cachedGlobal = null; }

export async function getProviderMode(slug: string): Promise<ProviderMode> {
  const { data } = await supabaseAdmin
    .from("providers").select("mode").eq("slug", slug).maybeSingle();
  if (data?.mode === "test" || data?.mode === "live") return data.mode;
  return getGlobalMode();
}

/** Returns the API key string for a provider, honoring its current mode.
 *  Falls back to the live key if the test key is not configured. */
export async function getProviderKey(slug: keyof typeof KEY_MAP): Promise<string | null> {
  const map = KEY_MAP[slug];
  if (!map) return null;
  const mode = await getProviderMode(slug);
  const primary = mode === "test" ? process.env[map.test] : process.env[map.live];
  if (primary) return primary;
  // graceful fallback
  return process.env[map.live] ?? process.env[map.test] ?? null;
}

export function isKeyConfigured(slug: keyof typeof KEY_MAP, mode: ProviderMode): boolean {
  const map = KEY_MAP[slug];
  if (!map) return false;
  return !!process.env[mode === "test" ? map.test : map.live];
}
