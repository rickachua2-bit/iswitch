I found the main cause of the “Opening…” then back-to-search behavior: the booking route files are being generated as nested `/book` children under `/flights` and `/stays`, but the CTA navigation and some route declarations still treat them like absolute routes. In practice, this makes the router settle back on the parent search page instead of rendering the booking page reliably.

Plan to fix it permanently:

1. Fix booking route registration
- Convert the booking pages to explicitly stable, non-nested route files/paths for:
  - Flights booking
  - Hotels booking
  - Visas, insurance, tours, pickups booking pages as the same pattern applies there
- Ensure each route resolves as a real leaf page like `/flights/book` and `/stays/book`, not just a parent search route with a child that fails to render.

2. Update all CTA navigation to match the fixed routes
- Update `useSelectOffer` calls and any booking links to navigate to the corrected route paths.
- Keep the current fail-safe behavior where the selected offer is saved to `sessionStorage` immediately before navigation.
- Keep the backend cache as a backup, but do not allow it to block the user from reaching the booking page.

3. Harden booking-page recovery
- Refactor the flight booking page to use the shared `recoverSelectedOffer` helper, the same way the other vertical booking pages do.
- Keep compatibility with the existing flight fare keys so already selected fares can still load.
- Make hotel booking recovery consistent with the same helper as well.

4. Prevent “silent stop” UX
- If navigation cannot complete, show a clear toast instead of leaving the button stuck on “Opening…”.
- If the booking payload cannot be recovered, show a proper recovery message with a button back to results, not an unexplained return to search.

5. Verify after implementation
- Test flight flow: search results → Select → Book fare → `/flights/book` shows passenger form and price summary.
- Test hotel flow: search results → View rooms & book → `/stays/book` shows hotel review and nightly/total stay pricing.
- Check browser network/console for routing or server-function errors.

No database schema changes are needed for this fix.