## API status (verified just now)

Direct check against the provider health table:

- `booking-tours` — last successful call **HTTP 200**, latency ~1.3–2.8s. Working.
- `booking-flights`, `booking-hotels`, `booking-cars` — `total_calls = 0`. Not yet exercised in production (no user has searched these verticals since the integration shipped), but they share the same key/host/auth layer as tours, so the credential is good. They'll record their first health events on first real search.

So: the RapidAPI key works and the Tours endpoint is live.

## The real problem

`src/routes/tours.tsx` only renders **title + price** on the result cards. The Booking.com normaliser already pulls `images`, `description`, `subtitle`, `duration`, and `currency`, plus we have access to review score and "from price" via `raw`, but none of it reaches the UI. The user sees a sparse card and has to click "View & book" before seeing what the tour actually looks like.

## What I'll change

### 1. Enrich the Booking.com tour normaliser (`src/server/booking.server.ts`)

`normalizeBookingTour` currently only grabs `primaryPhoto.small`. Pull a proper image set and the rating fields:

- `images`: collect `primaryPhoto.large` / `medium` / `small` (largest first) plus any `photos[]` URLs, dedupe.
- `rating`: `reviewsStats.combinedNumericStats.average` (number, 0–5).
- `review_count`: `reviewsStats.allReviewsCount`.
- `duration_text`: human-readable from `representativeDuration` or `duration`.
- `categories`: `primaryCategory.name` for a quick "Food tour", "Day trip" tag.
- Keep `from_price` distinct from `price` so the card can show "From $X".

### 2. Redesign the Tours card (`src/routes/tours.tsx`)

Replace the current text-only card with an image-led card:

```text
┌────────────────────────────────┐
│   [hero image, 16:9, lazy]     │
│                                │
├────────────────────────────────┤
│ ★ 4.7 (1,284)   • 3 hours      │
│ Burj Khalifa: At the Top       │
│ Skip-the-line · Levels 124–125 │
│                                │
│ From  USD 49     [View & book] │
└────────────────────────────────┘
```

Details:
- Image: `t.images?.[0]` with `loading="lazy"`, `decoding="async"`, fallback to a neutral gradient placeholder when missing.
- Rating row: stars icon + score + count (only when `rating` present).
- Duration chip when available.
- 2-line clamped subtitle/description (`line-clamp-2`).
- "From {currency} {price}" wording so it's clear it's the lead-in price.
- Click anywhere on the card (not just the button) routes to `/tours/book`.

### 3. Pass the enriched payload through to the booking page

`goToBooking` already spreads `t` into `payload`, so `/tours/book` will automatically receive `images`, `rating`, `description`, etc. No change needed there beyond confirming `tours.book.tsx` shows the hero image and gallery — I'll add a simple image header + description block on the booking page if it isn't already there.

### 4. Light validation pass on the other verticals

While I'm in there:
- Trigger one warm-up call each for `booking-flights`, `booking-hotels`, `booking-cars` from the existing admin "Provider Health" probe so we can confirm 200s on all four endpoints (no UI change — just verifies the key works across hosts).
- Hotels already render images via the `images[]` array on the unified hotel shape, so no UI change needed there — Booking.com hotels will slot in.

## Files touched

- `src/server/booking.server.ts` — enrich `normalizeBookingTour`.
- `src/routes/tours.tsx` — image-led card layout.
- `src/routes/tours.book.tsx` — add hero image + description block (only if missing).
- `src/server/api-providers.functions.ts` — fire warm-up probes for flights/hotels/cars (optional, behind the existing admin probe).

No DB migration, no new secrets.
