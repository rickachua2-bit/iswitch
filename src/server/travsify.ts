import { createServerFn } from "@tanstack/react-start";

const BASE = process.env.TRAVSIFY_BASE_URL || "https://travsify.com/api/v1";

function getKey() {
  const key = process.env.TRAVSIFY_API_KEY;
  if (!key) throw new Error("TRAVSIFY_API_KEY is not configured");
  return key;
}

/**
 * Translate raw upstream errors into a user-friendly message.
 * We never want to leak provider names, raw status codes or stack
 * traces into the UI.
 */
function friendlyError(status: number | null, raw: string): string {
  // Cloudflare upstream-timeout and friends.
  if (status === 522 || status === 524 || status === 504 || /timeout|timed out|aborted/i.test(raw)) {
    return "Live inventory is taking longer than usual to respond. Please try again in a moment.";
  }
  if (status === 502 || status === 503 || (status && status >= 500)) {
    return "Live inventory is temporarily unavailable. Please try again in a minute.";
  }
  if (status === 401 || status === 403) {
    return "Live inventory is temporarily unavailable. Please try again shortly.";
  }
  if (status === 429) {
    return "Too many searches in a short time. Please wait a few seconds and try again.";
  }
  if (status === 400 || status === 422) {
    return "Some of your search details were not accepted. Please review and try again.";
  }
  return "We couldn't load results right now. Please try again.";
}

const REQUEST_TIMEOUT_MS = 25_000;

async function call<T = any>(path: string, body: unknown): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const requestId = crypto.randomUUID();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": requestId,
        "X-Request-Id": requestId,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    const aborted = err?.name === "AbortError";
    const msg = aborted ? "timeout" : err?.message || "network error";
    const e = new Error(msg) as any;
    e.status = aborted ? 524 : null;
    e.requestId = requestId;
    throw e;
  }
  clearTimeout(timer);
  const upstreamReqId = res.headers.get("x-request-id") || res.headers.get("cf-ray") || requestId;
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw */
  }
  if (!res.ok) {
    const detail = json?.error?.message || json?.message || text || `HTTP ${res.status}`;
    const e = new Error(detail) as any;
    e.status = res.status;
    e.requestId = upstreamReqId;
    throw e;
  }
  return json as T;
}

async function searchCall(path: string, body: unknown): Promise<any> {
  // One retry for transient upstream issues (522/524/timeout/5xx).
  let lastErr: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res: any = await call(path, body);
      // Normalize per-vertical keys (flights/hotels/tours/visas/plans)
      // into the unified shape the UI consumes (offers/hotels/tours/visas/plans).
      const d = res?.data ?? {};
      if (d && !d.offers && Array.isArray(d.flights)) {
        d.offers = d.flights;
      }
      return { ...res, data: d };
    } catch (error: any) {
      lastErr = error;
      const status: number | null = error?.status ?? null;
      const transient = status === 522 || status === 524 || status === 504 || status === 502 || status === 503 || /timeout|aborted|network/i.test(error?.message ?? "");
      if (!transient || attempt === 1) break;
      // small backoff
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  const status: number | null = lastErr?.status ?? null;
  const requestId: string | null = lastErr?.requestId ?? null;
  const message = friendlyError(status, lastErr?.message ?? "");
  console.error("Travel search failed", { path, status, requestId, raw: lastErr?.message });
  return { data: { offers: [], hotels: [], tours: [], visas: [], plans: [] }, error: message, requestId };
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
  .handler(async ({ data }) => searchCall("/flights/search", data));

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
  .handler(async ({ data }) => searchCall("/hotels/search", data));

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
  .handler(async ({ data }) => searchCall("/tours/search", data));

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
  .handler(async ({ data }) => searchCall("/visas/search", data));

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
  .handler(async ({ data }) => searchCall("/insurance/search", data));

export const bookInsurance = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      plan_id: string;
      holder: { firstName: string; lastName: string; email: string; born_on: string };
    }) => input,
  )
  .handler(async ({ data }) => call("/insurance/bookings", data));

/* ---------------------------- TRANSFERS ---------------------------- */

export const searchTransfers = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      pickup: string;
      drop: string;
      date: string;
      time: string;
      passengers?: number;
    }) => input,
  )
  .handler(async ({ data }) => {
    const res: any = await searchCall("/transfers/search", {
      pickup_location: data.pickup,
      dropoff_location: data.drop,
      pickup_datetime: `${data.date}T${data.time || "12:00"}:00`,
      passengers: data.passengers ?? 2,
    });
    const d = res?.data ?? {};
    if (d && !d.vehicles && Array.isArray(d.transfers)) d.vehicles = d.transfers;
    if (d && !d.vehicles && Array.isArray(d.offers)) d.vehicles = d.offers;
    return { ...res, data: { ...d, vehicles: d.vehicles ?? [] } };
  });

export const bookTransfer = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      vehicle_id: string;
      passenger: { firstName: string; lastName: string; email: string; phone?: string };
    }) => input,
  )
  .handler(async ({ data }) => call("/transfers/bookings", data));
