/**
 * Compatibility shim.
 *
 * The UI was originally wired to a single Travsify backend. We've since moved
 * to a hybrid stack:
 *  - Flights -> Duffel (live API)
 *  - Hotels  -> LiteAPI (live API)
 *  - Visas / Insurance / Tours / Pickups -> crawled inventory in `inventory_items`
 *  - All bookings -> lead capture in `bookings_unified` (manual fulfillment)
 *
 * To avoid touching ~17 UI files, this module keeps the exact same export
 * surface and response shapes the UI expects (`{ data: { ... }, error }`),
 * but internally delegates to the new providers and database.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DUFFEL_BASE = "https://api.duffel.com";
const LITEAPI_BASE = "https://api.liteapi.travel/v3.0";
const TRAVSIFY_BASE = "https://api.travsify.com";
const REQ_TIMEOUT_MS = 25_000;

type Vertical = "flights" | "stays" | "visas" | "insurance" | "tours" | "pickups";

/**
 * Reads admin-controlled per-vertical provider routing from system_settings.
 * Returns "travsify" only when the admin enabled it AND the API key is set.
 * Otherwise falls back to "default" (Duffel / LiteAPI / crawled inventory).
 */
async function getActiveProvider(vertical: Vertical): Promise<"travsify" | "default"> {
  try {
    if (!process.env.TRAVSIFY_API_KEY) return "default";
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", "provider_routing")
      .maybeSingle();
    const choice = (data?.value as Record<string, string> | null)?.[vertical];
    return choice === "travsify" ? "travsify" : "default";
  } catch {
    return "default";
  }
}

function travsifyHeaders() {
  const key = process.env.TRAVSIFY_API_KEY;
  if (!key) throw new Error("TRAVSIFY_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  } as Record<string, string>;
}

/** Generic Travsify search proxy. The shape is loose because Travsify mirrors
 *  most vertical schemas; we only need a JSON pass-through to keep the UI
 *  contract stable while admins evaluate the provider. */
async function travsifySearch(path: string, body: unknown) {
  try {
    const { status, text } = await timedFetch("travsify", `${TRAVSIFY_BASE}${path}`, {
      method: "POST",
      headers: travsifyHeaders(),
      body: JSON.stringify(body),
    });
    if (status >= 400) return { ok: false as const, error: friendlyError(status, text), data: null as any };
    return { ok: true as const, data: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)), data: null as any };
  }
}

/* ------------------------------ HELPERS ---------------------------- */

function ok(data: any) {
  return { data, error: null as string | null };
}
function fail(error: string, fallback: any = {}) {
  return { data: fallback, error };
}

function friendlyError(status: number | null, raw: string): string {
  if (status === 522 || status === 524 || status === 504 || /timeout|timed out|aborted/i.test(raw)) {
    return "Live inventory is taking longer than usual to respond. Please try again in a moment.";
  }
  if (status === 502 || status === 503 || (status && status >= 500)) {
    return "Live inventory is temporarily unavailable. Please try again in a minute.";
  }
  if (status === 401 || status === 403) return "Live inventory is temporarily unavailable. Please try again shortly.";
  if (status === 429) return "Too many searches in a short time. Please wait a few seconds and try again.";
  if (status === 400 || status === 422) return "Some of your search details were not accepted. Please review and try again.";
  return "We couldn't load results right now. Please try again.";
}

async function timedFetch(_providerSlug: string, url: string, init: RequestInit): Promise<{ status: number; text: string; ms: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return { status: res.status, text: await res.text(), ms: Date.now() - t0 };
  } finally {
    clearTimeout(timer);
  }
}

function duffelHeaders() {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) throw new Error("DUFFEL_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Duffel-Version": "v2",
    "Content-Type": "application/json",
    Accept: "application/json",
  } as Record<string, string>;
}

function liteApiHeaders() {
  const key = process.env.LITEAPI_KEY;
  if (!key) throw new Error("LITEAPI_KEY is not configured");
  return { "X-API-Key": key, "Content-Type": "application/json", Accept: "application/json" } as Record<string, string>;
}

function iata(s: string): string {
  const m = s.match(/\(([A-Z]{3})\)/);
  return (m ? m[1] : s).toUpperCase().trim();
}

