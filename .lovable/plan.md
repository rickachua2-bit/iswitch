Booking.com flight results already merge with Duffel and sort by price ascending, but two things are wrong vs. the user's requirements:

1. **Order**: Today the merge puts Duffel first (`[...duffelOffers, ...bookingOffers].sort(...)`). The sort makes price the primary key, but ties favor Duffel because it appears first. The user wants Booking.com first as the primary list, with Duffel coming after.
2. **Images**: `normalizeBookingFlight` drops the airline logo URL Booking.com returns at `legs[0].carriersData[0].logo`, and never collects per-leg logos for connecting flights. The card currently renders airline marks via Airhex/Kiwi/avs.io URLs derived from IATA codes, ignoring the Booking-supplied logo entirely. We also drop other media Booking.com sends (operating carrier logos, flag emojis on segments).

### Changes

**1. `src/server/booking.server.ts` — capture all flight imagery**
- In `normalizeBookingFlight`, build for each leg:
  - `marketing_carrier_logo` from `leg.carriersData[0].logo`
  - `operating_carrier`, `operating_carrier_iata`, `operating_carrier_logo` from `leg.carriersData[1]` (often the operator) when present
  - `cabin_class`, `flight_stops`, `aircraft` (from `leg.flightInfo`) so the existing card details surface real Booking.com data
- At offer level, expose `owner_logo` (already there) plus a new `carrier_logos: string[]` aggregating every distinct airline logo URL across all legs, and `source: "booking"` (already there).

**2. `src/components/flights/FlightResultCard.tsx` — render real airline images**
- Update `CarrierBadge` to accept an optional `logoUrl` prop. When `logoUrl` is provided, render it as the first image source ahead of the Airhex/Kiwi/avs.io fallbacks. This way Booking.com images show first, with the existing IATA-based fallbacks if the URL fails to load.
- Wherever `CarrierBadge` is used (in slice headers and segment rows), pass the leg's `marketing_carrier_logo` (and `operating_carrier_logo` when shown).
- Add a small "Booking.com" / "Duffel" source pill in the header strip so users see provenance, mirroring the Stays card.

**3. `src/server/travsify.ts` — Booking.com first, then Duffel, each sorted ascending**
- In both `startFlightSearch` and the deprecated `searchFlights`, replace the single combined sort with:

  ```
  const bookingSorted = [...bookingOffers].sort(byPriceAsc);
  const duffelSorted  = [...duffelOffers].sort(byPriceAsc);
  const merged = [...bookingSorted, ...duffelSorted];
  ```

  using a `byPriceAsc` helper that pushes invalid/zero prices to the end (same pattern we just applied to hotels in `searchHotels`). This guarantees the cheapest Booking.com result is at position 0, all Booking.com offers come before any Duffel offer, and within each group prices ascend.

**4. Pass user currency through (consistency with hotels/tours)**
- `src/routes/flights.search.tsx` loader (or wherever `startFlightSearch` is called) — forward `getUserCurrencyCode()` from `src/lib/user-currency.ts` as `data.currency` so Booking.com returns prices in the user's selected display currency natively. The card already runs amounts through `usePriceFormat`, so display will stay correct even if a provider returns a different currency.

### Verification
- Search LOS → DXB, confirm the first result on the page is a Booking.com offer (source pill = "Booking.com") and prices ascend within Booking.com block, then Duffel block restarts ascending.
- Confirm carrier badges on Booking.com offers show the real airline logo from `carriersData[0].logo` (Network tab: image URL hosted on `r-xx.bstatic.com` or similar).
- Switch currency to NGN, search again — Booking.com pill prices show in ₦.