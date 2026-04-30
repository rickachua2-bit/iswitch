/**
 * Booking.com via RapidAPI integration.
 *
 * Single key: RAPIDAPI_BOOKING_KEY (host: booking-com15.p.rapidapi.com).
 * Each search function returns results normalized to the existing UI shapes
 * (Duffel-flavored offers / LiteAPI-flavored hotels / inventory_items-flavored
 * tours and pickups) so the UI can merge them with native results without
 * any component changes.
 *
 * Server-only — never import from client code.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const HOST = "booking-com15.p.rapidapi.com";
const BASE = `https://${HOST}`;
const REQ_TIMEOUT_MS = 25_000;

function bHeaders(): Record<string, string> | null {
  const key = process.env.RAPIDAPI_BOOKING_KEY;
  if (!key) return null;
  return {
    "x-rapidapi-host": HOST,
    "x-rapidapi-key": key,
    Accept: "application/json",
  };
}

async function bFetch(slug: string, url: string): Promise<{ status: number; text: string; ms: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const headers = bHeaders();
    if (!headers) throw new Error("RAPIDAPI_BOOKING_KEY not configured");
    const res = await fetch(url, { method: "GET", headers, signal: ctrl.signal });
    const text = await res.text();
    const ms = Date.now() - t0;
    // best-effort health log
    void recordHealth(slug, res.ok, res.status, ms, res.ok ? undefined : text.slice(0, 200));
    return { status: res.status, text, ms };
  } catch (e: any) {
    const ms = Date.now() - t0;
    void recordHealth(slug, false, null, ms, String(e?.message ?? e));
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function recordHealth(slug: string, ok: boolean, status: number | null, ms: number, message?: string) {
  try {
    const { data: prov } = await supabaseAdmin.from("providers").select("id, total_calls, total_errors").eq("slug", slug).maybeSingle();
    if (!prov) return;
    await supabaseAdmin.from("provider_health_events").insert({
      provider_id: prov.id, ok, status_code: status, latency_ms: ms, message: message ?? null,
    });
    await supabaseAdmin.from("providers").update({
      total_calls: (prov.total_calls ?? 0) + 1,
      total_errors: (prov.total_errors ?? 0) + (ok ? 0 : 1),
      last_ok_at: ok ? new Date().toISOString() : undefined,
      last_error_at: ok ? undefined : new Date().toISOString(),
      last_error: ok ? null : (message ?? null),
    }).eq("id", prov.id);
  } catch { /* swallow */ }
}

/* ----------------------------- helpers ----------------------------- */

function iata(s: string): string {
  const m = s.match(/\(([A-Z]{3})\)/);
  return (m ? m[1] : s).toUpperCase().trim();
}

function safeJson(text: string): any {
  try { return JSON.parse(text); } catch { return null; }
}

/* =========================== FLIGHTS =============================== */
/**
 * Booking.com flight search via /api/v1/flights/searchFlights.
 * Param shape (per RapidAPI docs):
 *   fromId, toId   = "<IATA>.AIRPORT"  (e.g. "LOS.AIRPORT")
 *   departDate     = "YYYY-MM-DD"
 *   returnDate     = "YYYY-MM-DD" (optional, only when round-trip)
 *   adults, children, cabinClass, currency_code
 */
export async function bookingSearchFlights(input: {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults: number;
  children?: number;
  cabin?: "economy" | "premium_economy" | "business" | "first";
  currency?: string;
}): Promise<{ ok: boolean; offers: any[]; error?: string }> {
  if (!process.env.RAPIDAPI_BOOKING_KEY) return { ok: true, offers: [] };
  const cabinMap: Record<string, string> = {
    economy: "ECONOMY",
    premium_economy: "PREMIUM_ECONOMY",
    business: "BUSINESS",
    first: "FIRST",
  };
  try {
    const params = new URLSearchParams({
      fromId: `${iata(input.origin)}.AIRPORT`,
      toId: `${iata(input.destination)}.AIRPORT`,
      departDate: input.departure_date,
      adults: String(Math.max(1, input.adults)),
      cabinClass: cabinMap[input.cabin ?? "economy"] ?? "ECONOMY",
      currency_code: (input.currency ?? "USD").toUpperCase(),
      stops: "none",
      pageNo: "1",
      sort: "BEST",
    });
    if (input.return_date) params.set("returnDate", input.return_date);
    if (input.children && input.children > 0) {
      // RapidAPI expects comma-separated child ages; default age 8
      params.set("children", Array.from({ length: input.children }, () => "8").join(","));
    }
    const { status, text } = await bFetch("booking-flights", `${BASE}/api/v1/flights/searchFlights?${params.toString()}`);
    if (status >= 400) return { ok: false, offers: [], error: `Booking.com flights: HTTP ${status}` };
    const json = safeJson(text);
    const flightOffers = json?.data?.flightOffers ?? [];
    const offers = flightOffers.slice(0, 50).map((o: any, idx: number) => normalizeBookingFlight(o, idx));
    return { ok: true, offers };
  } catch (e: any) {
    return { ok: false, offers: [], error: String(e?.message ?? e) };
  }
}

