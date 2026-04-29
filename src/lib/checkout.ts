// Client-side helper: create booking + start payment + redirect to Korapay.
import { createUnifiedBooking } from "@/server/bookings.functions";
import { createPayment } from "@/server/payments.functions";

export type CheckoutInput = {
  vertical: "flights" | "stays" | "visas" | "insurance" | "tours" | "pickups";
  provider_slug: string;
  amount: number;
  currency: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  external_reference?: string;
  inventory_item_id?: string;
  payload?: Record<string, any>;
};

export async function startCheckout(input: CheckoutInput): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const created = await createUnifiedBooking({ data: input });
  if (!created.ok) return { ok: false, error: created.error };

  const pay = await createPayment({ data: { bookingId: created.booking!.id } });
  if (!pay.ok) return { ok: false, error: pay.error };

  return { ok: true, checkoutUrl: pay.checkoutUrl };
}
