import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { initiateKorapayCharge, verifyKorapayCharge } from "./korapay.server";
import { fulfilBooking } from "./fulfillment.server";
import { getRequestHost } from "@tanstack/react-start/server";

const CreatePaymentInput = z.object({
  bookingId: z.string().uuid(),
});

export const createPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreatePaymentInput.parse(d))
  .handler(async ({ data }) => {
    const { data: booking, error } = await supabaseAdmin
      .from("bookings_unified")
      .select("*")
      .eq("id", data.bookingId)
      .maybeSingle();

    if (error || !booking) {
      return { ok: false as const, error: "Booking not found" };
    }
    if (booking.payment_status === "paid") {
      return { ok: false as const, error: "Booking already paid" };
    }

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;
    // Korapay reference: alphanumeric + hyphens only (no underscores)
    const reference = `bk-${booking.id.replace(/-/g, "").slice(0, 16)}-${Date.now()}`;

    // Korapay live merchants only accept a limited set of currencies.
    // Convert unsupported currencies (e.g. EUR, GBP) to NGN using rate_to_usd.
    const KORAPAY_SUPPORTED = new Set(["NGN", "KES", "GHS", "USD"]);
    let chargeAmount = Number(booking.amount);
    let chargeCurrency = String(booking.currency || "USD").toUpperCase();

    if (!KORAPAY_SUPPORTED.has(chargeCurrency)) {
      // Look up FX: source currency -> USD -> NGN
      const { data: rates } = await supabaseAdmin
        .from("currencies")
        .select("code, rate_to_usd")
        .in("code", [chargeCurrency, "NGN"]);
      const src = rates?.find((r) => r.code === chargeCurrency)?.rate_to_usd;
      const ngn = rates?.find((r) => r.code === "NGN")?.rate_to_usd;
      if (src && ngn) {
        const usd = chargeAmount / Number(src);
        chargeAmount = Math.round(usd * Number(ngn) * 100) / 100;
        chargeCurrency = "NGN";
      } else {
        return { ok: false as const, error: `Currency ${chargeCurrency} not supported by Korapay and FX rate unavailable.` };
      }
    }

    try {
      const charge = await initiateKorapayCharge({
        amount: chargeAmount,
        currency: chargeCurrency,
        reference,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        redirectUrl: `${origin}/checkout/return?booking=${booking.id}&ref=${reference}`,
        notificationUrl: `${origin}/api/public/webhooks/korapay`,
        metadata: { booking_id: booking.id, vertical: booking.vertical, original_amount: booking.amount, original_currency: booking.currency },
      });

      await supabaseAdmin.from("bookings_unified").update({
        payment_provider: "korapay",
        payment_intent_id: charge.reference,
        payment_status: "processing",
      }).eq("id", booking.id);

      return { ok: true as const, checkoutUrl: charge.checkoutUrl, reference: charge.reference };
    } catch (e: any) {
      console.error("createPayment error:", e?.message);
      return { ok: false as const, error: e?.message ?? "Payment init failed" };
    }
  });

const VerifyInput = z.object({ reference: z.string().min(3) });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => VerifyInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const result = await verifyKorapayCharge(data.reference);
      const { data: booking } = await supabaseAdmin
        .from("bookings_unified")
        .select("*")
        .eq("payment_intent_id", data.reference)
        .maybeSingle();

      if (!booking) return { ok: false as const, error: "Booking not found for reference" };

      if (result.status === "success" && booking.payment_status !== "paid") {
        await supabaseAdmin.from("bookings_unified").update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        }).eq("id", booking.id);

        // Auto-fulfil
        await fulfilBooking(booking.id);
      } else if (result.status === "failed" || result.status === "expired") {
        await supabaseAdmin.from("bookings_unified").update({
          payment_status: "failed",
        }).eq("id", booking.id);
      }

      const { data: refreshed } = await supabaseAdmin
        .from("bookings_unified")
        .select("id, payment_status, fulfillment_status, status, external_reference")
        .eq("id", booking.id)
        .single();

      return { ok: true as const, payment: result, booking: refreshed };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "Verify failed" };
    }
  });
