## Goal

Make the Tours destination input autocomplete from Booking.com so users see real, bookable destinations as they type — and the search returns the richest possible results.

## What's there now

- `src/components/SearchTabsForms.tsx` → `ToursInlineForm` uses a plain `<TextInput>` for "Where". No suggestions. Defaults to "Paris".
- `src/server/booking.server.ts` already calls `attraction/searchLocation` inside `bookingSearchTours` (verified working — HTTP 200).
- The Tours card was just enriched with image + rating + duration, so once a real destination ID is selected, the result grid is already meaningful.

## Plan

### 1. New server function `autocompleteTourDestinations`
File: `src/server/travsify.ts` (added next to `searchTours`).

- POST, input `{ query: string (1–80 chars) }`.
- Calls `https://booking-com15.p.rapidapi.com/api/v1/attraction/searchLocation?query=…` with the existing `RAPIDAPI_BOOKING_KEY`.
- Normalises each hit to `{ id, label, country, type }` (city / region / attraction).
- Returns up to 10 suggestions. Returns `{ suggestions: [] }` (never throws) when the key is missing or the call fails — UI degrades to free-text.
- Uses the existing `timedFetch` helper so latency / errors land in the provider health log under `booking-tours`.

### 2. New component `TourDestinationAutocomplete`
File: `src/components/TourDestinationAutocomplete.tsx`.

- Controlled `value` / `onChange(label, suggestion?)` API matching the existing `Field` primitive.
- Debounced 250ms; aborts in-flight requests when the user keeps typing.
- Skips fetching for queries shorter than 2 characters.
- Dropdown renders `MapPin` icon + city name + country (e.g. "Paris · France"), with a small chip for `type` when it's not "city" (e.g. "attraction", "region").
- Keyboard navigation: ↑ / ↓ / Enter / Esc.
- Click outside closes; selection writes the full "City, Country" label back so the existing `searchTours` query (which takes free-form text) keeps working.
- Shows a subtle "Searching…" row while a request is in flight so the user sees the system is working ("as many punches as possible emanating from that search").

### 3. Wire the autocomplete into the Tours form
File: `src/components/SearchTabsForms.tsx` — replace the destination `TextInput` inside `ToursInlineForm` with `<TourDestinationAutocomplete>`. No other forms change.

### 4. Pass the picked destination ID through (optional, low-risk)
When the user picks a suggestion we have the canonical Booking.com `id`. Currently `searchTours` re-resolves the destination on every search. If a user picks a suggestion we'll also stash the id on the URL as `destId` (validated via Zod, optional). `bookingSearchTours` already accepts a string destination, so no change to the search path is required — the id is purely an optimisation hook for a future round.

For this change I'll keep the URL contract the same (`destination`, `date`, `guests`) and skip the `destId` plumbing to avoid scope creep.

## Files touched

- `src/server/travsify.ts` — add `autocompleteTourDestinations` server function (~35 lines).
- `src/components/TourDestinationAutocomplete.tsx` — new component (~110 lines).
- `src/components/SearchTabsForms.tsx` — swap one input inside `ToursInlineForm`.

No DB migration. No new secrets. No change to the existing search/booking flow.

## Out of scope (call out)

- Not adding autocomplete to Stays / Pickups / Flights yet — same pattern can extend there later (Booking.com has equivalent `hotels/searchDestination` and `flights/searchDestination` endpoints we already use server-side). Easy to follow up with once you've sanity-checked the Tours version.
