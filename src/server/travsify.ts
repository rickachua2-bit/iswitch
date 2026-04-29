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

async function call<T = any>(path: string, body: unknown, method: "POST" | "GET" = "POST"): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  const requestId = crypto.randomUUID();
  let res: Response;
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${getKey()}`,
      "X-Request-Id": requestId,
    };
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      headers["Idempotency-Key"] = requestId;
    }
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(body) : undefined,
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
    const detail =
      json?.error?.message ||
      json?.message ||
      (Array.isArray(json?.error?.details)
        ? json.error.details.map((d: any) => d?.message).filter(Boolean).join("; ")
        : null) ||
      text ||
      `HTTP ${res.status}`;
    const e = new Error(detail) as any;
    e.status = res.status;
    e.requestId = upstreamReqId;
    throw e;
  }
  return json as T;
}

/** Normalize per-vertical response keys into the unified shape the UI consumes. */
function normalizeData(d: any) {
  d = d ?? {};
  if (!d.offers && Array.isArray(d.flights)) d.offers = d.flights;
  if (!d.offers && Array.isArray(d.results)) d.offers = d.results;
  if (!d.hotels && Array.isArray(d.properties)) d.hotels = d.properties;
  if (!d.tours && Array.isArray(d.experiences)) d.tours = d.experiences;
  if (!d.tours && Array.isArray(d.activities)) d.tours = d.activities;
  if (!d.visas && Array.isArray(d.options)) d.visas = d.options;
  if (!d.plans && Array.isArray(d.policies)) d.plans = d.policies;
  if (!d.vehicles && Array.isArray(d.transfers)) d.vehicles = d.transfers;
  if (!d.vehicles && Array.isArray(d.cars)) d.vehicles = d.cars;
  return d;
}

async function searchCall(path: string, body: unknown): Promise<any> {
  // One retry for transient upstream issues (522/524/timeout/5xx).
  let lastErr: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res: any = await call(path, body);
      const d = normalizeData(res?.data ?? {});
      const warn = res?.warning;
      // Per spec: warning.fallback === true => upstream flaky, treat as
      // "try again shortly" UX message but still return any partial data.
      let warningMsg: string | null = null;
      if (warn?.fallback === true) {
        warningMsg = "Live inventory for this search is temporarily unavailable. Please try again shortly.";
      } else if (warn?.code === "search_unavailable") {
        warningMsg = "Live inventory for this route is temporarily unavailable. Please try again shortly.";
      } else if (warn?.message) {
        warningMsg = warn.message;
      }
      return { ...res, data: d, error: warningMsg };
    } catch (error: any) {
      lastErr = error;
      const status: number | null = error?.status ?? null;
      const transient =
        status === 522 || status === 524 || status === 504 || status === 502 || status === 503 ||
        /timeout|aborted|network/i.test(error?.message ?? "");
      if (!transient || attempt === 1) break;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  const status: number | null = lastErr?.status ?? null;
  const requestId: string | null = lastErr?.requestId ?? null;
  const message = friendlyError(status, lastErr?.message ?? "");
  console.error("Travel search failed", { path, status, requestId, raw: lastErr?.message });
  return {
    data: { offers: [], hotels: [], tours: [], visas: [], plans: [], vehicles: [] },
    error: message,
    requestId,
  };
}

/* ------------------------------ CATALOG ---------------------------- */
/**
 * Live catalog of supported countries/cities per vertical.
 * Per integration brief: never hard-code countries — fetch from /catalog.
 */
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const res: any = await call("/catalog", null, "GET");
    return { data: res?.data ?? res ?? {}, error: null as string | null };
  } catch (err: any) {
    const message = friendlyError(err?.status ?? null, err?.message ?? "");
    return { data: {}, error: message };
  }
});

/* ----------------------------- FLIGHTS ----------------------------- */

/**
 * Start a flight search. Returns a `search_id` quickly so the client can
 * poll `pollFlightSearch` instead of holding the edge worker open past
 * the 25s upstream timeout.
 */
export const startFlightSearch = createServerFn({ method: "POST" })
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
  .handler(async ({ data }) => {
    // Reshape to Travsify spec: passengers object + cabin_class.
    const payload: Record<string, unknown> = {
      origin: data.origin,
      destination: data.destination,
      departure_date: data.departure_date,
      return_date: data.return_date || undefined,
      segments: data.segments,
      passengers: {
        adults: Math.max(1, Number(data.adults) || 1),
        children: Number(data.children) || 0,
        infants: Number(data.infants) || 0,
      },
      cabin_class: data.cabin || "economy",
    };
    try {
      const res: any = await call("/flights/search", payload);
      const inline = normalizeData(res?.data ?? res ?? {});
      const search_id: string | undefined =
        inline.search_id || inline.id || res?.search_id || res?.id;
      const hasInlineOffers = Array.isArray(inline.offers) && inline.offers.length > 0;
      if (!search_id && !hasInlineOffers) {
        return { search_id: null, data: { offers: [] }, error: "No results returned." };
      }
      return { search_id: search_id ?? null, data: inline, error: null };
    } catch (err: any) {
      const status: number | null = err?.status ?? null;
      const requestId: string | null = err?.requestId ?? null;
      const message = friendlyError(status, err?.message ?? "");
      console.error("Flight search start failed", { status, requestId, raw: err?.message });
      return { search_id: null, data: { offers: [] }, error: message, requestId };
    }
  });

export const pollFlightSearch = createServerFn({ method: "POST" })
  .inputValidator((input: { search_id: string }) => input)
  .handler(async ({ data }) => {
    try {
      const res: any = await call(`/flights/search/${encodeURIComponent(data.search_id)}`, null, "GET");
      const payload = normalizeData(res?.data ?? res ?? {});
      const rawStatus: string =
        payload.status || res?.status || (Array.isArray(payload.offers) ? "completed" : "processing");
      // Travsify uses "succeeded"/"complete"/"done" — normalize to "completed".
      // "queued"/"running"/"in_progress" -> "processing". "error"/"cancelled" -> "failed".
      const s = String(rawStatus).toLowerCase();
      const status =
        ["completed", "complete", "succeeded", "success", "done", "finished"].includes(s)
          ? "completed"
          : ["failed", "error", "errored", "cancelled", "canceled", "expired"].includes(s)
            ? "failed"
            : "processing";
      return { status, data: payload, error: null };
    } catch (err: any) {
      const status: number | null = err?.status ?? null;
      const requestId: string | null = err?.requestId ?? null;
      const message = friendlyError(status, err?.message ?? "");
      console.error("Flight search poll failed", { status, requestId, raw: err?.message });
      return { status: "failed", data: { offers: [] }, error: message, requestId };
    }
  });

/** @deprecated Prefer startFlightSearch + pollFlightSearch. */
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
  .handler(async ({ data }) =>
    searchCall("/flights/search", {
      origin: data.origin,
      destination: data.destination,
      departure_date: data.departure_date,
      return_date: data.return_date || undefined,
      segments: data.segments,
      passengers: {
        adults: Math.max(1, Number(data.adults) || 1),
        children: Number(data.children) || 0,
        infants: Number(data.infants) || 0,
      },
      cabin_class: data.cabin || "economy",
    }),
  );

export const bookFlight = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { offer_id: string; passengers: Array<Record<string, string>> }) => input,
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
      children?: number;
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
  .handler(async ({ data }) => {
    // Map UI shape -> Travsify guest object.
    return call("/hotels/bookings", {
      offer_id: data.offer_id,
      guest: {
        first_name: data.holder.firstName,
        last_name: data.holder.lastName,
        email: data.holder.email,
      },
      additional_guests: (data.guests || []).map((g) => ({
        first_name: g.firstName,
        last_name: g.lastName,
      })),
    });
  });

/* ------------------------------ TOURS ------------------------------ */

export const searchTours = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { destination: string; date: string; participants: number }) => input,
  )
  .handler(async ({ data }) =>
    searchCall("/tours/search", {
      // Travsify accepts query/destination/city/keyword/q — send `query` (canonical).
      query: data.destination,
      date_from: data.date || undefined,
      date_to: data.date || undefined,
      participants: data.participants,
    }),
  );

export const bookTour = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      tour_id: string;
      participants: Array<{ firstName: string; lastName: string; email: string }>;
    }) => input,
  )
  .handler(async ({ data }) => {
    const lead = data.participants[0];
    return call("/tours/bookings", {
      offer_id: data.tour_id,
      guest: lead
        ? { first_name: lead.firstName, last_name: lead.lastName, email: lead.email }
        : undefined,
      participants: data.participants.map((p) => ({
        first_name: p.firstName,
        last_name: p.lastName,
        email: p.email,
      })),
    });
  });

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
  .handler(async ({ data }) =>
    call("/visas/bookings", {
      offer_id: data.visa_id,
      guest: {
        first_name: data.applicant.firstName,
        last_name: data.applicant.lastName,
        email: data.applicant.email,
        passport_number: data.applicant.passport,
      },
    }),
  );

/* --------------------------- INSURANCE ----------------------------- */

export const searchInsurance = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      nationality: string;
      destination: string;
      start_date: string;
      end_date: string;
      travelers: number;
      ages?: number[];
    }) => input,
  )
  .handler(async ({ data }) => {
    const count = Math.max(1, Number(data.travelers) || 1);
    const ages =
      data.ages && data.ages.length === count
        ? data.ages
        : Array.from({ length: count }, () => 30);
    return searchCall("/insurance/search", {
      nationality: data.nationality,
      destination: data.destination,
      start_date: data.start_date,
      end_date: data.end_date,
      travelers: ages.map((age) => ({ age })),
    });
  });

export const bookInsurance = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      plan_id: string;
      holder: { firstName: string; lastName: string; email: string; born_on: string };
    }) => input,
  )
  .handler(async ({ data }) =>
    call("/insurance/bookings", {
      offer_id: data.plan_id,
      guest: {
        first_name: data.holder.firstName,
        last_name: data.holder.lastName,
        email: data.holder.email,
        date_of_birth: data.holder.born_on,
      },
    }),
  );

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
  .handler(async ({ data }) =>
    searchCall("/transfers/search", {
      pickup_address: data.pickup,
      dropoff_address: data.drop,
      pickup_datetime: `${data.date}T${data.time || "12:00"}:00`,
      num_passengers: data.passengers ?? 2,
    }),
  );

export const bookTransfer = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      vehicle_id: string;
      passenger: { firstName: string; lastName: string; email: string; phone?: string };
    }) => input,
  )
  .handler(async ({ data }) =>
    call("/transfers/bookings", {
      offer_id: data.vehicle_id,
      guest: {
        first_name: data.passenger.firstName,
        last_name: data.passenger.lastName,
        email: data.passenger.email,
        phone: data.passenger.phone,
      },
    }),
  );

/* ----------------------------- RENTALS ----------------------------- */

export const searchRentals = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { location: string; pickup_date: string; dropoff_date: string }) => input,
  )
  .handler(async ({ data }) => searchCall("/rentals/search", data));

export const bookRental = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      rental_id: string;
      driver: { firstName: string; lastName: string; email: string };
    }) => input,
  )
  .handler(async ({ data }) =>
    call("/rentals/bookings", {
      offer_id: data.rental_id,
      guest: {
        first_name: data.driver.firstName,
        last_name: data.driver.lastName,
        email: data.driver.email,
      },
    }),
  );
