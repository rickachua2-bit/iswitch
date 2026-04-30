All Booking.com data is already converted at display time via `usePriceFormat` (it converts provider currency → user's selected currency using the `currencies.rate_to_usd` table). The remaining gaps:

1. Booking.com's API is queried with a hardcoded `"USD"` for hotels and tours, so prices come back in USD then get re-converted client-side. We should ask Booking.com directly for the user's selected currency — fewer rounding errors and more accurate Booking.com merchant pricing.
2. The "Your budget per night" slider on the hotels page labels its max with `formatPrice(maxPrice, "USD")` (correct) but the slider's `min`/`max` values are fixed in USD. The label converts, so users in NGN see e.g. "₦750,000" max — that part already works.
3. A few helper price displays (search summary, footnotes) should also go through `usePriceFormat` so they always show the user's currency.

### Changes

**1. Pass user currency into hotel/tour search**
- `src/hooks/use-currency.tsx` — already exposes `currency.code`. No change.
- `src/routes/stays.tsx` loader — read currency from a small client-side helper and pass it instead of hardcoded `"USD"`. Loaders run on both client and server, so we read `localStorage.getItem("iswitch.currency")` (with `"USD"` fallback) and pass it as `data.currency`.
- `src/routes/tours.tsx` loader — same approach: pass user currency to `searchTours`.

**2. Forward the currency to Booking.com**
- `src/server/travsify.ts` `searchHotels` — already forwards `data.currency` to `bookingSearchHotels`. No change needed beyond confirming.
- `src/server/travsify.ts` `searchTours` — extend the input schema to accept `currency`, and forward to `bookingSearchTours`.
- `src/server/booking.server.ts` `bookingSearchTours` — accept `currency`, use it for `currency_code` instead of hardcoded `"USD"`.

**3. Hotels page price displays**
- `src/routes/stays.tsx` "Your budget per night" label — keep `formatPrice(maxPrice, "USD")`; that's already correct because `formatPrice` converts USD → user currency.
- `src/routes/stays.tsx` `HotelResultCard` — already calls `formatPrice(nightly, currency)` for the nightly rate, total, and strikethrough. Confirm no raw amounts are emitted.
- The `excluded_price` (taxes excluded) field added in the previous step isn't shown on the card; if we want users to see it in their currency, render `formatPrice(h.excluded_price, currency)` in a small "+ taxes" footnote below the price.

**4. Tour cards**
- `src/routes/tours.tsx` cards — they currently show prices via local helpers. Verify they go through `usePriceFormat`; if any spot uses raw `tour.price` + `tour.currency` directly, route it through `formatPrice` so it shows in the user's local currency.

### Verification
- Switch the currency in the header to NGN, then run a hotels search for Dubai. Confirm prices on each card show "₦…" not "$…".
- Switch to EUR, GBP, USD — same result, just the symbol/values change.
- Open the network tab: the Booking.com `searchHotels` call should send the chosen currency in `currency_code`.