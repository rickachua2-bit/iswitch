// Fulfillment helpers - auto-confirm flights/hotels, mark others manual
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DUFFEL_BASE = "https://api.duffel.com";
const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";

async function fulfilFlight(bookingId: string, payload: any) {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) return { ok: false, error: "DUFFEL_API_KEY missing" };

  const offerId = payload?.duffel_offer_id ?? payload?.offer_id;
  const passengers = payload?.passengers ?? [];
  if (!offerId || !passengers.length) {
    return { ok: false, error: "Missing offer_id or passengers in payload" };
  }

  const res = await fetch(`${DUFFEL_BASE}/air/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        type: "instant",
        selected_offers: [offerId],
        passengers,
        payments: [{ type: "balance", amount: payload.amount, currency: payload.currency }],
      },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: `Duffel: ${JSON.stringify(json)}` };
  return { ok: true, confirmation: json.data, externalRef: json.data?.booking_reference };
}

async function fulfilHotel(bookingId: string, payload: any) {
  const key = process.env.LITEAPI_KEY;
  if (!key) return { ok: false, error: "LITEAPI_KEY missing" };

  const rateId = payload?.lite_rate_id ?? payload?.rate_id;
  const guests = payload?.guests ?? [];
  const holder = payload?.holder ?? {};
  if (!rateId || !guests.length) {
    return { ok: false, error: "Missing rate_id or guests in payload" };
  }

  // Step 1: prebook
  const pre = await fetch(`${LITEAPI_BASE}/rates/prebook`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ rateId, voucher: null }),
  });
  const preJson = await pre.json().catch(() => ({}));
  if (!pre.ok) return { ok: false, error: `LiteAPI prebook: ${JSON.stringify(preJson)}` };
  const prebookId = preJson.data?.prebookId;
  if (!prebookId) return { ok: false, error: "No prebookId returned" };

  // Step 2: book
  const book = await fetch(`${LITEAPI_BASE}/rates/book`, {
    method: "POST",
    headers: { "X-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      prebookId,
      holder,
      guests,
      payment: { method: "ACC_CREDIT_CARD" },
      clientReference: bookingId,
    }),
  });
  const bookJson = await book.json().catch(() => ({}));
  if (!book.ok) return { ok: false, error: `LiteAPI book: ${JSON.stringify(bookJson)}` };
  return { ok: true, confirmation: bookJson.data, externalRef: bookJson.data?.bookingId };
}

export async function fulfilBooking(bookingId: string) {
  const { data: booking } = await supabaseAdmin
    .from("bookings_unified")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) return { ok: false, error: "Booking not found" };

  let result: { ok: boolean; error?: string; confirmation?: any; externalRef?: string };

  if (booking.vertical === "flights") {
    result = await fulfilFlight(bookingId, { ...booking.payload, amount: booking.amount, currency: booking.currency });
  } else if (booking.vertical === "stays") {
    result = await fulfilHotel(bookingId, { ...booking.payload, amount: booking.amount, currency: booking.currency });
  } else {
    // visas, insurance, tours, pickups - manual fulfillment
    await supabaseAdmin.from("bookings_unified").update({
      fulfillment_status: "manual_pending",
      status: "confirmed",
    }).eq("id", bookingId);
    return { ok: true, manual: true };
  }

  await supabaseAdmin.from("bookings_unified").update({
    fulfillment_status: result.ok ? "auto_confirmed" : "failed",
    status: result.ok ? "confirmed" : "failed",
    external_reference: result.externalRef ?? booking.external_reference,
    provider_confirmation: result.confirmation ?? null,
    error: result.ok ? null : result.error,
  }).eq("id", bookingId);

  return result;
}
