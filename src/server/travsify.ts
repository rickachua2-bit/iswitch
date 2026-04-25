import { createServerFn } from "@tanstack/react-start";

const BASE = process.env.TRAVSIFY_BASE_URL || "https://travsifyndc.lovable.app/api/v1";

function getKey() {
  const key = process.env.TRAVSIFY_API_KEY;
  if (!key) throw new Error("TRAVSIFY_API_KEY is not configured");
  return key;
}

async function call<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw */
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || text || `HTTP ${res.status}`;
    throw new Error(`Travsify ${path} ${res.status}: ${msg}`);
  }
  return json as T;
}

/* ----------------------------- FLIGHTS ----------------------------- */

export const searchFlights = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      origin?: string;
      destination?: string;
      departure_date?: string;
      return_date?: string;
      segments?: Array<{ origin: string; destination: string; departure_date: string }>;
      adults: number;
      children?: number;
      infants?: number;
      cabin?: string;
    }) => input,
  )
  .handler(async ({ data }) => call("/flights/search", data));

export const bookFlight = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      offer_id: string;
      passengers: Array<Record<string, string>>;
    }) => input,
  )
  .handler(async ({ data }) => call("/flights/orders", data));

/* ------------------------------ HOTELS ----------------------------- */

export const searchHotels = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      country_code: string;
      checkin: string;
      checkout: string;
      adults: number;
      currency?: string;
    }) => input,
  )
  .handler(async ({ data }) => call("/hotels/search", data));

export const bookHotel = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      offer_id: string;
      holder: { firstName: string; lastName: string; email: string };
      guests: Array<{ firstName: string; lastName: string }>;
    }) => input,
  )
  .handler(async ({ data }) => call("/hotels/bookings", data));

/* ------------------------------ TOURS ------------------------------ */

export const searchTours = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { destination: string; date: string; participants: number }) => input,
  )
  .handler(async ({ data }) => call("/tours/search", data));

export const bookTour = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      tour_id: string;
      participants: Array<{ firstName: string; lastName: string; email: string }>;
    }) => input,
  )
  .handler(async ({ data }) => call("/tours/bookings", data));

/* ------------------------------ VISAS ------------------------------ */

export const searchVisas = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { nationality: string; destination: string; purpose: string }) => input,
  )
  .handler(async ({ data }) => call("/visas/search", data));

export const bookVisa = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      visa_id: string;
      applicant: { firstName: string; lastName: string; email: string; passport: string };
    }) => input,
  )
  .handler(async ({ data }) => call("/visas/bookings", data));

/* --------------------------- INSURANCE ----------------------------- */

export const searchInsurance = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      nationality: string;
      destination: string;
      start_date: string;
      end_date: string;
      travelers: number;
    }) => input,
  )
  .handler(async ({ data }) => call("/insurance/search", data));

export const bookInsurance = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      plan_id: string;
      holder: { firstName: string; lastName: string; email: string; born_on: string };
    }) => input,
  )
  .handler(async ({ data }) => call("/insurance/bookings", data));
