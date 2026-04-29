import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Persists a selected offer (flight, hotel, etc.) on the server so the
 * booking page can recover it after refresh, payment redirects, or new tabs.
 * SessionStorage alone is unreliable across cross-domain payment flows.
 */

const SaveInput = z.object({
  id: z.string().min(1),
  vertical: z.string().min(1),
  payload: z.any(),
});

export const saveOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("offer_cache")
      .upsert({
        id: data.id,
        vertical: data.vertical,
        payload: data.payload,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

const GetInput = z.object({ id: z.string().min(1) });

export const getOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GetInput.parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("offer_cache")
      .select("payload, vertical")
      .eq("id", data.id)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error || !row) return { ok: false as const, error: "Offer not found or expired" };
    return { ok: true as const, payload: row.payload, vertical: row.vertical };
  });