function normalizeBookingFlight(o: any, idx: number) {
  // Booking.com offer shape (abbreviated): { token, segments: [{ legs: [...] }], priceBreakdown: { total: { units, currencyCode } } }
  const total = o?.priceBreakdown?.total ?? {};
  const totalAmount = (Number(total?.units ?? 0) + Number(total?.nanos ?? 0) / 1e9).toFixed(2);
  const currency = total?.currencyCode ?? "USD";

  const carrierLogos = new Set<string>();

  const slices = (o?.segments ?? []).map((seg: any) => {
    const legs = seg?.legs ?? [];
    return {
      origin: seg?.departureAirport?.code,
      destination: seg?.arrivalAirport?.code,
      duration: seg?.totalTime ? `PT${Math.floor(seg.totalTime / 60)}M` : undefined,
      segments: legs.map((leg: any) => {
        const marketing = leg?.carriersData?.[0] ?? {};
        const operating = leg?.carriersData?.[1] ?? null;
        if (typeof marketing?.logo === "string" && marketing.logo) carrierLogos.add(marketing.logo);
        if (operating && typeof operating?.logo === "string" && operating.logo) carrierLogos.add(operating.logo);
        return {
          marketing_carrier: marketing?.name ?? leg?.carriers?.[0],
          marketing_carrier_iata: marketing?.code ?? leg?.carriers?.[0],
          marketing_carrier_logo: marketing?.logo ?? null,
          operating_carrier: operating?.name ?? null,
          operating_carrier_iata: operating?.code ?? null,
          operating_carrier_logo: operating?.logo ?? null,
          flight_number: leg?.flightInfo?.flightNumber,
          aircraft: leg?.flightInfo?.planeType ?? leg?.flightInfo?.aircraft ?? null,
          cabin_class: leg?.cabinClass ?? null,
          departing_at: leg?.departureTime,
          arriving_at: leg?.arrivalTime,
          origin: leg?.departureAirport?.code,
          destination: leg?.arrivalAirport?.code,
        };
      }),
    };
  });

  const firstCarrier = o?.segments?.[0]?.legs?.[0]?.carriersData?.[0];
  return {
    id: o?.token ?? `booking-${idx}`,
    total_amount: totalAmount,
    total_currency: currency,
    owner: firstCarrier?.name ?? "Booking.com",
    owner_logo: firstCarrier?.logo ?? null,
    owner_iata: firstCarrier?.code ?? null,
    carrier_logos: Array.from(carrierLogos),
    source: "booking" as const,
    slices,
    raw: o,
  };
}

/* =========================== HOTELS ================================ */

export async function bookingSearchHotels(input: {
  destination: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency?: string;
}): Promise<{ ok: boolean; hotels: any[]; error?: string }> {
  if (!process.env.RAPIDAPI_BOOKING_KEY) return { ok: true, hotels: [] };
  try {
    // Step 1: resolve destination -> dest_id + search_type
    const dest = await bookingResolveStayDest(input.destination);
    if (!dest) return { ok: true, hotels: [] };

    const params = new URLSearchParams({
      dest_id: String(dest.dest_id),
      search_type: dest.dest_type ?? "city",
      arrival_date: input.checkin,
      departure_date: input.checkout,
      adults: String(Math.max(1, input.adults)),
      room_qty: String(Math.max(1, input.rooms)),
      currency_code: (input.currency ?? "USD").toUpperCase(),
      page_number: "1",
      languagecode: "en-us",
    });
    const { status, text } = await bFetch("booking-hotels", `${BASE}/api/v1/hotels/searchHotels?${params.toString()}`);
    if (status >= 400) return { ok: false, hotels: [], error: `Booking.com hotels: HTTP ${status}` };
    const json = safeJson(text);
    const list = json?.data?.hotels ?? [];
    const hotels = list.slice(0, 50).map((h: any) => normalizeBookingHotel(h, input.currency ?? "USD"));
    return { ok: true, hotels };
  } catch (e: any) {
    return { ok: false, hotels: [], error: String(e?.message ?? e) };
  }
}

