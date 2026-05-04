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
    const baseHeaders = bHeaders();
    if (!baseHeaders) throw new Error("RAPIDAPI_BOOKING_KEY not configured");
    // Add a per-request id and disable runtime caching so identical searches
    // still hit the upstream API rather than serving stale bytes.
    const reqId = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
    const headers = { ...baseHeaders, "x-request-id": reqId, "cache-control": "no-cache" };
    const res = await fetch(url, { method: "GET", headers, signal: ctrl.signal, cache: "no-store" });
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
    const requestedCurrency = (input.currency ?? "USD").toUpperCase();
    const offers = flightOffers.slice(0, 50).map((o: any, idx: number) => normalizeBookingFlight(o, idx, requestedCurrency));
    return { ok: true, offers };
  } catch (e: any) {
    return { ok: false, offers: [], error: String(e?.message ?? e) };
  }
}

function normalizeBookingFlight(o: any, idx: number, requestedCurrency = "USD") {
  // Booking.com offer shape (abbreviated): { token, segments: [{ legs: [...] }], priceBreakdown: { total: { units, currencyCode } } }
  const total = o?.priceBreakdown?.total ?? {};
  const totalAmount = (Number(total?.units ?? 0) + Number(total?.nanos ?? 0) / 1e9).toFixed(2);
  // Never silently fall back to USD: prefer Booking's currency, then the
  // currency the user actually requested, then USD as last resort.
  const currency = total?.currencyCode ?? requestedCurrency ?? "USD";

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

  // Stable id: prefer Booking's token; otherwise build a content fingerprint
  // so two physically different offers never collide on key.
  let id: string = o?.token ?? "";
  if (!id) {
    const fingerprint = JSON.stringify({
      p: totalAmount,
      c: currency,
      s: slices.map((sl: any) => sl.segments?.map((sg: any) => `${sg.marketing_carrier_iata}${sg.flight_number}@${sg.departing_at}->${sg.arriving_at}`)),
    });
    let h = 0;
    for (let i = 0; i < fingerprint.length; i++) h = ((h << 5) - h + fingerprint.charCodeAt(i)) | 0;
    id = `booking-${idx}-${(h >>> 0).toString(36)}`;
  }

  return {
    id,
    total_amount: totalAmount,
    total_currency: currency,
    requested_currency: requestedCurrency,
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

const HOTEL_SEARCH_PAGE_COUNT = 5;

function extractBookingHotelRows(json: any): any[] {
  const data = json?.data;
  const candidates = [
    data?.hotels,
    data?.result,
    data?.results,
    data?.search_results,
    data?.properties,
    data?.propertyResults,
    data?.property_results,
    json?.results,
    json?.hotels,
    Array.isArray(data) ? data : null,
  ];
  for (const value of candidates) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function sortByHotelPrice(a: any, b: any) {
  const pa = Number(a?.price);
  const pb = Number(b?.price);
  const aBad = !Number.isFinite(pa) || pa <= 0;
  const bBad = !Number.isFinite(pb) || pb <= 0;
  if (aBad && bBad) return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  if (aBad) return 1;
  if (bBad) return -1;
  if (pa !== pb) return pa - pb;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

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

    // Booking.com expects search_type as upper-case enum (CITY/REGION/COUNTRY/DISTRICT…).
    const searchType = String(dest.dest_type ?? "city").toUpperCase();

    const baseParams = new URLSearchParams({
      dest_id: String(dest.dest_id),
      search_type: searchType,
      arrival_date: input.checkin,
      departure_date: input.checkout,
      adults: String(Math.max(1, input.adults)),
      room_qty: String(Math.max(1, input.rooms)),
      currency_code: (input.currency ?? "USD").toUpperCase(),
      page_number: "1",
      sort_by: "price",
      languagecode: "en-us",
      units: "metric",
      temperature_unit: "c",
    });
    const buildUrl = (page: number) => {
      const params = new URLSearchParams(baseParams);
      params.set("page_number", String(page));
      return `${BASE}/api/v1/hotels/searchHotels?${params.toString()}`;
    };

    const first = await bFetch("booking-hotels", buildUrl(1));
    if (first.status >= 400) return { ok: false, hotels: [], error: `Booking.com hotels: HTTP ${first.status}` };

    const rest = await Promise.all(
      Array.from({ length: HOTEL_SEARCH_PAGE_COUNT - 1 }, (_, i) =>
        bFetch("booking-hotels", buildUrl(i + 2)).catch(() => null),
      ),
    );
    const rawList = [first, ...rest]
      .filter((page): page is { status: number; text: string; ms: number } => !!page && page.status < 400)
      .flatMap((page) => extractBookingHotelRows(safeJson(page.text)));

    const seen = new Set<string>();
    const hotels = rawList
      .map((h: any, idx: number) => normalizeBookingHotel(h, input.currency ?? "USD", idx))
      .filter((h: any) => h && h.id)
      .filter((h: any) => {
        const key = String(h.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(sortByHotelPrice);
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
    const list: any[] =
      (Array.isArray(json?.data) && json.data) ||
      (Array.isArray(json?.data?.destinations) && json.data.destinations) ||
      (Array.isArray(json?.data?.results) && json.data.results) ||
      [];
    if (!list.length) return null;
    // Prefer city > region > country
    const ranked = [...list].sort((a, b) => {
      const score = (x: any) => {
        const t = String(x?.search_type ?? x?.dest_type ?? "").toLowerCase();
        if (t === "city") return 0;
        if (t === "region") return 1;
        if (t === "district") return 2;
        if (t === "country") return 3;
        return 4;
      };
      return score(a) - score(b);
    });
    const top = ranked[0];
    const id = top?.dest_id ?? top?.id;
    if (!id) return null;
    return { dest_id: String(id), dest_type: top?.search_type ?? top?.dest_type ?? "city" };
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

function normalizeBookingHotel(h: any, fallbackCurrency: string, idx = 0) {
  const prop = h?.property ?? h;
  const breakdown = prop?.priceBreakdown ?? h?.priceBreakdown ?? h?.price_breakdown ?? {};
  const gross = breakdown?.grossPrice ?? breakdown?.gross_price ?? null;
  const strike = breakdown?.strikethroughPrice ?? breakdown?.strikethrough_price ?? null;
  const benefit = breakdown?.benefitBadges ?? breakdown?.benefit_badges ?? [];
  const excluded = breakdown?.excludedPrice ?? breakdown?.excluded_price ?? null;

  // Robust price extraction — Booking.com returns prices in many shapes.
  const priceCandidates = [
    gross?.value,
    gross?.amount,
    breakdown?.gross_amount?.value,
    breakdown?.gross_amount_per_night?.value,
    prop?.minTotalPrice,
    prop?.min_total_price,
    h?.min_total_price,
    h?.price,
    h?.composite_price_breakdown?.gross_amount_per_night?.value,
    h?.composite_price_breakdown?.gross_amount?.value,
  ];
  let amount: number | null = null;
  for (const c of priceCandidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) { amount = n; break; }
  }
  const original = strike?.value != null ? Number(strike.value) : null;
  const currency =
    gross?.currency ?? gross?.currencyCode ?? strike?.currency ?? breakdown?.currency ?? fallbackCurrency;
  const discountPct = original && amount && original > amount
    ? Math.round(((original - amount) / original) * 100) : 0;

  // Photos: dedupe + prefer high-res when available
  const photoSet = new Set<string>();
  const photoCandidates = [
    prop?.mainPhotoUrl,
    prop?.main_photo_url,
    h?.main_photo_url,
    prop?.photoMainUrl,
    prop?.cover_photo,
  ];
  for (const u of photoCandidates) if (typeof u === "string" && u) photoSet.add(u);
  const photoArrays = [prop?.photoUrls, prop?.photo_urls, prop?.photos, h?.photos, h?.hotelImages];
  for (const arr of photoArrays) {
    if (!Array.isArray(arr)) continue;
    for (const p of arr) {
      if (typeof p === "string" && p) photoSet.add(p);
      else if (p && typeof p === "object") {
        const u = p.url ?? p.urlHd ?? p.url_max ?? p.url_original ?? p.large ?? p.image;
        if (typeof u === "string" && u) photoSet.add(u);
      }
    }
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

  // Stable id: try every plausible key, then fall back to a content fingerprint
  // so a property with an unusual response shape still renders.
  const rawId = prop?.id ?? h?.hotel_id ?? prop?.hotel_id ?? h?.id ?? prop?.idDetail ?? h?.idDetail ?? "";
  const id = String(rawId || `${(prop?.name ?? "hotel").toString().slice(0, 32).replace(/\s+/g, "-")}-${idx}`);
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

const TOUR_SEARCH_PAGE_COUNT = 3;

function encodeTourUfi(ufi: unknown): string | null {
  if (ufi == null) return null;
  try {
    return Buffer.from(JSON.stringify({ ufi: Number(ufi) })).toString("base64");
  } catch {
    return null;
  }
}

function extractBookingTourRows(json: any): any[] {
  const data = json?.data;
  const candidates = [data?.products, data?.attractions, data?.results, json?.products, json?.results, Array.isArray(data) ? data : null];
  for (const value of candidates) {
    if (Array.isArray(value) && value.length) return value;
  }
  return [];
}

function sortByTourPrice(a: any, b: any) {
  const pa = Number(a?.from_price ?? a?.price);
  const pb = Number(b?.from_price ?? b?.price);
  const aBad = !Number.isFinite(pa) || pa <= 0;
  const bBad = !Number.isFinite(pb) || pb <= 0;
  if (aBad && bBad) return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  if (aBad) return 1;
  if (bBad) return -1;
  if (pa !== pb) return pa - pb;
  return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
}

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
    // Booking-com15 attraction/searchLocation may return: { data: { destinations: [...], products: [...] } }
    // OR { data: [...] }. Prefer destinations (city ids) — `productId` is for individual attractions
    // and is NOT a valid `id` for searchAttractions.
    const destList: any[] =
      (Array.isArray(j1?.data?.destinations) && j1.data.destinations) ||
      (Array.isArray(j1?.data) && j1.data.filter((x: any) => x?.id || x?.b_id)) ||
      [];
    const productList: any[] =
      (Array.isArray(j1?.data?.products) && j1.data.products) || [];
    // Try several candidate destination IDs (Booking attractions sometimes only
    // returns a hit on the second/third entry, especially for ambiguous queries
    // like "New York" or "Dubai").
    const candidates: string[] = [];
    const add = (id: unknown) => {
      if (id == null) return;
      const value = String(id);
      if (value && !candidates.includes(value)) candidates.push(value);
    };
    for (const it of destList.slice(0, 6)) {
      add(it?.id ?? it?.b_id);
      add(encodeTourUfi(it?.ufi ?? it?.cityUfi));
    }
    for (const it of productList.slice(0, 10)) {
      add(encodeTourUfi(it?.cityUfi ?? it?.ufi));
    }
    if (!candidates.length) return { ok: true, tours: [] };

    let products: any[] = [];
    let lastStatus: number | null = null;
    for (const id of candidates) {
      const pageResults = await Promise.all(
        Array.from({ length: TOUR_SEARCH_PAGE_COUNT }, (_, i) => {
          const params = new URLSearchParams({
            id,
            sortBy: "trending",
            page: String(i + 1),
            currency_code: (input.currency ?? "USD").toUpperCase(),
            languagecode: "en-us",
          });
          if (input.date) params.set("startDate", input.date);
          return bFetch("booking-tours", `${BASE}/api/v1/attraction/searchAttractions?${params.toString()}`).catch(() => null);
        }),
      );
      for (const page of pageResults) {
        if (!page) continue;
        lastStatus = page.status;
        if (page.status >= 400) continue;
        products.push(...extractBookingTourRows(safeJson(page.text)));
      }
      if (products.length) break;
    }
    if (!products.length) {
      return {
        ok: lastStatus == null || lastStatus < 400,
        tours: [],
        error: lastStatus && lastStatus >= 400 ? `Booking.com tours: HTTP ${lastStatus}` : undefined,
      };
    }
    const seen = new Set<string>();
    const tours = products
      .map((p: any, idx: number) => normalizeBookingTour(p, idx))
      .filter((t: any) => t && t.id)
      .filter((t: any) => {
        const key = String(t.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort(sortByTourPrice);
    return { ok: true, tours };
  } catch (e: any) {
    return { ok: false, tours: [], error: String(e?.message ?? e) };
  }
}

function normalizeBookingTour(p: any, idx = 0) {
  const price = p?.representativePrice ?? p?.price ?? p?.pricing ?? p?.priceBreakdown ?? {};

  // Collect images from every plausible field — Booking attractions returns
  // images in `primaryPhoto`, `photos[]`, `images[]`, `image_urls[]`, etc.
  const images: string[] = [];
  const pp = p?.primaryPhoto ?? p?.primary_photo ?? {};
  for (const k of ["large", "medium", "small", "url", "url_max", "url_original"]) {
    const u = pp?.[k];
    if (typeof u === "string" && u && !images.includes(u)) images.push(u);
  }
  const arrays = [p?.photos, p?.images, p?.image_urls, p?.gallery];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const ph of arr) {
      const u = typeof ph === "string"
        ? ph
        : (ph?.large ?? ph?.medium ?? ph?.small ?? ph?.url ?? ph?.url_max ?? ph?.src);
      if (typeof u === "string" && u && !images.includes(u)) images.push(u);
    }
  }

  // Rating: try every shape Booking surfaces.
  const rating =
    p?.reviewsStats?.combinedNumericStats?.average ??
    p?.reviewsStats?.combinedNumericStats?.total ??
    p?.reviewsStats?.average ??
    p?.rating ??
    p?.reviewScore ??
    null;
  const reviewCount =
    p?.reviewsStats?.allReviewsCount ??
    p?.reviewsStats?.totalReviewCount ??
    p?.reviewCount ??
    p?.review_count ??
    null;

  // Duration: prefer human text; fall back to representativeDuration { value, unit }.
  let durationText: string | null = null;
  if (typeof p?.duration === "string") durationText = p.duration;
  else if (p?.representativeDuration?.value && p?.representativeDuration?.unit) {
    const v = Number(p.representativeDuration.value);
    const u = String(p.representativeDuration.unit).toLowerCase();
    if (Number.isFinite(v)) durationText = `${v} ${v === 1 ? u.replace(/s$/, "") : u}`;
  }

  // Robust price extraction across every Booking attractions shape.
  const priceCandidates = [
    price?.publicAmount,
    price?.chargeAmount,
    price?.amount,
    price?.value,
    price?.fromPrice,
    price?.from,
    price?.gross_price,
    price?.gross_amount?.value,
    p?.fromPrice,
    p?.from_price,
    p?.lowestPrice,
    p?.lowest_price,
  ];
  let fromPrice: number | null = null;
  for (const c of priceCandidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) { fromPrice = n; break; }
  }

  const rawId = p?.id ?? p?.productId ?? p?.product_id ?? p?.slug ?? p?.b_id ?? "";
  const id = String(rawId || `${(p?.name ?? "tour").toString().slice(0, 32).replace(/\s+/g, "-")}-${idx}`);

  return {
    id: `booking-${id}`,
    external_id: String(rawId ?? ""),
    title: p?.name ?? p?.title ?? "Experience",
    subtitle: p?.shortDescription ?? p?.primaryCategory?.name ?? null,
    description: p?.description ?? p?.shortDescription ?? null,
    destination: p?.ufiDetails?.bCityName ?? p?.cityName ?? null,
    price: fromPrice,
    from_price: fromPrice,
    currency: price?.currency ?? price?.currencyCode ?? "USD",
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

/* ===================== HOTEL DETAIL EXPANSION ====================== */
/**
 * Helpers used by /stays/book to surface the FULL Booking.com photo gallery
 * and the FULL list of available rooms for a single property.
 *
 * - getHotelDetails: rich property metadata (description, address, facilities…)
 * - getHotelPhotos:  every photo Booking.com exposes for the hotel
 * - getRoomList:     every available room with its own photos and price
 *
 * All three degrade gracefully — on failure we return empty arrays so the
 * /stays/book page can still render the cached search payload.
 */

export async function bookingGetHotelDetails(input: {
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency?: string;
}): Promise<{ ok: boolean; details: any | null; error?: string }> {
  if (!process.env.RAPIDAPI_BOOKING_KEY) return { ok: true, details: null };
  try {
    const params = new URLSearchParams({
      hotel_id: String(input.hotelId),
      arrival_date: input.checkin,
      departure_date: input.checkout,
      adults: String(Math.max(1, input.adults)),
      room_qty: String(Math.max(1, input.rooms)),
      units: "metric",
      temperature_unit: "c",
      languagecode: "en-us",
      currency_code: (input.currency ?? "USD").toUpperCase(),
    });
    const { status, text } = await bFetch(
      "booking-hotels",
      `${BASE}/api/v1/hotels/getHotelDetails?${params.toString()}`,
    );
    if (status >= 400) return { ok: false, details: null, error: `HTTP ${status}` };
    const json = safeJson(text);
    return { ok: true, details: json?.data ?? null };
  } catch (e: any) {
    return { ok: false, details: null, error: String(e?.message ?? e) };
  }
}

export async function bookingGetHotelPhotos(hotelId: string): Promise<{ ok: boolean; photos: string[]; error?: string }> {
  if (!process.env.RAPIDAPI_BOOKING_KEY) return { ok: true, photos: [] };
  try {
    const params = new URLSearchParams({
      hotel_id: String(hotelId),
      languagecode: "en-us",
    });
    const { status, text } = await bFetch(
      "booking-hotels",
      `${BASE}/api/v1/hotels/getHotelPhotos?${params.toString()}`,
    );
    if (status >= 400) return { ok: false, photos: [], error: `HTTP ${status}` };
    const json = safeJson(text);
    const photos = extractPhotoUrls(json?.data);
    return { ok: true, photos };
  } catch (e: any) {
    return { ok: false, photos: [], error: String(e?.message ?? e) };
  }
}

export type BookingNormalizedRoom = {
  id: string;
  name: string;
  bed_configuration: string | null;
  max_occupancy: number | null;
  photos: string[];
  board: string | null;
  refundable: boolean;
  cancellation_until: string | null;
  price: number | null;
  currency: string;
  badges: string[];
  description: string | null;
  highlights: string[];
};

export async function bookingGetRoomList(input: {
  hotelId: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
  currency?: string;
}): Promise<{ ok: boolean; rooms: BookingNormalizedRoom[]; error?: string }> {
  if (!process.env.RAPIDAPI_BOOKING_KEY) return { ok: true, rooms: [] };
  try {
    const fallbackCurrency = (input.currency ?? "USD").toUpperCase();
    const params = new URLSearchParams({
      hotel_id: String(input.hotelId),
      arrival_date: input.checkin,
      departure_date: input.checkout,
      adults: String(Math.max(1, input.adults)),
      room_qty: String(Math.max(1, input.rooms)),
      units: "metric",
      temperature_unit: "c",
      languagecode: "en-us",
      currency_code: fallbackCurrency,
    });
    const { status, text } = await bFetch(
      "booking-hotels",
      `${BASE}/api/v1/hotels/getRoomList?${params.toString()}`,
    );
    if (status >= 400) return { ok: false, rooms: [], error: `HTTP ${status}` };
    const json = safeJson(text);
    const rooms = extractRoomList(json?.data, fallbackCurrency);
    rooms.sort((a, b) => {
      const pa = a.price ?? Number.POSITIVE_INFINITY;
      const pb = b.price ?? Number.POSITIVE_INFINITY;
      return pa - pb;
    });
    return { ok: true, rooms };
  } catch (e: any) {
    return { ok: false, rooms: [], error: String(e?.message ?? e) };
  }
}

/* ----- internal extractors (Booking.com payloads are deeply nested) ----- */

function extractPhotoUrls(data: any): string[] {
  const out = new Set<string>();
  const visit = (val: any) => {
    if (!val) return;
    if (typeof val === "string") {
      if (/^https?:\/\//.test(val) && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(val)) out.add(val);
      return;
    }
    if (Array.isArray(val)) { for (const v of val) visit(v); return; }
    if (typeof val === "object") {
      // Common keys returned by the booking-com15 photos endpoint
      const direct = val.url ?? val.url_max ?? val.url_original ?? val.url_max1280 ?? val.url_max750
        ?? val.url_1440 ?? val.url_640x200 ?? val.photo_url ?? val.src ?? val.large ?? val.image;
      if (typeof direct === "string") visit(direct);
      for (const v of Object.values(val)) visit(v);
    }
  };
  visit(data);
  // Prefer the largest variant when both small/large exist for the same id by
  // keeping URLs that look like /max1280/ or /original/ first.
  const all = Array.from(out);
  return all.sort((a, b) => weight(b) - weight(a));
}

function weight(u: string): number {
  if (/original/i.test(u)) return 5;
  if (/max1440|max1280/i.test(u)) return 4;
  if (/max750|max1024/i.test(u)) return 3;
  if (/max500|640x|square480/i.test(u)) return 2;
  return 1;
}

function extractRoomList(data: any, fallbackCurrency: string): BookingNormalizedRoom[] {
  // The booking-com15 payload exposes:
  //   data.rooms = { "<roomId>": { name, photos: [{ url_max, ...}], facilities, bed_configurations, ... } }
  //   data.block = [ { room_id, name, refundable, mealplan, room_count, min_price, ... } ]
  if (!data) return [];
  const roomsMap: Record<string, any> = data.rooms ?? {};
  const blocks: any[] = Array.isArray(data.block) ? data.block : [];

  // Pick the cheapest block per room_id so each room appears once.
  const byRoomId = new Map<string, any>();
  for (const b of blocks) {
    const rid = String(b?.room_id ?? "");
    if (!rid) continue;
    const price = pickBlockPrice(b);
    const existing = byRoomId.get(rid);
    if (!existing || (price != null && (existing.__price == null || price < existing.__price))) {
      byRoomId.set(rid, { ...b, __price: price });
    }
  }

  const out: BookingNormalizedRoom[] = [];
  for (const [rid, info] of Object.entries(roomsMap)) {
    const block = byRoomId.get(rid) ?? null;
    const photos = extractPhotoUrls(info?.photos ?? info?.images ?? []);
    const beds = pickBedConfig(info?.bed_configurations);
    const maxOccupancy = Number(block?.nr_adults ?? info?.max_occupancy ?? 0) || null;
    const board = block?.mealplan ?? block?.board ?? null;
    const refundable = !!(block?.refundable ?? block?.refundable_until ?? false);
    const cancellationUntil = block?.refundable_until ?? block?.paymenttiming_details?.deadline_datetime ?? null;
    const price = block?.__price ?? null;
    const currency = block?.price_breakdown?.currency
      ?? block?.product_price_breakdown?.gross_amount?.currency
      ?? fallbackCurrency;
    const badges: string[] = [];
    if (refundable) badges.push("Free cancellation");
    if (block?.breakfast_included) badges.push("Breakfast included");
    if (block?.is_no_prepayment_block) badges.push("No prepayment");
    out.push({
      id: rid,
      name: String(info?.name ?? block?.name_without_policy ?? block?.room_name ?? `Room ${rid}`),
      bed_configuration: beds,
      max_occupancy: maxOccupancy,
      photos,
      board: board ? String(board) : null,
      refundable,
      cancellation_until: cancellationUntil ? String(cancellationUntil) : null,
      price,
      currency: String(currency),
      badges,
      description: typeof info?.description === "string" ? info.description : null,
      highlights: extractHighlights(info?.highlights),
    });
  }
  return out;
}

function pickBlockPrice(b: any): number | null {
  const candidates = [
    b?.product_price_breakdown?.gross_amount_per_night?.value,
    b?.product_price_breakdown?.gross_amount?.value,
    b?.price_breakdown?.gross_price,
    b?.min_price?.price,
    b?.gross_price,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function pickBedConfig(beds: any): string | null {
  if (!Array.isArray(beds) || !beds.length) return null;
  const cfg = beds[0];
  if (!cfg) return null;
  if (typeof cfg === "string") return cfg;
  const types: any[] = cfg.bed_types ?? [];
  return types.map((t) => `${t?.count ?? 1} × ${t?.name ?? t?.bed_type ?? "bed"}`).join(", ") || null;
}

function extractHighlights(h: any): string[] {
  if (!Array.isArray(h)) return [];
  return h.map((x: any) => (typeof x === "string" ? x : x?.translated_name ?? x?.name)).filter(Boolean).slice(0, 8);
}
