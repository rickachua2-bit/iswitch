I’ll fix the booking handoff so clicking a flight, hotel, tour, visa, insurance plan, or pickup opens the matching `/.../book` page directly on the first try, without requiring a manual refresh.

## What I found

The booking pages now share a new `BookingShell` / `SectionCard` UI. The reported `Duplicate declaration "SectionCard"` error appears during client-side navigation into the booking route, which is exactly why the page may fail on first click but work after refresh.

There is also inconsistency in how selected offers are recovered:
- `tours`, `pickups`, `visas`, and `insurance` use the shared resilient recovery helper.
- `stays.book.tsx` has its own one-shot recovery logic.
- `flights.book.tsx` has another custom recovery path and only retries briefly.

So I’ll address both the route-module error risk and the first-click data handoff reliability.

## Implementation plan

### 1. Remove the fragile `SectionCard` route-module failure point
- Rename the shared booking card export from `SectionCard` to a booking-specific name such as `BookingSectionCard`.
- Update all booking routes to import and use `BookingSectionCard`.
- This avoids collisions with any stale/local `SectionCard` bindings from previous route transforms and makes the shared component name unambiguous.

Files:
- `src/components/booking/BookingShell.tsx`
- `src/routes/flights.book.tsx`
- `src/routes/stays.book.tsx`
- `src/routes/tours.book.tsx`
- `src/routes/visas.book.tsx`
- `src/routes/insurance.book.tsx`
- `src/routes/pickups.book.tsx`

### 2. Standardize booking recovery for flights and hotels
- Update `flights.book.tsx` to use the existing `recoverSelectedOffer()` helper instead of its custom cache lookup.
- Preserve support for flight fare data by reading the selected fare from the recovered payload or session storage.
- Update `stays.book.tsx` to use the same helper with longer retry behavior.
- This makes the booking pages tolerate slow cache writes and open correctly after client-side navigation.

### 3. Make result-card navigation non-blocking and safer
- Keep the immediate `sessionStorage` write before navigation.
- Avoid waiting too long for backend cache writes before navigating.
- Ensure navigation uses the correct TanStack route targets:
  - `/flights/book`
  - `/stays/book`
  - `/tours/book`
  - `/visas/book`
  - `/insurance/book`
  - `/pickups/book`

### 4. Add graceful fallback instead of hard errors
- If selected data is still being recovered, show the modern loading state.
- If data truly cannot be recovered, show a clean “selection expired” card with a clear back-to-results button, not a blank/error screen.

### 5. Verify the flow
After implementation, I’ll verify:
- No remaining `SectionCard` duplicate declaration paths.
- Booking routes load directly by URL.
- Client-side navigation from search results opens the booking page without needing refresh.
- Hotels/stays and flights use the same reliable recovery pattern as the other verticals.

No database changes are needed.