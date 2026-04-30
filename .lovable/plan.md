Make Booking.com hotel results take priority and sort cheapest first, plus pull every useful field out of the Booking.com property payload so the cards can show full property data.

### 1. Reorder hotel results (server)
File: `src/server/travsify.ts` — `searchHotels` handler.
- After fetching from both providers, build the final list as: **Booking.com first, then LiteAPI**.
- Sort each group **ascending by price** before concatenating, so the cheapest Booking.com hotel is at the very top, followed by the rest of Booking, then the cheapest LiteAPI, etc.
- Hotels with no price get pushed to the bottom of their group instead of being treated as `0`.
- Tag each hotel with `source: "booking" | "liteapi"` (already done) so the UI can show a badge.

### 2. Enrich Booking.com property normalization (server)
File: `src/server/booking.server.ts` — `normalizeBookingHotel`.
Pull every useful field exposed by Booking.com's `searchHotels` payload:

- **Pricing**: `price`, `original_price` (strikethrough), `currency`, `taxes_included` flag, `discount_pct`, `price_breakdown` (gross/net/excluded charges), benefit badges (e.g. "Genius discount").
- **Identity**: `id`, `name`, `accommodation_type` (Hotel / Apartment / Resort / Villa / Hostel / Guest house — mapped from `accommodationTypeId`).
- **Location**: `address`, `district`, `city`, `country`, `country_code`, `latitude`, `longitude`, `distance_to_center` if present.
- **Quality signals**: `stars` (`accuratePropertyClass` preferred, then `propertyClass`), `review_score`, `review_score_word`, `review_count`, `ranking_score`.
- **Policies**: `refundable` (`isFreeCancellable`), `checkin_from`, `checkin_until`, `checkout_until`, `checkin_date`, `checkout_date`.
- **Media**: `image` (main), `thumbnail`, `images` (every URL from `photoUrls` plus `mainPhotoUrl`, deduped).
- **Badges & offers**: collect badge text from `badges`, `ribbon`, `priceBreakdown.benefitBadges` into a `badges: string[]` array (e.g. "Hot deal", "Genius", "Breakfast included").

All new fields are additive — existing `id`, `offer_id`, `price`, `name`, `image`, `stars`, `review_score`, `review_count`, `latitude`, `longitude`, `refundable`, `source` keep their current names so the UI keeps working.

### 3. UI surfaces the new data (already mostly compatible)
File: `src/routes/stays.tsx` — `HotelResultCard`.
- Show `accommodation_type` next to stars when present.
- Show `district` / full `address` instead of just city when available.
- Show `distance_to_center` line if present.
- Render badges from `h.badges` as small chips alongside the existing "Prepay" / "Breakfast included" chips.
- Score word: prefer `h.review_score_word` over the local `scoreLabel(score)` fallback.
- Source ribbon: small "Booking.com" / "LiteAPI" tag in the corner so users can tell where the rate came from.

### 4. Sort UI
- Default sort tab stays "Best match" but the underlying list is already Booking-first + ascending price, so it visually matches the request.
- "Lowest price" sort still works across both sources.

### Verification
- Run a hotel search (e.g. Dubai check-in/out) in the preview.
- Confirm: Booking.com cards appear at the top of the list, prices ascend within each provider group, and richer fields (address, badges, full image, score word) render.