I’ll make the fixes in three areas: live inventory, results-page layout, and visa booking.

## 1. Fix hotels and tours not fetching Booking.com RapidAPI results

I found the Booking.com RapidAPI secret is configured, and recent hotel calls are reaching the provider successfully, but the app can still show no results because of normalization/merge issues and tour destination ID handling.

Planned changes:
- Update the Booking.com hotel search integration to:
  - use price sorting at the provider request level where supported (`sort_by=price`),
  - accept more possible response shapes for destination lookup and hotel result lists,
  - keep Booking.com results first while still falling back to LiteAPI if Booking.com returns empty,
  - avoid treating an empty Booking.com response as a hard failure when the fallback provider has results.
- Update the Booking.com tours integration to:
  - parse more possible `searchLocation` response shapes,
  - pass the correct Booking.com attraction location ID into `searchAttractions`,
  - request `lowest_price` sorting so tours start lowest-to-highest,
  - normalize additional price/image/rating fields so cards render even when the response shape varies.
- Keep all provider branding hidden in user-facing UI, as previously requested.

## 2. Collapse search and filters on flight, hotel, and tour results pages

Goal: after a user searches, results should appear immediately without the large search bar and filters pushing results down.

Planned UX:
- On search-results states for Flights, Hotels, and Tours:
  - hide the full search bar by default,
  - show a compact top action row with two buttons:
    - `Search` opens/closes the search form,
    - `Filter` opens/closes the filters panel.
- For Flights:
  - the existing flight search form will be inside the collapsed `Search` panel,
  - the existing `FlightFilters` sidebar will be hidden until the user clicks `Filter`.
- For Hotels:
  - the existing hotel search bar will be collapsed after a search,
  - the existing hotel filter sidebar will be moved behind the `Filter` button,
  - results and sort tabs will show at the top immediately.
- For Tours:
  - the existing tour search form will be collapsed after a search,
  - add a simple filter panel for tours, including at minimum price/rating/category-style controls when data is available,
  - keep lowest price sorting by default.
- On landing/non-searched states, keep the current prominent search bar so users can start a search easily.

## 3. Restore visa result booking flow through payment

The visa booking page and payment checkout already exist, and visa cards have CTAs, but the flow needs tightening so every bookable visa reliably opens the booking page and then payment.

Planned changes:
- Make visa result CTAs clearly bookable for all paid/applicable visa options.
- Ensure selected visa data is cached with a stable ID before routing to `/visas/book`.
- On `/visas/book`, ensure the checkout amount matches the displayed total, including the service fee, so the payment page charges the same amount the user saw.
- Keep visa-free options non-payment and clearly labeled, while paid/assisted visa options go to applicant details then payment.

## 4. Verification after implementation

After approval and implementation, I’ll verify:
- hotel search returns visible results for a common city/date search,
- tour search returns visible results for a common city/date search,
- flight/hotel/tour results pages show results first with `Search` and `Filter` buttons,
- opening Search/Filter panels works without losing search params,
- visa result CTA opens `/visas/book`, applicant details submit, and checkout starts payment.