Plan to fix the endless “Loading rooms…” / booking CTA loops permanently

1. Make booking CTA navigation fail-safe across all verticals
- Update the shared offer-selection hook so buttons never stay stuck forever.
- Add a timeout around the backend offer-cache save step.
- If the user’s selected offer is already saved in browser session storage, navigate to the booking page even if the backend cache is slow or unavailable.
- Reset the loading state after navigation failures or timeouts and show a clear toast message instead of leaving the button spinning.
- This will apply to hotels, insurance, tours, pickups, and visas because they already use the shared hook.

2. Move flight booking selection to the same shared flow
- Refactor `FlightResultCard` to use `useSelectOffer` instead of its own custom `sessionStorage + saveOffer + navigate` logic.
- Preserve the selected fare in the cached payload so `/flights/book` can still recover the offer and fare.
- Add per-fare loading state and disable sibling fare buttons while one fare is opening.
- Add the same timeout/fallback behavior used by the rest of the verticals.

3. Improve booking-page recovery so refreshes and slow cache writes are handled
- Update `/stays/book` and `/flights/book` to use the shared recovery helper instead of one-off cache reads.
- Keep session storage as the fastest source and backend cache as the durable fallback.
- Avoid sending users back to search unless the offer truly cannot be recovered.

4. Fix hotel pricing clarity: daily rate plus stay total
- Treat hotel result prices as nightly prices in the UI.
- Compute number of nights from check-in and check-out dates.
- On hotel cards, show:
  - “Per night” price prominently.
  - A clear line such as: “6 nights total: $X before taxes/fees” when dates are available.
- On the booking page, make the summary explicit:
  - “Nightly rate: $X”
  - “6 nights: $X × 6 = $Y”
  - “Taxes & fees”
  - “Total for 6 nights”
- Rename wording from ambiguous “total” to “total for stay” wherever needed.

5. Make hotel backend/data normalization safer
- Normalize LiteAPI hotel rate data so the app stores both:
  - `nightly_price`
  - `total_stay_price` when available from the provider
- If the provider only returns a total stay price, derive nightly price by dividing by the number of nights.
- If the provider returns nightly price, derive total stay price by multiplying by nights.
- Keep existing `price` compatible for old UI paths, but prefer explicit `nightly_price` and `total_stay_price` in new display logic.

6. Add guardrails against future infinite loaders
- Ensure every booking CTA has a maximum waiting time.
- Ensure no button remains disabled after an exception, timeout, or cache failure.
- Keep the current error toast pattern for all verticals so users see what happened and can retry.

Technical files expected to change
- `src/lib/use-select-offer.ts`
- `src/lib/select-offer.ts`
- `src/components/flights/FlightResultCard.tsx`
- `src/routes/flights.tsx` if any props/imports need to be passed through
- `src/routes/flights.book.tsx`
- `src/routes/stays.tsx`
- `src/routes/stays.book.tsx`
- `src/server/travsify.ts`

Expected result
- Clicking “View rooms & book” opens the hotel booking page instead of looping on “Loading rooms…”.
- Flight fare booking uses the same reliable path and does not hang.
- Other verticals also inherit the permanent timeout/fallback fix.
- Hotel users see the nightly rate and the total cost for their exact number of nights, making the price understandable before payment.