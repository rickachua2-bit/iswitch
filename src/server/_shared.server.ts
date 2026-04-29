// Shared server-side helpers (NOT a serverFn file — only imported by *.functions.ts)
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const REQ_TIMEOUT_MS = 25_000;

export function friendlyError(status: number | null, raw: string): string {
  if (status === 522 || status === 524 || status === 504 || /timeout|timed out|aborted/i.test(raw)) {
    return "Live inventory is taking longer than usual to respond. Please try again in a moment.";
  }
  if (status === 502 || status === 503 || (status && status >= 500)) {
    return "Live inventory is temporarily unavailable. Please try again in a minute.";
  }
  if (status === 401 || status === 403) return "Live inventory is temporarily unavailable. Please try again shortly.";
  if (status === 429) return "Too many searches in a short time. Please wait a few seconds and try again.";
  if (status === 400 || status === 422) return "Some of your search details were not accepted. Please review and try again.";
  return "We couldn't load results right now. Please try again.";
}

export async function recordHealth(providerSlug: string, ok: boolean, statusCode: number | null, latencyMs: number, message?: string) {
  try {
    const { data: prov } = await supabaseAdmin.from("providers").select("id, total_calls, total_errors").eq("slug", providerSlug).maybeSingle();
    if (!prov) return;
    await supabaseAdmin.from("provider_health_events").insert({
      provider_id: prov.id, ok, status_code: statusCode, latency_ms: latencyMs, message: message ?? null,
    });
    await supabaseAdmin.from("providers").update({
      total_calls: (prov.total_calls ?? 0) + 1,
      total_errors: (prov.total_errors ?? 0) + (ok ? 0 : 1),
      last_ok_at: ok ? new Date().toISOString() : undefined,
      last_error_at: ok ? undefined : new Date().toISOString(),
      last_error: ok ? null : (message ?? null),
    }).eq("id", prov.id);
  } catch (e) {
    console.error("recordHealth failed:", e);
  }
}

export async function timedFetch(providerSlug: string, url: string, init: RequestInit): Promise<{ status: number; text: string; ms: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    const ms = Date.now() - t0;
    await recordHealth(providerSlug, res.ok, res.status, ms, res.ok ? undefined : text.slice(0, 200));
    return { status: res.status, text, ms };
  } catch (e: any) {
    const ms = Date.now() - t0;
    await recordHealth(providerSlug, false, null, ms, String(e?.message ?? e));
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
