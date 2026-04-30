import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  bookingGetHotelDetails,
  bookingGetHotelPhotos,
  bookingGetRoomList,
  type BookingNormalizedRoom,
} from "./booking.server";

const Input = z.object({
  hotelId: z.string().min(1),
  checkin: z.string().min(1),
  checkout: z.string().min(1),
  adults: z.number().int().min(1).max(16).default(2),
  rooms: z.number().int().min(1).max(8).default(1),
  currency: z.string().min(3).max(4).default("USD"),
});

export type BookingHotelFull = {
  ok: boolean;
  details: any | null;
  photos: string[];
  rooms: BookingNormalizedRoom[];
  errors?: string[];
};

/**
 * Fetches the FULL hotel data (description, every photo, every available room)
 * from Booking.com via RapidAPI. Used by /stays/book to enrich the cached
 * search payload so the user can see the complete gallery and room list.
 */
export const getBookingHotelFull = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<BookingHotelFull> => {
    const errors: string[] = [];
    const [detailsRes, photosRes, roomsRes] = await Promise.all([
      bookingGetHotelDetails({
        hotelId: data.hotelId,
        checkin: data.checkin,
        checkout: data.checkout,
        adults: data.adults,
        rooms: data.rooms,
        currency: data.currency,
      }),
      bookingGetHotelPhotos(data.hotelId),
      bookingGetRoomList({
        hotelId: data.hotelId,
        checkin: data.checkin,
        checkout: data.checkout,
        adults: data.adults,
        rooms: data.rooms,
        currency: data.currency,
      }),
    ]);
    if (!detailsRes.ok && detailsRes.error) errors.push(`details: ${detailsRes.error}`);
    if (!photosRes.ok && photosRes.error) errors.push(`photos: ${photosRes.error}`);
    if (!roomsRes.ok && roomsRes.error) errors.push(`rooms: ${roomsRes.error}`);
    return {
      ok: photosRes.ok || roomsRes.ok || detailsRes.ok,
      details: detailsRes.details,
      photos: photosRes.photos,
      rooms: roomsRes.rooms,
      errors: errors.length ? errors : undefined,
    };
  });
