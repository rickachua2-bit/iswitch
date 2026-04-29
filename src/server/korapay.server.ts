// Korapay API helpers - server-only
import { createHmac, timingSafeEqual } from "node:crypto";
import { getActiveCreds } from "./payment-settings.server";

const KORAPAY_BASE_LIVE = "https://api.korapay.com/merchant/api/v1";
const KORAPAY_BASE_SANDBOX = "https://api.korapay.com/merchant/api/v1"; // Korapay uses same base; mode = which key

export type KorapayChargeInit = {
  amount: number;
  currency: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  redirectUrl: string;
  notificationUrl?: string;
  metadata?: Record<string, any>;
  narration?: string;
};

async function getKorapayKey() {
  const creds = await getActiveCreds("korapay");
  if (!creds.secretKey) throw new Error("Korapay secret key is not configured. Add it in Admin → Payment Providers.");
  return creds;
}

export async function initiateKorapayCharge(input: KorapayChargeInit) {
  const { secretKey, mode } = await getKorapayKey();

  const body = {
    amount: input.amount,
    currency: input.currency,
    reference: input.reference,
    redirect_url: input.redirectUrl,
    notification_url: input.notificationUrl,
    customer: {
      name: input.customerName,
      email: input.customerEmail,
    },
    metadata: { ...(input.metadata ?? {}), _mode: mode },
    narration: input.narration ?? "iSwitchUb booking payment",
  };

  const base = mode === "live" ? KORAPAY_BASE_LIVE : KORAPAY_BASE_SANDBOX;
  const res = await fetch(`${base}/charges/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.status) {
    throw new Error(`Korapay init failed [${res.status}]: ${JSON.stringify(json)}`);
  }
  return {
    checkoutUrl: json.data?.checkout_url as string,
    reference: json.data?.reference as string,
    raw: json.data,
  };
}

export async function verifyKorapayCharge(reference: string) {
  const { secretKey, mode } = await getKorapayKey();
  const base = mode === "live" ? KORAPAY_BASE_LIVE : KORAPAY_BASE_SANDBOX;
  const res = await fetch(`${base}/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.status) {
    throw new Error(`Korapay verify failed [${res.status}]: ${JSON.stringify(json)}`);
  }
  return {
    status: json.data?.status as string,
    amount: Number(json.data?.amount ?? 0),
    currency: json.data?.currency as string,
    reference: json.data?.reference as string,
    raw: json.data,
  };
}

export async function verifyKorapaySignature(rawBody: string, signature: string | null) {
  const creds = await getActiveCreds("korapay");
  const secret = creds.webhookSecret || creds.secretKey;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
