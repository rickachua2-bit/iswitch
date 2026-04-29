import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyKorapayCharge, verifyKorapaySignature } from "@/server/korapay.server";
import { fulfilBooking } from "@/server/fulfillment.server";

export const Route = createFileRoute("/api/public/webhooks/korapay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-korapay-signature");

        if (!(await verifyKorapaySignature(body, signature))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: any;
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const reference = event?.data?.reference ?? event?.data?.payment_reference;
        const eventType = event?.event ?? "unknown";

        // Log event
        await supabaseAdmin.from("payment_events").insert({
          provider: "korapay",
          event_type: eventType,
          payment_intent_id: reference ?? null,
          payload: event,
          processed: false,
        });

        if (!reference) {
          return new Response("No reference", { status: 200 });
        }

        // Re-verify with Korapay API (don't trust webhook payload alone)
        try {
          const verified = await verifyKorapayCharge(reference);
          const { data: booking } = await supabaseAdmin
            .from("bookings_unified")
            .select("*")
            .eq("payment_intent_id", reference)
            .maybeSingle();

          if (booking && verified.status === "success" && booking.payment_status !== "paid") {
            await supabaseAdmin.from("bookings_unified").update({
              payment_status: "paid",
              paid_at: new Date().toISOString(),
            }).eq("id", booking.id);
            await fulfilBooking(booking.id);
          } else if (booking && (verified.status === "failed" || verified.status === "expired")) {
            await supabaseAdmin.from("bookings_unified").update({
              payment_status: "failed",
            }).eq("id", booking.id);
          }

          await supabaseAdmin
            .from("payment_events")
            .update({ processed: true, booking_id: booking?.id ?? null })
            .eq("payment_intent_id", reference)
            .eq("processed", false);
        } catch (e: any) {
          console.error("Korapay webhook process error:", e?.message);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
