/**
 * Priceline.com Provider — RapidAPI integration for Car Rentals.
 *
 * Endpoints used:
 *   GET /v1/cars/search-pickup-locations?string=<query>
 *   GET /v1/cars/list?pickup_location_id=…&dropoff_location_id=…&pickup_date_time=…&dropoff_date_time=…&driver_age=…&currency=USD
 *
 * Auth: x-rapidapi-host + x-rapidapi-key (RAPIDAPI_PRICELINE_KEY)
 */

const HOST = "priceline-com-provider.p.rapidapi.com";
const BASE = `https://${HOST}`;

function headers(): Record<string, string> | null {
  const key = process.env.RAPIDAPI_PRICELINE_KEY;
  if (!key) return null;
  return {
    "x-rapidapi-host": HOST,
    "x-rapidapi-key": key,
    "x-request-id": crypto.randomUUID(),
    "cache-control": "no-cache",
    Accept: "application/json",
  };
}

/* ------------------------- Pickup-location search ------------------------- */

export type PickupLocation = {
  id: string;
  name: string;
  type?: string; // "AIRPORT" | "CITY"
  cityName?: string;
  countryCode?: string;
  iata?: string;
};

export async function searchPickupLocations(query: string): Promise<{
  ok: boolean;
  locations: PickupLocation[];
  error?: string;
}> {
  const h = headers();
  if (!h) return { ok: false, locations: [], error: "Priceline key not configured" };
  if (!query || query.trim().length < 2) return { ok: true, locations: [] };

  try {
    const url = new URL(`${BASE}/v1/cars/search-pickup-locations`);
    url.searchParams.set("string", query.trim());
    const res = await fetch(url.toString(), { method: "GET", headers: h });
    const text = await res.text();
    if (!res.ok) return { ok: false, locations: [], error: `Locations API ${res.status}` };
    let raw: any;
    try { raw = JSON.parse(text); } catch { return { ok: false, locations: [], error: "Bad JSON from locations API" }; }

    // Priceline returns { popular_destinations: { results: { regions: [...] } } } or
    // { getSolrSearchPickupLocations: { results: [...] } } depending on the variant.
    const candidates: any[] =
      raw?.popular_destinations?.results?.regions ??
      raw?.getSolrSearchPickupLocations?.results ??
      raw?.results ??
      raw?.regions ??
      [];

    const locations: PickupLocation[] = candidates
      .map((r: any) => normalizeLocation(r))
      .filter((x): x is PickupLocation => !!x);

    return { ok: true, locations };
  } catch (e: any) {
    return { ok: false, locations: [], error: e?.message ?? "Network error" };
  }
}

function normalizeLocation(r: any): PickupLocation | null {
  if (!r || typeof r !== "object") return null;
  const id =
    r.id ??
    r.location_id ??
    r.locationId ??
    r.cityId ??
    r.airport_code ??
    r.code ??
    r.iata;
  if (id == null) return null;
  return {
    id: String(id),
    name: String(r.name ?? r.display_name ?? r.label ?? r.airport_name ?? r.city_name ?? id),
    type: r.type ?? r.location_type ?? (r.airport_code ? "AIRPORT" : undefined),
    cityName: r.city_name ?? r.city ?? undefined,
    countryCode: r.country_code ?? r.country ?? undefined,
    iata: r.airport_code ?? r.iata ?? undefined,
  };
}

/* ------------------------------- Cars list ------------------------------- */

export type CarRentalSearchParams = {
  pickup_location_id: string;
  dropoff_location_id?: string;
  pickup_date_time: string; // ISO 8601 YYYY-MM-DDTHH:mm:ss
  dropoff_date_time: string;
  driver_age?: number;
  currency?: string;
};

export type NormalizedCar = {
  id: string;
  name: string; // "Toyota Corolla or similar"
  carClass?: string; // "Compact"
  supplier?: string; // "Hertz"
  supplier_logo?: string;
  transmission?: string; // "Automatic" | "Manual"
  passengers?: number;
  bags?: number;
  doors?: number;
  air_conditioning?: boolean;
  mileage?: string; // "Unlimited" | "300 miles"
  pickup_type?: string; // "At Airport" | "Shuttle"
  total_price?: number;
  daily_price?: number;
  currency: string;
  image?: string;
  cancellation?: string;
  features?: string[];
  raw_partner_code?: string;
  provider_slug: "priceline";
};

