// Korapay API helpers - server-only
const KORAPAY_BASE = "https://api.korapay.com/merchant/api/v1";

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

export async function initiateKorapayCharge(input: KorapayChargeInit) {
  const secret = process.env.KORAPAY_SECRET_KEY;
  if (!secret) throw new Error("KORAPAY_SECRET_KEY is not configured");

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
    metadata: input.metadata ?? {},
    narration: input.narration ?? "iSwitchUb booking payment",
  };

  const res = await fetch(`${KORAPAY_BASE}/charges/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
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
  const secret = process.env.KORAPAY_SECRET_KEY;
  if (!secret) throw new Error("KORAPAY_SECRET_KEY is not configured");

  const res = await fetch(`${KORAPAY_BASE}/charges/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.status) {
    throw new Error(`Korapay verify failed [${res.status}]: ${JSON.stringify(json)}`);
  }
  // status values: success, failed, processing, expired
  return {
    status: json.data?.status as string,
    amount: Number(json.data?.amount ?? 0),
    currency: json.data?.currency as string,
    reference: json.data?.reference as string,
    raw: json.data,
  };
}

export function verifyKorapaySignature(rawBody: string, signature: string | null) {
  const secret = process.env.KORAPAY_WEBHOOK_SECRET || process.env.KORAPAY_SECRET_KEY;
  if (!secret || !signature) return false;
  const { createHmac, timingSafeEqual } = require("crypto") as typeof import("crypto");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
