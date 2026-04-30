## Goal

On the hotel "review your stay" page (`/stays/book`), when the selected hotel is from the Booking.com RapidAPI source, fetch and display the **full** photo gallery and **all available rooms** exactly as Booking.com exposes them — not just the cached thumbnails and a single placeholder room.

## What's wrong today

- `src/routes/stays.book.tsx` only renders up to 6 images from the cached search payload (`pickAllImages` slices to 6) and shows a single hardcoded room block (`hotel.room_name ?? "Standard double room"`).
- `src/server/booking.server.ts` only normalizes the search-result fields. It never calls Booking.com's detail endpoints, so room lists, full photo galleries and descriptions are not available.

## Plan

### 1. New server functions for Booking.com hotel details

Add three helpers in `src/server/booking.server.ts` (RapidAPI host `booking-com15.p.rapidapi.com`):

- `bookingGetHotelDetails(hotelId, { checkin, checkout, adults, rooms, currency })` → `GET /api/v1/hotels/getHotelDetails`. Returns description, address, facilities, policies, score breakdown.
- `bookingGetHotelPhotos(hotelId)` → `GET /api/v1/hotels/getHotelPhotos`. Returns the **complete** photo array (not just the 5–6 in search results).
- `bookingGetRoomList(hotelId, { checkin, checkout, adults, rooms, currency, units, languagecode })` → `GET /api/v1/hotels/getRoomList`. Returns every available room with name, bed config, photos, max occupancy, board, refundable flag, price.

Each helper uses the existing `bFetch`/`safeJson`/`recordHealth` infrastructure, returns `{ ok, … }` shapes, and gracefully degrades to empty arrays on error so the page still renders.

Expose a single combined server function via `createServerFn` in a new `src/server/booking.functions.ts`:

```
getBookingHotelFull({ hotelId, checkin, checkout, adults, rooms, currency })
  -> { ok, details, photos: string[], rooms: NormalizedRoom[] }
```

`NormalizedRoom` shape (built once, used by the UI):
```
{ id, name, bed_configuration, max_occupancy, photos: string[],
  board, refundable, cancellation_until, price, currency, badges, description }
```

The function calls the three RapidAPI endpoints in parallel and normalizes the result. Photos are deduped; rooms are sorted by price ascending to match the rest of the app's sort order.

### 2. Wire it into `/stays/book`

Update `src/routes/stays.book.tsx`:

- Detect Booking.com offers via `hotel.source === "booking"` (or `id`/`offer_id` prefix `booking-`).
- After the cached `hotel` is recovered, fire `getBookingHotelFull` (using `hotel.hotelId` / numeric id stripped from the `booking-<id>` prefix and the search dates / currency from URL or cached payload).
- Merge the response back into local state: replace `images` with the full deduped gallery, set `rooms` from the room list, fall back to cached values while loading or on failure.

### 3. Full-gallery UI

Replace the existing 4-tile collage with a real gallery:

- Hero: large cover (clickable) + a 2×2 grid of next 4 thumbnails + a "Show all N photos" pill in the corner.
- Clicking any photo opens a modal lightbox that supports keyboard ←/→ and shows the entire photo set with index counter (`3 / 47`).
- On mobile, render a horizontal swipeable strip plus the "Show all N photos" CTA that opens the same lightbox.
- Use the existing `Dialog` primitive from shadcn (already in the project) — no new dependency required.

### 4. Available-rooms section

Add a new `BookingSectionCard` titled "Available rooms" between "Your stay" and "What this property offers":

- Render every room returned by Booking.com (cheapest first), each as a card with:
  - Room photo carousel (uses the room's own photo array)
  - Name, bed configuration, max occupancy, board, refundable badge, cancellation deadline
  - Price per night formatted via `usePriceFormat` in the user's selected currency
  - "Select this room" button → updates the booked room (sets `hotel.room_name`, `hotel.price`, `hotel.rate_id`) and re-renders the right-hand price summary
- Highlight the currently selected room with a primary border and a "Selected" pill.
- Empty/loading states: skeleton list while loading; if Booking.com returns no rooms, fall back to today's single-row block.

### 5. Currency consistency

`getBookingHotelFull` always forwards the user's selected currency code (resolved via `getUserCurrencyCode()` on the client and passed in the input) so room prices display in NGN/USD/EUR etc. — matching the behavior already shipped for search results.

### 6. Provider scope

LiteAPI hotels keep their existing flow unchanged. The new gallery + rooms enhancements only run when `hotel.source === "booking"`. LiteAPI offers continue to use the cached `images`/`room_name` fields.

## Files to touch

- `src/server/booking.server.ts` — add `bookingGetHotelDetails`, `bookingGetHotelPhotos`, `bookingGetRoomList` helpers.
- `src/server/booking.functions.ts` *(new)* — `createServerFn` wrapper `getBookingHotelFull`.
- `src/routes/stays.book.tsx` — fetch full data, render full-photo gallery + lightbox, render rooms list with selection, wire selected room into price summary and `startCheckout` payload.
- (Optional small extraction) `src/components/stays/HotelGallery.tsx` and `src/components/stays/RoomList.tsx` to keep `stays.book.tsx` readable.

No database, no migrations, no new env vars (uses existing `RAPIDAPI_BOOKING_KEY`).