async function bookingResolveStayDest(query: string): Promise<{ dest_id: string; dest_type: string } | null> {
  try {
    const { status, text } = await bFetch(
      "booking-hotels",
      `${BASE}/api/v1/hotels/searchDestination?query=${encodeURIComponent(query)}`,
    );
    if (status >= 400) return null;
    const json = safeJson(text);
    const top = (json?.data ?? [])[0];
    if (!top?.dest_id) return null;
    return { dest_id: String(top.dest_id), dest_type: top.search_type ?? top.dest_type ?? "city" };
  } catch {
    return null;
  }
}

const ACCOMMODATION_TYPE_MAP: Record<string, string> = {
  "204": "Hotel", "201": "Apartment", "203": "Guest house", "208": "Bed and breakfast",
  "206": "Hostel", "213": "Villa", "216": "Resort", "220": "Holiday home",
  "224": "Chalet", "226": "Country house", "227": "Lodge", "228": "Boat",
  "229": "Riad", "231": "Holiday park", "232": "Aparthotel", "233": "Cruise",
};

function normalizeBookingHotel(h: any, fallbackCurrency: string) {
  const prop = h?.property ?? h;
  const breakdown = prop?.priceBreakdown ?? {};
  const gross = breakdown?.grossPrice ?? null;
  const strike = breakdown?.strikethroughPrice ?? null;
  const benefit = breakdown?.benefitBadges ?? [];
  const excluded = breakdown?.excludedPrice ?? null;

  const amount = gross?.value != null ? Number(gross.value) : (prop?.minTotalPrice ?? null);
  const original = strike?.value != null ? Number(strike.value) : null;
  const currency = gross?.currency ?? strike?.currency ?? fallbackCurrency;
  const discountPct = original && amount && original > amount
    ? Math.round(((original - amount) / original) * 100) : 0;

  // Photos: dedupe + prefer high-res when available
  const photoSet = new Set<string>();
  if (prop?.mainPhotoUrl) photoSet.add(prop.mainPhotoUrl);
  if (Array.isArray(prop?.photoUrls)) {
    for (const url of prop.photoUrls) if (url) photoSet.add(url);
  }
  const photos = Array.from(photoSet);

  // Badges: combine ribbon + benefit chips + custom badges
  const badges: string[] = [];
  if (Array.isArray(benefit)) {
    for (const b of benefit) {
      const text = typeof b === "string" ? b : (b?.text ?? b?.identifier ?? null);
      if (text) badges.push(String(text));
    }
  }
  if (Array.isArray(prop?.badges)) {
    for (const b of prop.badges) {
      const text = typeof b === "string" ? b : (b?.text ?? b?.title ?? null);
      if (text) badges.push(String(text));
    }
  }
  if (prop?.ribbonText) badges.push(String(prop.ribbonText));
  if (prop?.isFreeCancellable) badges.push("Free cancellation");

  const id = String(prop?.id ?? h?.hotel_id ?? prop?.hotel_id ?? "");
  const accomKey = String(prop?.accommodationTypeId ?? prop?.accommodationType ?? "");
  const accommodationType = ACCOMMODATION_TYPE_MAP[accomKey] ?? null;
  const stars = prop?.accuratePropertyClass ?? prop?.propertyClass ?? 0;
  const district = prop?.wishlistName ?? prop?.districtName ?? prop?.district ?? null;
  const city = prop?.cityName ?? prop?.wishlistName ?? null;
  const country = prop?.countryCode ?? prop?.country ?? null;
  const address = [district, city, country].filter(Boolean).join(", ") || null;

  return {
    id: `booking-${id}`,
    offer_id: `booking-${id}`,
    price: amount,
    original_price: original,
    discount_pct: discountPct,
    currency,
    taxes_included: excluded ? false : true,
    excluded_price: excluded?.value != null ? Number(excluded.value) : null,
    name: prop?.name ?? `Hotel ${id}`,
    accommodation_type: accommodationType,
    image: photos[0] ?? null,
    thumbnail: photos[0] ?? null,
    images: photos.length ? photos : undefined,
    address,
    district,
    location: address,
    city,
    country,
    country_code: prop?.countryCode ?? null,
    stars,
    review_score: prop?.reviewScore ?? null,
    review_score_word: prop?.reviewScoreWord ?? null,
    review_count: prop?.reviewCount ?? null,
    ranking_score: prop?.rankingScore ?? null,
    latitude: prop?.latitude ?? null,
    longitude: prop?.longitude ?? null,
    distance_to_center: prop?.distanceToCenter ?? prop?.distance ?? null,
    description: null,
    refundable: prop?.isFreeCancellable ?? false,
    checkin_from: prop?.checkin?.fromTime ?? prop?.checkinFrom ?? null,
    checkin_until: prop?.checkin?.untilTime ?? null,
    checkout_until: prop?.checkout?.untilTime ?? prop?.checkoutUntil ?? null,
    checkin_date: prop?.checkinDate ?? null,
    checkout_date: prop?.checkoutDate ?? null,
    badges,
    room_name: null,
    board: null,
    source: "booking" as const,
    raw: h,
  };
}

