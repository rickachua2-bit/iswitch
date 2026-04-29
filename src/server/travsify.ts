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
import {
  searchFlights as duffelSearchFlights,
  getFlightOffer as duffelGetOffer,
} from "./duffel.functions";
import { searchHotels as liteSearchHotels } from "./liteapi.functions";

/* ------------------------------ HELPERS ---------------------------- */

function ok(data: any) {
  return { data, error: null as string | null };
}
function fail(error: string, fallback: any = {}) {
  return { data: fallback, error };
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
  const res: any = await duffelSearchFlights({
    data: {
      origin,
      destination,
      departure_date,
      return_date: input.return_date,
      adults: input.adults,
      children: input.children ?? 0,
      infants: input.infants ?? 0,
      cabin: normalizeCabin(input.cabin),
    },
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
    const offerRes: any = await duffelGetOffer({ data: { offer_id: data.offer_id } });
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
    const res: any = await liteSearchHotels({
      data: {
        cityName: data.city,
        countryCode: data.country_code && data.country_code.length === 2 ? data.country_code.toUpperCase() : undefined,
        checkin: data.checkin,
        checkout: data.checkout,
        adults: Math.max(1, Number(data.adults) || 1),
        children: [],
        rooms: Math.max(1, Number(data.rooms) || 1),
        currency: data.currency || "USD",
        guestNationality: "US",
      },
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