async function searchDuffelOffers(input: {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children?: number;
  infants?: number;
  cabin?: "economy" | "premium_economy" | "business" | "first";
}) {
  try {
    const slices = [{ origin: iata(input.origin), destination: iata(input.destination), departure_date: input.departure_date }];
    if (input.return_date) slices.push({ origin: iata(input.destination), destination: iata(input.origin), departure_date: input.return_date });
    const passengers: any[] = [];
    for (let i = 0; i < input.adults; i++) passengers.push({ type: "adult" });
    for (let i = 0; i < (input.children ?? 0); i++) passengers.push({ type: "child", age: 8 });
    for (let i = 0; i < (input.infants ?? 0); i++) passengers.push({ type: "infant_without_seat" });

    const { status, text } = await timedFetch("duffel", `${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
      method: "POST",
      headers: duffelHeaders(),
      body: JSON.stringify({ data: { slices, passengers, cabin_class: input.cabin ?? "economy" } }),
    });
    if (status >= 400) return { ok: false as const, error: friendlyError(status, text), offers: [] };
    const json = JSON.parse(text);
    const offers = (json?.data?.offers ?? []).slice(0, 50).map((o: any) => ({
      id: o.id,
      total_amount: o.total_amount,
      total_currency: o.total_currency,
      owner: o.owner?.name,
      owner_logo: o.owner?.logo_symbol_url,
      slices: (o.slices ?? []).map((s: any) => ({
        origin: s.origin?.iata_code,
        destination: s.destination?.iata_code,
        duration: s.duration,
        segments: (s.segments ?? []).map((seg: any) => ({
          marketing_carrier: seg.marketing_carrier?.name,
          marketing_carrier_iata: seg.marketing_carrier?.iata_code,
          flight_number: seg.marketing_carrier_flight_number,
          departing_at: seg.departing_at,
          arriving_at: seg.arriving_at,
          origin: seg.origin?.iata_code,
          destination: seg.destination?.iata_code,
        })),
      })),
    }));
    return { ok: true as const, offers };
  } catch (e: any) {
    return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)), offers: [] };
  }
}

async function getDuffelOffer(offer_id: string) {
  try {
    const { status, text } = await timedFetch("duffel", `${DUFFEL_BASE}/air/offers/${offer_id}?return_available_services=true`, {
      method: "GET",
      headers: duffelHeaders(),
    });
    if (status >= 400) return { ok: false as const, error: friendlyError(status, text) };
    return { ok: true as const, offer: JSON.parse(text)?.data };
  } catch (e: any) {
    return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)) };
  }
}

async function searchLiteHotels(input: {
  cityName?: string;
  countryCode?: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency: string;
}) {
  try {
    const occupancies = Array.from({ length: input.rooms }, () => ({ adults: input.adults, children: [] as number[] }));
    const ratesBody: any = {
      checkin: input.checkin,
      checkout: input.checkout,
      currency: input.currency,
      guestNationality: "US",
      occupancies,
    };
    if (input.cityName) ratesBody.cityName = input.cityName;
    else if (input.countryCode) ratesBody.countryCode = input.countryCode;

    const { status, text } = await timedFetch("liteapi", `${LITEAPI_BASE}/hotels/rates`, {
      method: "POST",
      headers: liteApiHeaders(),
      body: JSON.stringify(ratesBody),
    });
    if (status >= 400) return { ok: false as const, error: friendlyError(status, text), hotels: [] };
    const json = JSON.parse(text);
    const hotels = (json?.data ?? []).slice(0, 50).map((h: any) => {
      const firstRoom = h.roomTypes?.[0];
      const firstRate = firstRoom?.rates?.[0];
      const total = firstRate?.retailRate?.total?.[0];
      return {
        id: h.hotelId,
        offer_id: firstRoom?.offerId ?? firstRate?.rateId ?? h.hotelId,
        price: total?.amount,
        currency: total?.currency ?? input.currency,
        board: firstRate?.boardName,
        refundable: firstRate?.cancellationPolicies?.refundableTag === "RFN",
        room_name: firstRoom?.roomTypes?.[0]?.name ?? firstRate?.name,
        raw: h,
      };
    });
    return { ok: true as const, hotels };
  } catch (e: any) {
    return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)), hotels: [] };
  }
}

async function fetchInventory(
  vertical: "visas" | "insurance" | "tours" | "pickups",
  opts: { destination?: string; origin?: string; limit?: number } = {},
) {
  let q = supabaseAdmin
    .from("inventory_items")
    .select(
      "id, title, subtitle, description, origin, destination, price, currency, duration, validity, images, source_url, attributes, external_id, provider_id",
    )
    .eq("vertical", vertical)
    .eq("is_active", true)
    .order("price", { ascending: true, nullsFirst: false })
    .limit(opts.limit ?? 50);
  if (opts.destination) q = q.ilike("destination", `%${opts.destination}%`);
  if (opts.origin) q = q.ilike("origin", `%${opts.origin}%`);
  const { data, error } = await q;
  if (error) return { items: [] as any[], error: "Inventory unavailable. Please try again shortly." };
  return { items: data ?? [], error: null as string | null };
}

async function createLead(input: {
  vertical: "flights" | "stays" | "visas" | "insurance" | "tours" | "pickups";
  provider_slug: string;
  inventory_item_id?: string;
  external_reference?: string;
  amount: number;
  currency?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  payload: Record<string, any>;
}) {
  const { data: prov } = await supabaseAdmin
    .from("providers")
    .select("id")
    .eq("slug", input.provider_slug)
    .maybeSingle();
  const { data: row, error } = await supabaseAdmin
    .from("bookings_unified")
    .insert({
      vertical: input.vertical,
      provider_id: prov?.id ?? null,
      inventory_item_id: input.inventory_item_id ?? null,
      external_reference: input.external_reference ?? null,
      amount: input.amount,
      currency: input.currency ?? "USD",
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone ?? null,
      payload: input.payload,
      status: "pending",
    })
    .select("id, status, created_at")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, booking: row };
}

/* ------------------------------ CATALOG ---------------------------- */
/**
 * Returns the list of supported countries/cities derived from crawled
 * inventory + a small built-in default. Used by the SearchTabsForms /
 * CountryAutocomplete components — kept loose so they always render.
 */
export const getCatalog = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data: rows } = await supabaseAdmin
      .from("inventory_items")
      .select("destination, origin")
      .eq("is_active", true)
      .limit(1000);
    const set = new Set<string>();
    (rows ?? []).forEach((r: any) => {
      if (r.destination) set.add(String(r.destination));
      if (r.origin) set.add(String(r.origin));
    });
    const countries = Array.from(set)
      .filter(Boolean)
      .sort()
      .map((name) => ({ name }));
    return ok({ countries, cities: countries });
  } catch {
    return ok({ countries: [], cities: [] });
  }
});

/* ----------------------------- FLIGHTS (Duffel) -------------------- */

const FlightSearchInput = z
  .object({
    origin: z.string().optional(),
    destination: z.string().optional(),
    departure_date: z.string().optional(),
    return_date: z.string().optional(),
    segments: z
      .array(
        z.object({
          origin: z.string(),
          destination: z.string(),
          departure_date: z.string(),
        }),
      )
      .optional(),
    adults: z.number().int().min(1).max(9),
    children: z.number().int().min(0).max(9).optional(),
    infants: z.number().int().min(0).max(9).optional(),
    cabin: z.string().optional(),
  })
  .passthrough();

function normalizeCabin(c?: string): "economy" | "premium_economy" | "business" | "first" {
  const v = (c || "economy").toLowerCase();
  if (v === "premium_economy" || v === "premium economy") return "premium_economy";
  if (v === "business") return "business";
  if (v === "first") return "first";
  return "economy";
}

async function runDuffelSearch(input: z.infer<typeof FlightSearchInput>) {
  // Duffel expects a single slice pair; multi-city falls back to first segment.
  const seg0 = input.segments?.[0];
  const origin = input.origin || seg0?.origin || "";
  const destination = input.destination || seg0?.destination || "";
  const departure_date = input.departure_date || seg0?.departure_date || "";
  if (!origin || !destination || !departure_date) {
    return { offers: [] as any[], error: "Please complete origin, destination and date." };
  }
  const res = await searchDuffelOffers({
    origin,
    destination,
    departure_date,
    return_date: input.return_date,
    adults: input.adults,
    children: input.children ?? 0,
    infants: input.infants ?? 0,
    cabin: normalizeCabin(input.cabin),
  });
  if (!res?.ok) return { offers: [], error: res?.error || "Flights unavailable." };
  return { offers: res.offers ?? [], error: null as string | null };
}

/**
 * The UI calls startFlightSearch -> pollFlightSearch. Duffel returns offers
 * inline, so we resolve immediately and return inline offers with no
 * search_id (the poll path is then skipped by the UI).
 */
export const startFlightSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FlightSearchInput.parse(d))
  .handler(async ({ data }) => {
    const r = await runDuffelSearch(data);
    if (r.error) return { search_id: null, data: { offers: [] }, error: r.error };
    return { search_id: null, data: { offers: r.offers }, error: null };
  });

export const pollFlightSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ search_id: z.string() }).parse(d))
  .handler(async () => {
    // No-op: results were returned inline by startFlightSearch.
    return { status: "completed" as const, data: { offers: [] }, error: null };
  });

/** @deprecated Prefer startFlightSearch + pollFlightSearch. */
export const searchFlights = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => FlightSearchInput.parse(d))
  .handler(async ({ data }) => {
    const r = await runDuffelSearch(data);
    if (r.error) return fail(r.error, { offers: [] });
    return ok({ offers: r.offers });
  });

export const bookFlight = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          offer_id: z.string(),
          passengers: z.array(z.record(z.string(), z.any())).min(1),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    // Re-fetch the offer to lock price + capture as a lead. Manual fulfillment.
    const offerRes = await getDuffelOffer(data.offer_id);
    const offer = offerRes?.offer;
    const lead = data.passengers[0] || {};
    const amount = Number(offer?.total_amount ?? 0);
    const currency = offer?.total_currency ?? "USD";
    const r = await createLead({
      vertical: "flights",
      provider_slug: "duffel",
      external_reference: data.offer_id,
      amount,
      currency,
      customer_name: `${lead.firstName ?? lead.given_name ?? ""} ${lead.lastName ?? lead.family_name ?? ""}`.trim() || "Guest",
      customer_email: lead.email ?? "",
      customer_phone: lead.phone,
      payload: { offer_id: data.offer_id, passengers: data.passengers, offer },
    });
    if (!r.ok) return fail(r.error);
    return ok({ booking: r.booking, message: "Lead captured. Our agent will contact you to confirm." });
  });

/* ------------------------------ HOTELS (LiteAPI) ------------------- */

export const searchHotels = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          country_code: z.string().optional(),
          city: z.string().optional(),
          checkin: z.string(),
          checkout: z.string(),
          adults: z.number(),
          children: z.number().optional(),
          rooms: z.number().optional(),
          currency: z.string().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const res = await searchLiteHotels({
      cityName: data.city,
      countryCode: data.country_code && data.country_code.length === 2 ? data.country_code.toUpperCase() : undefined,
      checkin: data.checkin,
      checkout: data.checkout,
      adults: Math.max(1, Number(data.adults) || 1),
      rooms: Math.max(1, Number(data.rooms) || 1),
      currency: data.currency || "USD",
    });
    if (!res?.ok) return fail(res?.error || "Hotels unavailable.", { hotels: [] });
    return ok({ hotels: res.hotels ?? [] });
  });

export const bookHotel = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          offer_id: z.string(),
          holder: z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
            phone: z.string().optional(),
          }),
          guests: z.array(z.object({ firstName: z.string(), lastName: z.string() })).optional(),
          amount: z.number().optional(),
          currency: z.string().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await createLead({
      vertical: "stays",
      provider_slug: "liteapi",
      external_reference: data.offer_id,
      amount: Number(data.amount ?? 0),
      currency: data.currency ?? "USD",
      customer_name: `${data.holder.firstName} ${data.holder.lastName}`.trim(),
      customer_email: data.holder.email,
      customer_phone: data.holder.phone,
      payload: { offer_id: data.offer_id, holder: data.holder, guests: data.guests ?? [] },
    });
    if (!r.ok) return fail(r.error);
    return ok({ booking: r.booking, message: "Lead captured. Our agent will confirm your stay shortly." });
  });

/* ------------------------------ TOURS (crawled) -------------------- */

export const searchTours = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          destination: z.string(),
          date: z.string().optional(),
          participants: z.number().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await fetchInventory("tours", { destination: data.destination });
    if (r.error) return fail(r.error, { tours: [] });
    return ok({ tours: r.items });
  });

export const bookTour = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          tour_id: z.string(),
          participants: z.array(
            z.object({ firstName: z.string(), lastName: z.string(), email: z.string().email() }),
          ),
          amount: z.number().optional(),
          currency: z.string().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const lead = data.participants[0];
    const r = await createLead({
      vertical: "tours",
      provider_slug: "getyourguide",
      inventory_item_id: data.tour_id,
      amount: Number(data.amount ?? 0),
      currency: data.currency ?? "USD",
      customer_name: `${lead.firstName} ${lead.lastName}`.trim(),
      customer_email: lead.email,
      payload: { tour_id: data.tour_id, participants: data.participants },
    });
    if (!r.ok) return fail(r.error);
    return ok({ booking: r.booking, message: "Lead captured. Our agent will confirm your tour shortly." });
  });

/* ------------------------------ VISAS (crawled) -------------------- */

export const searchVisas = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          nationality: z.string(),
          destination: z.string(),
          purpose: z.string().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await fetchInventory("visas", { destination: data.destination, origin: data.nationality });
    if (r.error) return fail(r.error, { visas: [] });
    return ok({ visas: r.items });
  });

export const bookVisa = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          visa_id: z.string(),
          applicant: z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
            passport: z.string(),
            phone: z.string().optional(),
          }),
          amount: z.number().optional(),
          currency: z.string().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await createLead({
      vertical: "visas",
      provider_slug: "atlys",
      inventory_item_id: data.visa_id,
      amount: Number(data.amount ?? 0),
      currency: data.currency ?? "USD",
      customer_name: `${data.applicant.firstName} ${data.applicant.lastName}`.trim(),
      customer_email: data.applicant.email,
      customer_phone: data.applicant.phone,
      payload: { visa_id: data.visa_id, applicant: data.applicant },
    });
    if (!r.ok) return fail(r.error);
    return ok({ booking: r.booking, message: "Lead captured. Our visa specialist will reach out shortly." });
  });

/* --------------------------- INSURANCE (crawled) ------------------- */

export const searchInsurance = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          nationality: z.string(),
          destination: z.string(),
          start_date: z.string().optional(),
          end_date: z.string().optional(),
          travelers: z.number().optional(),
          ages: z.array(z.number()).optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await fetchInventory("insurance", { destination: data.destination });
    if (r.error) return fail(r.error, { plans: [] });
    return ok({ plans: r.items });
  });

export const bookInsurance = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          plan_id: z.string(),
          holder: z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
            born_on: z.string(),
            phone: z.string().optional(),
          }),
          amount: z.number().optional(),
          currency: z.string().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await createLead({
      vertical: "insurance",
      provider_slug: "safetywing",
      inventory_item_id: data.plan_id,
      amount: Number(data.amount ?? 0),
      currency: data.currency ?? "USD",
      customer_name: `${data.holder.firstName} ${data.holder.lastName}`.trim(),
      customer_email: data.holder.email,
      customer_phone: data.holder.phone,
      payload: { plan_id: data.plan_id, holder: data.holder },
    });
    if (!r.ok) return fail(r.error);
    return ok({ booking: r.booking, message: "Lead captured. We'll send the policy details shortly." });
  });

/* ---------------------------- TRANSFERS (crawled) ------------------ */

export const searchTransfers = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          pickup: z.string(),
          drop: z.string(),
          date: z.string().optional(),
          time: z.string().optional(),
          passengers: z.number().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await fetchInventory("pickups", { origin: data.pickup, destination: data.drop });
    if (r.error) return fail(r.error, { vehicles: [] });
    return ok({ vehicles: r.items });
  });

export const bookTransfer = createServerFn({ method: "POST" })
  .inputValidator(
    (d: unknown) =>
      z
        .object({
          vehicle_id: z.string(),
          passenger: z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
            phone: z.string().optional(),
          }),
          amount: z.number().optional(),
          currency: z.string().optional(),
        })
        .passthrough()
        .parse(d),
  )
  .handler(async ({ data }) => {
    const r = await createLead({
      vertical: "pickups",
      provider_slug: "mozio",
      inventory_item_id: data.vehicle_id,
      amount: Number(data.amount ?? 0),
      currency: data.currency ?? "USD",
      customer_name: `${data.passenger.firstName} ${data.passenger.lastName}`.trim(),
      customer_email: data.passenger.email,
      customer_phone: data.passenger.phone,
      payload: { vehicle_id: data.vehicle_id, passenger: data.passenger },
    });
    if (!r.ok) return fail(r.error);
    return ok({ booking: r.booking, message: "Lead captured. Your driver details will be sent shortly." });
  });

/* ----------------------------- RENTALS (stub) ---------------------- */

export const searchRentals = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({}).passthrough().parse(d))
  .handler(async () => ok({ rentals: [] }));

export const bookRental = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({}).passthrough().parse(d))
  .handler(async () => fail("Car rentals are not yet available. Please check back soon."));
