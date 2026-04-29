Plan to fix this once across all verticals:

1. Standardize the mobile vertical tabs
   - Update the shared search tab UI so the six verticals render as exactly 2 rows × 3 columns on mobile.
   - Keep desktop/tablet as a single 6-column row.
   - Apply this to both shared tab components currently used by the home/dashboard search and vertical pages:
     - `UnifiedSearchBar`
     - `SearchTabs`
   - Adjust tab label/icon spacing so long labels like “Car Transfers” still fit on mobile without horizontal scrolling.

2. Fix the root cause of “Book” returning the user to search
   - The booking pages depend on the selected item being available after navigation. Some verticals only use `sessionStorage`, and flights save the backend fallback in a fire-and-forget way, so the booking page can mount before the selected offer is recoverable.
   - Replace that fragile pattern with a consistent selected-offer handoff for every vertical:
     - Save selected result in `sessionStorage` immediately for same-tab speed.
     - Save selected result to the backend offer cache before navigating to the booking route.
     - Then navigate to `/flights/book`, `/stays/book`, `/visas/book`, `/insurance/book`, `/tours/book`, or `/pickups/book`.
   - If backend caching fails, navigation will still proceed using `sessionStorage`, but the app will no longer intentionally navigate before attempting the durable save.

3. Add cache recovery to every booking page
   - Hotels and flights already have some recovery logic, but it is uneven.
   - Add the same backend cache fallback to:
     - `visas.book.tsx`
     - `insurance.book.tsx`
     - `tours.book.tsx`
     - `pickups.book.tsx`
   - Keep the existing loading state pattern so the page waits briefly while recovering the selected item instead of immediately showing “session expired” or sending the user back to search.

4. Normalize selected item IDs and cache payloads
   - Use stable ID extraction per vertical:
     - flights: `offer.id`
     - hotels: `offer_id ?? rate_id ?? id ?? hotelId`
     - visas: `id ?? visa_id ?? external_id`
     - insurance: `id ?? plan_id ?? external_id`
     - tours: `id ?? tour_id ?? external_id`
     - pickups: `id ?? vehicle_id ?? external_id`
   - Store useful search context in the cache payload as well, such as dates, guests, destination, pickup/drop-off, so booking pages can display details after refresh or payment redirects.

5. Make booking navigation type-safe and less brittle
   - Use `Route.useNavigate()` / `useNavigate({ from: ... })` where appropriate on route pages so relative search updates and absolute booking navigations do not accidentally resolve incorrectly.
   - Preserve search parameters when needed; avoid clearing the selected vertical’s search unless the user explicitly closes a no-results dialog.

6. Clean up unused booking imports
   - Several booking pages still import older direct booking server functions (`bookHotel`, `bookTour`, etc.) but now use `startCheckout`. Remove unused imports while touching these files to reduce build warnings and confusion.

7. Verification after implementation
   - Check the mobile layout at a mobile breakpoint: all six vertical tabs should display as 3 across and 2 down, with no horizontal scroll.
   - Validate the booking handoff path for each vertical:
     - search results → select/book → review/details booking page → enter details → payment checkout.
   - Specifically verify hotels and flights, since those are the flows you called out, then confirm the same mechanism is applied to visas, insurance, tours, and pickups.

Technical notes:
- No route tree should be manually edited; route files already exist for every booking page.
- No database schema change is expected because the `offer_cache` table already exists and is typed.
- This will mainly touch shared tab components, selected-result navigation handlers, and booking-page recovery logic.