/* =========================== TOURS ================================= */

export async function bookingSearchTours(input: {
  destination: string;
  date?: string;
  participants?: number;
  currency?: string;
}): Promise<{ ok: boolean; tours: any[]; error?: string }> {
  if (!process.env.RAPIDAPI_BOOKING_KEY) return { ok: true, tours: [] };
  try {
    // Step 1: resolve destination
    const r1 = await bFetch(
      "booking-tours",
      `${BASE}/api/v1/attraction/searchLocation?query=${encodeURIComponent(input.destination)}`,
    );
    if (r1.status >= 400) return { ok: false, tours: [], error: `Booking.com tours: HTTP ${r1.status}` };
    const j1 = safeJson(r1.text);
    const loc = (j1?.data?.products ?? j1?.data?.destinations ?? j1?.data ?? [])[0];
    const id = loc?.id ?? loc?.productId ?? loc?.ufi ?? loc?.b_ufi;
    if (!id) return { ok: true, tours: [] };

    const params = new URLSearchParams({
      id: String(id),
      sortBy: "trending",
      page: "1",
      currency_code: (input.currency ?? "USD").toUpperCase(),
      languagecode: "en-us",
    });
    if (input.date) params.set("startDate", input.date);
    const { status, text } = await bFetch("booking-tours", `${BASE}/api/v1/attraction/searchAttractions?${params.toString()}`);
    if (status >= 400) return { ok: false, tours: [], error: `Booking.com tours: HTTP ${status}` };
    const json = safeJson(text);
    const products = json?.data?.products ?? [];
    const tours = products.slice(0, 50).map((p: any) => normalizeBookingTour(p));
    return { ok: true, tours };
  } catch (e: any) {
    return { ok: false, tours: [], error: String(e?.message ?? e) };
  }
}

function normalizeBookingTour(p: any) {
  const price = p?.representativePrice ?? p?.price ?? {};

  // Collect images: prefer largest variant of primaryPhoto, then any photos[].
  const images: string[] = [];
  const pp = p?.primaryPhoto ?? {};
  for (const k of ["large", "medium", "small", "url"]) {
    const u = pp?.[k];
    if (typeof u === "string" && u && !images.includes(u)) images.push(u);
  }
  for (const ph of p?.photos ?? []) {
    const u = typeof ph === "string" ? ph : (ph?.large ?? ph?.medium ?? ph?.small ?? ph?.url);
    if (typeof u === "string" && u && !images.includes(u)) images.push(u);
  }

  // Rating: Booking.com surfaces a few different shapes. Try them in order.
  const rating =
    p?.reviewsStats?.combinedNumericStats?.average ??
    p?.reviewsStats?.combinedNumericStats?.total ??
    p?.reviewsStats?.average ??
    p?.rating ??
    null;
  const reviewCount =
    p?.reviewsStats?.allReviewsCount ??
    p?.reviewsStats?.totalReviewCount ??
    p?.reviewCount ??
    null;

  // Duration: prefer human text; fall back to representativeDuration { value, unit }.
  let durationText: string | null = null;
  if (typeof p?.duration === "string") durationText = p.duration;
  else if (p?.representativeDuration?.value && p?.representativeDuration?.unit) {
    const v = Number(p.representativeDuration.value);
    const u = String(p.representativeDuration.unit).toLowerCase();
    if (Number.isFinite(v)) durationText = `${v} ${v === 1 ? u.replace(/s$/, "") : u}`;
  }

  const fromPrice = price?.publicAmount ?? price?.chargeAmount ?? null;

  return {
    id: `booking-${p?.id ?? p?.slug}`,
    external_id: String(p?.id ?? ""),
    title: p?.name ?? p?.title ?? "Experience",
    subtitle: p?.shortDescription ?? p?.primaryCategory?.name ?? null,
    description: p?.description ?? p?.shortDescription ?? null,
    destination: p?.ufiDetails?.bCityName ?? p?.cityName ?? null,
    price: fromPrice,
    from_price: fromPrice,
    currency: price?.currency ?? "USD",
    duration: durationText,
    duration_text: durationText,
    rating: rating != null ? Number(rating) : null,
    review_count: reviewCount != null ? Number(reviewCount) : null,
    category: p?.primaryCategory?.name ?? null,
    images,
    image: images[0] ?? null,
    thumbnail: images[0] ?? null,
    source_url: p?.productUrl ?? null,
    source: "booking" as const,
    raw: p,
  };
}

