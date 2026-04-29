// Admin-managed payment provider credentials (test + live).
// Stored in system_settings under keys: payment.korapay, payment.stripe.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentMode = "sandbox" | "live";
export type PaymentProvider = "korapay" | "stripe";

export type PaymentProviderSettings = {
  mode: PaymentMode;
  test_public_key: string;
  test_secret_key: string;
  test_webhook_secret: string;
  live_public_key: string;
  live_secret_key: string;
  live_webhook_secret: string;
};

const EMPTY: PaymentProviderSettings = {
  mode: "sandbox",
  test_public_key: "",
  test_secret_key: "",
  test_webhook_secret: "",
  live_public_key: "",
  live_secret_key: "",
  live_webhook_secret: "",
};

const SettingsSchema = z.object({
  mode: z.enum(["sandbox", "live"]).default("sandbox"),
  test_public_key: z.string().default(""),
  test_secret_key: z.string().default(""),
  test_webhook_secret: z.string().default(""),
  live_public_key: z.string().default(""),
  live_secret_key: z.string().default(""),
  live_webhook_secret: z.string().default(""),
});

function settingsKey(provider: PaymentProvider) {
  return `payment.${provider}`;
}

async function ensureAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Admin access required");
}

export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const providers: PaymentProvider[] = ["korapay", "stripe"];
    const out: Record<PaymentProvider, PaymentProviderSettings> = {
      korapay: { ...EMPTY },
      stripe: { ...EMPTY },
    };
    for (const p of providers) {
      const { data } = await supabaseAdmin
        .from("system_settings")
        .select("value")
        .eq("key", settingsKey(p))
        .maybeSingle();
      if (data?.value) {
        const parsed = SettingsSchema.safeParse(data.value);
        if (parsed.success) out[p] = parsed.data as PaymentProviderSettings;
      }
    }
    // Mask secrets when returning to the client (UI just needs to know if set)
    const masked: Record<PaymentProvider, PaymentProviderSettings & { _masked: true }> = {} as never;
    for (const p of providers) {
      const s = out[p];
      masked[p] = {
        mode: s.mode,
        test_public_key: s.test_public_key,
        test_secret_key: s.test_secret_key ? `••••${s.test_secret_key.slice(-4)}` : "",
        test_webhook_secret: s.test_webhook_secret ? `••••${s.test_webhook_secret.slice(-4)}` : "",
        live_public_key: s.live_public_key,
        live_secret_key: s.live_secret_key ? `••••${s.live_secret_key.slice(-4)}` : "",
        live_webhook_secret: s.live_webhook_secret ? `••••${s.live_webhook_secret.slice(-4)}` : "",
        _masked: true,
      };
    }
    return { ok: true as const, settings: masked };
  });

const SaveInput = z.object({
  provider: z.enum(["korapay", "stripe"]),
  mode: z.enum(["sandbox", "live"]),
  // Only fields the admin chose to update. Empty string = leave unchanged
  // (so masked secrets aren't accidentally overwritten).
  test_public_key: z.string().optional(),
  test_secret_key: z.string().optional(),
  test_webhook_secret: z.string().optional(),
  live_public_key: z.string().optional(),
  live_secret_key: z.string().optional(),
  live_webhook_secret: z.string().optional(),
});

export const savePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const key = settingsKey(data.provider);
    const { data: existing } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    const current: PaymentProviderSettings = existing?.value
      ? { ...EMPTY, ...(existing.value as Record<string, unknown>) } as PaymentProviderSettings
      : { ...EMPTY };

    const merged: PaymentProviderSettings = {
      mode: data.mode,
      test_public_key: data.test_public_key ?? current.test_public_key,
      test_secret_key: data.test_secret_key && data.test_secret_key.length > 0
        ? data.test_secret_key : current.test_secret_key,
      test_webhook_secret: data.test_webhook_secret && data.test_webhook_secret.length > 0
        ? data.test_webhook_secret : current.test_webhook_secret,
      live_public_key: data.live_public_key ?? current.live_public_key,
      live_secret_key: data.live_secret_key && data.live_secret_key.length > 0
        ? data.live_secret_key : current.live_secret_key,
      live_webhook_secret: data.live_webhook_secret && data.live_webhook_secret.length > 0
        ? data.live_webhook_secret : current.live_webhook_secret,
    };

    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert({
        key,
        value: merged,
        description: `Payment provider credentials (${data.provider})`,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
