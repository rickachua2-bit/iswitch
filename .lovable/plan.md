# Dedicated Flight Search Results Page

Right now, `/flights` does double duty — it shows the search form AND renders results below it on the same page. The request is to split these so that submitting the flight form navigates to a brand-new `/flights/search` route, with a branded "Searching for your flight…" overlay (logo + destination tips) shown while results load. Booking from a result already routes to `/flights/book` and remains unchanged.

## What changes

### 1. New route: `src/routes/flights.search.tsx`
- File-based child of `/flights` → URL becomes `/flights/search`.
- Owns the same `validateSearch` schema as `/flights` today (origin, destination, dates, travelers, cabin, segments, sort, stops, airlines, baggage, recommended).
- Renders: Header + compact `UnifiedSearchBar` (so users can edit and re-search) + filters sidebar + results list + Footer.
- Hosts the `useFlightSearch` polling hook and the filtering/sorting logic currently in `flights.tsx`.
- While `status === "starting" | "polling"` and no offers yet, shows the new full-screen branded `FlightSearchingOverlay` (see #3).
- Handles "no results" / error via the existing `NoResultsDialog`, with the close action routing back to `/flights`.

### 2. Trim `src/routes/flights.tsx` to a landing/search page
- Remove the polling hook usage and results rendering from this route.
- On form submit (already wired through `FlightForm` → `navigate(...)`), navigate to `/flights/search` with the same query params instead of staying on `/flights`.
- Keep landing content: hero search bar, `QuickRouteChips`, `HandpickedRoutes`, `CabinClasses`, `TrendingDeals`, `FlightValueProps`, `FlightFAQ`.
- Keep the parent `Outlet` pattern so `/flights/search` and `/flights/book` render as children