/* =========================== CARS / TRANSFERS ====================== */

export async function bookingSearchCars(input: {
  pickup: string;
  drop: string;
  date?: string;
  time?: string;
}): Promise<{ ok: boolean; vehicles: any[]; error?: string }> {
  if (!process.env.RAPIDAPI_BOOKING_KEY) return { ok: true, vehicles: [] };
  try {
    // Resolve pickup -> lat/lng via flights/searchDestination (returns geo)
    const geo = await bookingResolveAirportGeo(input.pickup);
    if (!geo) return { ok: true, vehicles: [] };
    const dropGeo = (await bookingResolveAirportGeo(input.drop)) ?? geo;

    const params = new URLSearchParams({
      pick_up_latitude: String(geo.lat),
      pick_up_longitude: String(geo.lng),
      drop_off_latitude: String(dropGeo.lat),
      drop_off_longitude: String(dropGeo.lng),
      pick_up_time: input.time || "10:00",
      drop_off_time: input.time || "10:00",
      driver_age: "30",
      currency_code: "USD",
      location: "US",
    });
    if (input.date) {
      params.set("pick_up_date", input.date);
      params.set("drop_off_date", input.date);
    }
    const { status, text } = await bFetch("booking-cars", `${BASE}/api/v1/cars/searchCarRentals?${params.toString()}`);
    if (status >= 400) return { ok: false, vehicles: [], error: `Booking.com cars: HTTP ${status}` };
    const json = safeJson(text);
    const list = json?.data?.search_results ?? [];
    const vehicles = list.slice(0, 50).map((v: any) => normalizeBookingCar(v));
    return { ok: true, vehicles };
  } catch (e: any) {
    return { ok: false, vehicles: [], error: String(e?.message ?? e) };
  }
}

async function bookingResolveAirportGeo(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status, text } = await bFetch(
      "booking-cars",
      `${BASE}/api/v1/flights/searchDestination?query=${encodeURIComponent(query)}`,
    );
    if (status >= 400) return null;
    const json = safeJson(text);
    const top = (json?.data ?? [])[0];
    if (top?.coordinates?.latitude != null && top?.coordinates?.longitude != null) {
      return { lat: Number(top.coordinates.latitude), lng: Number(top.coordinates.longitude) };
    }
    if (top?.latitude != null && top?.longitude != null) {
      return { lat: Number(top.latitude), lng: Number(top.longitude) };
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeBookingCar(v: any) {
  const veh = v?.vehicle_info ?? {};
  const supplier = v?.supplier_info ?? {};
  const price = v?.pricing_info ?? {};
  return {
    id: `booking-${v?.vehicle_id ?? v?.search_key ?? Math.random().toString(36).slice(2)}`,
    vehicle_id: String(v?.vehicle_id ?? ""),
    title: veh?.v_name ?? `${veh?.group ?? "Vehicle"}`,
    subtitle: supplier?.name ?? null,
    seats: Number(veh?.seats ?? 0) || null,
    bags: Number(veh?.suitcases ?? veh?.big_suitcases ?? 0) || null,
    transmission: veh?.transmission ?? null,
    air_conditioning: veh?.airconditioning === "1" || veh?.airconditioning === true,
    image: veh?.image_url ?? veh?.image_thumbnail_url ?? null,
    price: price?.drive_away_price != null ? Number(price.drive_away_price) : null,
    currency: price?.drive_away_price_currency ?? price?.currency ?? "USD",
    supplier_name: supplier?.name ?? null,
    supplier_logo: supplier?.logo_url ?? null,
    source: "booking" as const,
    raw: v,
  };
}
