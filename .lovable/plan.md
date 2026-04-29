I’ll make this a permanent booking-flow fix rather than another small patch.

Current issue found:
- The result pages try to pass the selected offer to `/.../book` using browser `sessionStorage` plus a short-lived backend cache.
- Some booking pages still recover selected data manually and inconsistently.
- If the selected offer is not recovered quickly, the user sees a “session expired / back to search” state, which feels like the app has sent them back to search.
- Hotels also jump directly from a hotel result to guest/payment details; they do not yet have a proper hotel-detail/room-selection step where users can review room options first.

Plan:

1. Create one reliable selected-offer handoff path for every vertical
- Replace the scattered manual `sessionStorage` reads in booking pages with the shared recovery helper.
- Standardize cache keys and payload shape across flights, hotels, visas, insurance, tours, and pickups.
- Make persistence errors visible to the click handler instead of silently failing; if the selected item cannot be saved, show a friendly “Please try again” message and do not navigate to a broken booking page.
- Increase recovery resilience on booking pages with a few short retries and a clear loading state before showing any expired-session message.

2. Stop “Book & Pay Now” from acting like a search reset
- Add selecting/loading state to result-card buttons so repeated taps/clicks cannot trigger duplicate navigations or stale state.
- Preserve the original search query in the booking-page URL where needed, so “Back to results” returns to the same results instead of an empty search page.
- Update `BookingShell` back links for each vertical to include the user’s prior search parameters, not just `/stays`, `/flights`, etc.

3. Hotels: add the missing hotel detail + room selection step
- Change the hotel result CTA from a direct “Book & pay now” into a two-step flow:
  - result card → `/stays/book` hotel detail page
  - select a room/rate → guest details → payment
- On the hotel booking page, show the property details first, then a “Available rooms” section with multiple room/rate cards derived from real payload fields when available, with safe fallback room options if the provider only returns one rate.
- Only after the user chooses a room/rate will the lead guest form and payment button appear.
- Update copy from “Book & pay now” to “View rooms” or “Choose room” where appropriate, so users understand the next page is a booking detail page, not an immediate payment.

4. Flights and other verticals: keep the same pattern but make it robust
- Flights already have a fare-selection step on the result card and passenger details on `/flights/book`; I’ll route it through the same durable helper used by other verticals and keep the selected fare recoverable from backend cache.
- Visas, insurance, tours, and pickups will use the shared recovery helper consistently and preserve route/search context.
- Each booking page will remain on its review/details page and never automatically navigate back to search just because storage was slow or unavailable.

5. Improve post-payment return behavior
- Keep payment return on `/checkout/return` after the external payment flow.
- If verification fails or is pending, the retry/continue actions should point to the relevant booking/dashboard context instead of sending users to the homepage/search by default.

Technical details
- Files to update:
  - `src/lib/select-offer.ts`
  - `src/components/flights/FlightResultCard.tsx`
  - `src/routes/flights.book.tsx`
  - `src/routes/stays.tsx`
  - `src/routes/stays.book.tsx`
  - `src/routes/visas.tsx`, `src/routes/visas.book.tsx`
  - `src/routes/insurance.tsx`, `src/routes/insurance.book.tsx`
  - `src/routes/tours.tsx`, `src/routes/tours.book.tsx`
  - `src/routes/pickups.tsx`, `src/routes/pickups.book.tsx`
  - likely `src/components/booking/BookingShell.tsx`
  - possibly `src/routes/checkout.return.tsx`
- No route-tree manual edits. The route files already exist, so the generated route tree should be left alone.
- No database schema change is expected. The existing `offer_cache` table is enough; the fix is to use it consistently and not rely on browser storage alone.

Expected outcome:
- A user searching hotels, flights, visas, insurance, tours, or pickups can choose an option and reliably land on the matching booking/review page.
- Hotel users see hotel details and room/rate options before entering guest details and paying.
- Booking pages no longer fall back to a blank/expired/search flow because the selected offer handoff is slow or inconsistent.
- Back links return users to the same search context instead of resetting them to a fresh search page.