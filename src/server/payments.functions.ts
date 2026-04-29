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
    const reference = `bk_${booking.id.replace(/-/g, "").slice(0, 16)}_${Date.now()}`;

    try {
      const charge = await initiateKorapayCharge({
        amount: Number(booking.amount),
        currency: booking.currency,
        reference,
        customerName: booking.customer_name,
        customerEmail: booking.customer_email,
        redirectUrl: `${origin}/checkout/return?booking=${booking.id}&ref=${reference}`,
        notificationUrl: `${origin}/api/public/webhooks/korapay`,
        metadata: { booking_id: booking.id, vertical: booking.vertical },
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