export async function searchCarRentals(params: CarRentalSearchParams): Promise<{
  ok: boolean;
  cars: NormalizedCar[];
  error?: string;
}> {
  const h = headers();
  if (!h) return { ok: false, cars: [], error: "Priceline key not configured" };

  try {
    const url = new URL(`${BASE}/v1/cars/list`);
    url.searchParams.set("pickup_location_id", params.pickup_location_id);
    url.searchParams.set("dropoff_location_id", params.dropoff_location_id ?? params.pickup_location_id);
    url.searchParams.set("pickup_date_time", params.pickup_date_time);
    url.searchParams.set("dropoff_date_time", params.dropoff_date_time);
    url.searchParams.set("driver_age", String(params.driver_age ?? 30));
    url.searchParams.set("currency", params.currency ?? "USD");

    const res = await fetch(url.toString(), { method: "GET", headers: h });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, cars: [], error: `Cars API ${res.status}: ${text.slice(0, 160)}` };
    }
    let raw: any;
    try { raw = JSON.parse(text); } catch { return { ok: false, cars: [], error: "Bad JSON from cars API" }; }

    return { ok: true, cars: normalizeCarRentals(raw, params.currency ?? "USD") };
  } catch (e: any) {
    return { ok: false, cars: [], error: e?.message ?? "Network error" };
  }
}

function pickArray(raw: any): any[] {
  // Priceline car list responses vary: try the common shapes.
  return (
    raw?.getSearchCarsResults?.results?.solrSearchResults ??
    raw?.getSearchCarsResults?.results?.car_data ??
    raw?.getSearchCarsResults?.results ??
    raw?.results?.solrSearchResults ??
    raw?.results?.car_data ??
    raw?.results ??
    raw?.cars ??
    raw?.car_data ??
    []
  );
}

function num(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeCarRentals(raw: any, defaultCurrency: string): NormalizedCar[] {
  const arr = pickArray(raw);
  if (!Array.isArray(arr)) return [];

  return arr
    .map((c: any, i: number) => {
      const veh = c?.vehicle_info ?? c?.vehicle ?? c;
      const pricing = c?.price_details ?? c?.pricing ?? c;
      const partner = c?.partner_info ?? c?.partner ?? c?.supplier ?? {};

      const id =
        c?.id ??
        c?.car_id ??
        c?.partner_code ??
        partner?.partner_code ??
        `priceline-${i}`;

      const fallbackName = `${veh?.make ?? "Car"} ${veh?.model ?? ""}`.trim() || "Car";
      const name =
        veh?.car_name ??
        veh?.name ??
        veh?.vehicle_name ??
        veh?.car ??
        fallbackName;

      const total = num(pricing?.total_price ?? pricing?.totalPrice ?? pricing?.total ?? c?.total_price);
      const daily = num(pricing?.daily_rate ?? pricing?.dailyRate ?? pricing?.daily ?? pricing?.per_day);

      const transmission =
        veh?.transmission_type ?? veh?.transmission ?? (veh?.auto_trans ? "Automatic" : undefined);

      const features: string[] = [];
      if (veh?.air_conditioning || veh?.has_ac) features.push("Air conditioning");
      if (veh?.unlimited_mileage || /unlimited/i.test(String(veh?.mileage ?? ""))) features.push("Unlimited mileage");
      if (c?.free_cancellation || pricing?.free_cancellation) features.push("Free cancellation");

      return {
        id: String(id),
        name: String(name),
        carClass: veh?.car_class ?? veh?.class ?? veh?.category ?? undefined,
        supplier: partner?.partner_name ?? partner?.name ?? c?.partner_name ?? undefined,
        supplier_logo: partner?.partner_logo_url ?? partner?.logo_url ?? partner?.image ?? undefined,
        transmission,
        passengers: num(veh?.passenger_qty ?? veh?.seats ?? veh?.passengers),
        bags: num(veh?.large_baggage_qty ?? veh?.bags ?? veh?.luggage),
        doors: num(veh?.door_count ?? veh?.doors),
        air_conditioning: !!(veh?.air_conditioning ?? veh?.has_ac),
        mileage: veh?.mileage ?? (veh?.unlimited_mileage ? "Unlimited mileage" : undefined),
        pickup_type:
          c?.pickup_type ??
          c?.pickup_location?.location_type ??
          (c?.pickup_location?.airport_code ? "At airport" : undefined),
        total_price: total,
        daily_price: daily,
        currency: pricing?.currency ?? c?.currency ?? defaultCurrency,
        image: veh?.car_image_url ?? veh?.image_url ?? veh?.image ?? undefined,
        cancellation: c?.cancellation_policy ?? pricing?.cancellation_policy ?? undefined,
        features,
        raw_partner_code: c?.partner_code ?? partner?.partner_code ?? undefined,
        provider_slug: "priceline",
      } as NormalizedCar;
    })
    .filter((c) => c.total_price != null || c.daily_price != null);
}
