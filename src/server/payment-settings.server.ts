// Server-only loader for active payment provider credentials.
// Reads admin-managed settings from system_settings, falls back to env vars.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PaymentMode = "sandbox" | "live";
export type PaymentProvider = "korapay" | "stripe";

export type ActiveCreds = {
  mode: PaymentMode;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
};

export async function getActiveCreds(provider: PaymentProvider): Promise<ActiveCreds> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", `payment.${provider}`)
    .maybeSingle();

  const v = (data?.value ?? {}) as Record<string, string>;
  const mode: PaymentMode = (v.mode === "live" ? "live" : "sandbox");

  const fromSettings = mode === "live"
    ? { publicKey: v.live_public_key || "", secretKey: v.live_secret_key || "", webhookSecret: v.live_webhook_secret || "" }
    : { publicKey: v.test_public_key || "", secretKey: v.test_secret_key || "", webhookSecret: v.test_webhook_secret || "" };

  // Fallback to env vars (legacy behaviour) when admin settings are blank.
  if (provider === "korapay") {
    return {
      mode,
      publicKey: fromSettings.publicKey || process.env.KORAPAY_PUBLIC_KEY || "",
      secretKey: fromSettings.secretKey || process.env.KORAPAY_SECRET_KEY || "",
      webhookSecret: fromSettings.webhookSecret || process.env.KORAPAY_WEBHOOK_SECRET || process.env.KORAPAY_SECRET_KEY || "",
    };
  }
  // stripe
  return {
    mode,
    publicKey: fromSettings.publicKey || process.env.STRIPE_PUBLISHABLE_KEY || "",
    secretKey: fromSettings.secretKey || process.env.STRIPE_SECRET_KEY || "",
    webhookSecret: fromSettings.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || "",
  };
}
