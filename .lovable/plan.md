
# Add Booking.com (RapidAPI) as a multi-provider source

Add a new provider — **Booking.com via RapidAPI** (`booking-com15.p.rapidapi.com`) — that powers four verticals:

- **Flights** — alongside Duffel (multi-provider, results merged)
- **Hotels** — alongside LiteAPI (multi-provider, results merged)
- **Tours** — Booking.com only (replaces crawled inventory)
- **Car transfers / pickups** — Booking.com only (replaces crawled inventory)

Visas and insurance are out of scope for this round.

---

## 1. Store the API key as a secret

Save the RapidAPI key you provided as a runtime secret named `RAPIDAPI_BOOKING_KEY` (value: `84cf8956demshf3767691d2a730dp15d3ffjsn9d699ee2e168`). The host header `booking-com15.p.rapidapi.com` is hard-coded in the integration file (not a secret).

Note: keys pasted in chat are visible in chat history. After this lands you should rotate the key in the RapidAPI dashboard and update the secret with the new value.

## 2. Register the provider in `provider-keys.server.ts`

Extend `KEY_MAP` with a `booking` entry mapping to `RAPIDAPI_BOOKING_KEY` (live + test point at the same secret for now since RapidAPI doesn't expose a separate sandbox). This makes mode switching, health checks, and the admin "API Providers" UI work uniformly.

## 3. New server module: `src/server/booking.functions.ts`

A single file exposing four `createServerFn` endpoints, all calling `booking-com15.p.rapidapi.com` through `timedFetch` (so latency + error counters land in the existing `provider_health_events` table):

- `searchBookingFlights` — `/api/v1/flights/searchFlights` (departure/arrival airport codes, date, adults, children, cabin) → normalized to the same shape as Duffel offers (`{ id, total_amount, total_currency, owner, slices: [...] }`) so `FlightResultCard` renders both seamlessly.
- `searchBookingHotels` — `/api/v1/hotels/searchHotels` (dest_id resolved via `/api/v1/hotels/searchDestination`, checkin/checkout, adults, rooms, currency) → normalized to LiteAPI's hotel shape (`{ id, offer_id, price, currency, room_name, raw }`).
- `searchBookingTours` — `/api/v1/attraction/searchAttractions` (city query, date, participants) → normalized to the existing tour shape consumed by `tours.tsx`.
- `searchBookingCars` — `/api/v1/cars/searchCarRentals` (the curl you shared: lat/lng, pickup/dropoff time, driver_age, currency) → normalized to the vehicle shape consumed by `pickups.tsx`. For pickups we'll resolve the airport/city to lat/lng via `/api/v1/flights/searchDestination` (returns geo) so the user can keep typing "Murtala Muhammed Airport".

Common headers helper:
```ts
{ "x-rapidapi-host": "booking-com15.p.rapidapi.com",
  "x-rapidapi-key": process.env.RAPIDAPI_BOOKING_KEY,
  "Accept": "application/json" }
```

Each handler returns `{ ok, error?, items: [...] }` and never throws — same convention as `duffel.functions.ts`/`liteapi.functions.ts`.

## 4. Multi-provider merge for flights & hotels

Two thin orchestrators:

- `src/server/flights-search.functions.ts` → calls `searchFlights` (Duffel) and `searchBookingFlights` in parallel with `Promise.allSettled`, tags each offer with `source: "duffel" | "booking"`, merges, and sorts by total price. Either provider failing just drops its results (the other still renders).
- `src/server/hotels-search.functions.ts` → same pattern for `searchHotels` (LiteAPI) + `searchBookingHotels`.

`flights.search.tsx` and `stays.tsx` switch their loader to call the new orchestrators. The existing `FlightResultCard` and hotel card components keep working because the booking results are normalized to the same shape; we only add a small "via Booking.com" / "via Duffel" badge.

## 5. Tours and pickups switch to Booking.com

- `tours.tsx` loader → call `searchBookingTours` instead of `searchTours` (travsify).
- `pickups.tsx` loader → call `searchBookingCars` (after resolving pickup → lat/lng) instead of `searchTransfers`.

The travsify functions stay in the codebase as a fallback but are no longer wired in.

## 6. Admin: register the provider rows

Insert four `providers` rows so health probes, mode toggles, and the Operations dashboard pick it up automatically:

| slug | name | vertical | kind | base_url |
|---|---|---|---|---|
| `booking-flights` | Booking.com (Flights) | flights | api | `https://booking-com15.p.rapidapi.com` |
| `booking-hotels`  | Booking.com (Hotels)  | stays   | api | same |
| `booking-tours`   | Booking.com (Tours)   | tours   | api | same |
| `booking-cars`    | Booking.com (Cars)    | pickups | api | same |

Extend `testProvider` in `api-providers.functions.ts` with a small case for any `booking-*` slug that hits `/api/v1/meta/getCountries` (cheap health probe) and records the result.

## 7. Booking flow & checkout

Booking.com on RapidAPI returns search results but does **not** issue tickets/reservations on its own — it's a search/aggregator. So for any "book" action on a Booking.com result we route the user through the same `createUnifiedBooking` + Korapay checkout flow that crawled inventory uses today (the `provider_slug` will be `booking-flights` / `booking-hotels` / etc., and fulfillment is manual via the Operations dashboard, identical to the current crawled-inventory flow). Duffel and LiteAPI keep their existing native order-creation flow for their own results.

This is the only behavioral asymmetry — worth confirming you're OK with manual fulfillment for Booking.com results before we ship payment-confirmed bookings.

---

## Out of scope (next round)

- Visas and insurance (you said we'll do these after this lands).
- Replacing travsify entirely — left in place as a fallback.
- A separate "Booking.com test" key — the RapidAPI plan is single-key.

## Files touched

**New**
- `src/server/booking.functions.ts`
- `src/server/flights-search.functions.ts`
- `src/server/hotels-search.functions.ts`

**Edited**
- `src/server/provider-keys.server.ts` (register `booking`)
- `src/server/api-providers.functions.ts` (health probe case)
- `src/routes/flights.search.tsx` (use merged orchestrator)
- `src/routes/stays.tsx` (use merged orchestrator)
- `src/routes/tours.tsx` (switch to Booking)
- `src/routes/pickups.tsx` (switch to Booking)

**Migration**
- Insert four `providers` rows.

**Secret**
- Add `RAPIDAPI_BOOKING_KEY`.
