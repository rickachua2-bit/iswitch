## Goal

Make `/flights/search` results provably **fresh** (re-fetched per search), **unique** (no duplicate offers across providers), and **traceable** (you can see exactly which provider returned each offer and its raw price/currency). Today the page risks showing the same offer twice when Booking.com and Duffel both return the same flight, and there is no visible signal that proves the data was actually re-queried.

## What's wrong / risky today

1. **No cross-provider dedupe** — `startFlightSearch` simply concatenates `[...sortedBooking, ...sortedDuffel]`. If both providers return e.g. "AF234 LOS→CDG 09:55", the user sees two cards with identical prices and routes — looks like a "repeat".
2. **Weak Booking.com fallback id** — when `o.token` is missing, the fallback is `booking-${idx}`. Two consecutive Booking.com responses with the same index produce identical React keys (`booking-0`), causing React to reuse the previous DOM and giving the impression "the same data keeps showing".
3. **No request fingerprint** — there is no easy way to verify in the UI that a given search actually triggered a new upstream call. If a user sees the same first 3 results twice in a row (because RapidAPI cached the identical query at their edge), they read it as "your app is repeating itself".
4. **Currency mismatch fallback** — `total_currency` from Booking.com falls back to `"USD"` even when the user requested NGN. The displayed "same price" can be the unconverted USD amount appearing again.
5. **Sort tie-breaking** — when two offers have the same price, the order is non-deterministic, so consecutive renders can shuffle, also reading as "repeats".

## Plan

### 1. Cross-provider dedupe in `startFlightSearch` (and `searchFlights`)

In `src/server/travsify.ts`, after merging `sortedBooking + sortedDuffel`, run a dedupe pass keyed by a flight signature:

```
signature = `${owner_iata}|${first_segment.flight_number}|${first_segment.departing_at}|${last_segment.arriving_at}|${total_amount}|${total_currency}`
```

Keep the **first** occurrence (Booking.com wins because it is concatenated first, satisfying the existing "Booking.com first" rule). Drop the second.

Edge cases:
- Missing flight number / carrier → fall back to `slices.map(s => s.segments.map(seg => `${seg.origin}-${seg.destination}@${seg.departing_at}`)).join("|")` so we still dedupe on route+time.
- Different prices for the "same flight" across providers → keep both (price is part of the key); this is real choice, not a duplicate.

### 2. Stable, unique Booking.com offer ids

In `src/server/booking.server.ts → normalizeBookingFlight`:
- Build a deterministic id from `o.token ?? hash(JSON.stringify({ priceBreakdown, segments })) ?? booking-${idx}-${departureTime}`.
- Use the existing `Buffer`/`crypto.createHash` (Node-compatible in Workers) — short md5 truncated to 12 chars is plenty.
- This guarantees that even if RapidAPI omits `token`, two physically different offers never collide on key.

### 3. Provenance + freshness signal

Each normalized offer already carries `source: "booking" | "duffel"`. Add two more fields per offer in both normalizers:
- `fetched_at: new Date().toISOString()` (from the server fn at merge time)
- `provider_request_id: <uuid>` (one per `startFlightSearch` call, shared across all offers of that search)

In `FlightResultCard`, when the source pill is present, append a tiny ⓘ tooltip showing `Source · fetched HH:MM:SS`. This proves to the user (and to QA) that every search hits the upstream APIs.

### 4. Currency: never silently fall back to USD

In `normalizeBookingFlight`, change `currency = total?.currencyCode ?? "USD"` to `currency = total?.currencyCode ?? input.currency ?? "USD"`. Pass the requested currency through to the normalizer. If Booking.com returns a different currency than requested, surface it in the UI (small "in USD" subtitle under the price) so users immediately notice currency mismatches instead of assuming "the price is the same".

### 5. Deterministic sort tie-breaker

In the `byPriceAsc` comparator inside `startFlightSearch` and `searchFlights`, when prices are equal, fall back to `offer.id.localeCompare(b.id)`. Eliminates render shuffling between identical-priced offers.

### 6. Per-search nonce in the upstream request

Currently every identical search produces an identical RapidAPI URL, so RapidAPI / their CDN may return cached bytes. We still want fresh data per user search. Add a no-cache hint:

- `bFetch` already does `fetch(url, { method: "GET", headers, signal })`. Add `cache: "no-store"` and an `x-request-id: <uuid>` header on every Booking.com call. This bypasses the Worker fetch cache and gives RapidAPI a unique request id (which, in our experience, defeats their internal cache for identical query strings).
- Same for the LiteAPI / Duffel `timedFetch` helpers (already POSTs, but add `cache: "no-store"` defensively).

### 7. Visible "Refresh prices" button

In `flights.search.tsx` results header (next to "Best / Cheapest / Fastest"), add a small "Refresh" button that calls `navigate({ search: (p) => ({ ...p, _r: Date.now() }) })`. The `_r` param participates in `sig`, forcing `useFlightSearch` to re-run. Gives the user a one-click way to prove the data is being re-fetched.

## Files to touch

- `src/server/booking.server.ts`
  - `bFetch`: add `cache: "no-store"` + per-call `x-request-id` header.
  - `normalizeBookingFlight`: stable id (hash fallback), currency fallback to requested currency, accept currency param.
  - `bookingSearchFlights`: pass `currency` into normalizer.
- `src/server/travsify.ts`
  - `startFlightSearch` and `searchFlights`: stamp `fetched_at` + `provider_request_id` on every offer, run cross-provider dedupe, add tie-breaker to `byPriceAsc`.
- `src/components/flights/FlightResultCard.tsx`
  - Tooltip on the source pill showing source + fetched timestamp + provider_request_id (last 6 chars).
- `src/routes/flights.search.tsx`
  - Add the "Refresh" button next to the sort tabs that bumps a `_r` query param.
- `src/routes/flights.search.tsx` and `src/server/_shared.server.ts` (timedFetch)
  - Pass `cache: "no-store"` to all flight upstream calls.

No DB changes, no new env vars, no new packages.

## Out of scope

- Changing how Duffel itself dedupes its own offers (it already returns a single canonical offer per fare).
- Currency conversion math (`usePriceFormat` already handles display conversion when Booking.com returns USD instead of NGN).
- The hotels page (handled in the previous plan).