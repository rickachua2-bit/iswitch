## Goal

1. Remove the **Insurance** vertical entirely.
2. Add a new **Car Rentals** vertical, powered by **Priceline.com Provider** on RapidAPI (`priceline-com-provider.p.rapidapi.com`).
3. Rename **Pickups / Car Transfers → Airport Transfers** across the app (route, labels, copy). The transfer feature itself stays as-is — only the name changes.

## What gets built

### A. New Car Rentals vertical (`/car-rentals`)

Routes:
- `src/routes/car-rentals.tsx` — search + results listing
- `src/routes/car-rentals.book.tsx` — booking/lead capture (pattern copied from `pickups.book.tsx`)

Search form fields (in `SearchTabsForms.tsx` as `CarRentalsInlineForm`):
- Pick-up location (city or airport, autocomplete using Priceline `cars/search-pickup-locations`)
- Drop-off location (defaults to same as pick-up)
- Pick-up date + time
- Drop-off date + time
- Driver age (default 30)

Results card shows: vehicle name + class, supplier (Hertz/Avis/etc.) with logo, transmission, seats, bags, A/C, mileage policy, pick-up depot type (airport/in-terminal/shuttle), total price + per-day price, "Book now" CTA.

### B. Priceline server integration

New file `src/server/priceline.server.ts`:
- `searchPickupLocations(query)` → calls `GET /v1/cars/search-pickup-locations` for autocomplete
- `searchCarRentals(params)` → calls `GET /v1/cars/list` with pickup/dropoff IDs + datetimes + driver age
- `normalizeCarRentals(raw)` → maps Priceline's response to the UI shape

Plus `searchCarRentals` and `bookCarRental` `createServerFn` wrappers exported from `src/server/travsify.ts` (alongside existing verticals), with graceful fallback to crawled inventory if Priceline is rate-limited.

Auth header: `x-rapidapi-host: priceline-com-provider.p.rapidapi.com` + `x-rapidapi-key: $RAPIDAPI_PRICELINE_KEY` (new secret you'll be prompted to add).

### C. Rename Pickups → Airport Transfers (UI only, route stays `/pickups`)

Reasoning: changing the URL would break existing bookings/links. We rename labels everywhere it's user-visible:
- `SearchTabs.tsx`, `UnifiedSearchBar.tsx`: tab label "Car Transfers" → "Airport Transfers"
- `Header.tsx`, `MobileBottomNav.tsx`, `Footer.tsx`, `ServicesGrid.tsx`, `index.tsx`: same rename
- `i18n/resources.ts`: `nav.transfers` translations updated to "Airport Transfers" / equivalents in all 9 locales
- Page `<title>` and meta descriptions updated on `pickups.tsx`

### D. Remove Insurance

Delete:
- `src/routes/insurance.tsx`, `src/routes/insurance.book.tsx`
- Insurance form blocks in `SearchTabs.tsx` and `SearchTabsForms.tsx`
- `searchInsurance` / `bookInsurance` from `src/server/travsify.ts`
- `Insurance` entries from `Header.tsx`, `MobileBottomNav.tsx`, `Footer.tsx`, `ServicesGrid.tsx`, `index.tsx` hero copy
- `nav.insurance` from `i18n/resources.ts` (all locales) and `insurance` from the `Vertical` union in `travsify.ts`
- Replace its slot in `ServicesGrid` and `MobileBottomNav` with the new **Car Rentals** entry

### E. Secrets

Will request: `RAPIDAPI_PRICELINE_KEY` via `add_secret` after plan approval. (You'll paste the same RapidAPI key — it works across all RapidAPI products subscribed under your account.)

## Technical details

```text
src/
├─ routes/
│   ├─ car-rentals.tsx          (new)
│   ├─ car-rentals.book.tsx     (new)
│   ├─ pickups.tsx              (rename labels only)
│   ├─ insurance.tsx            (DELETE)
│   └─ insurance.book.tsx       (DELETE)
├─ server/
│   ├─ priceline.server.ts      (new — Priceline fetch + normalize)
│   └─ travsify.ts              (add searchCarRentals/bookCarRental, drop insurance)
├─ components/
│   ├─ SearchTabs.tsx           (drop Insurance, add Car Rentals, rename Transfers)
│   ├─ SearchTabsForms.tsx      (drop InsuranceInlineForm, add CarRentalsInlineForm)
│   ├─ UnifiedSearchBar.tsx     (same)
│   ├─ Header.tsx, Footer.tsx, MobileBottomNav.tsx, ServicesGrid.tsx
│   └─ CarRentalLocationAutocomplete.tsx  (new — wraps Priceline locations endpoint)
└─ i18n/resources.ts            (drop nav.insurance, add nav.carRentals, rename transfers)
```

Priceline endpoints used:
- `GET /v1/cars/search-pickup-locations?string=<query>` — location autocomplete
- `GET /v1/cars/list?pickup_location_id=…&pickup_date_time=…&dropoff_location_id=…&dropoff_date_time=…&driver_age=…&currency=USD`

Vertical type union becomes: `"flights" | "stays" | "visas" | "car_rentals" | "tours" | "pickups"`.

Booking flow for car rentals reuses the existing `startCheckout` / `createLead` infrastructure (same pattern as pickups). No DB schema changes needed.

## Out of scope

- Real-time Priceline booking confirmation (requires their booking API tier). For now bookings capture as leads, same as visas/tours.
- Migrating any existing insurance bookings (none in production data per current setup).