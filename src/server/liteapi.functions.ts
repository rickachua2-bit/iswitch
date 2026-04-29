import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { friendlyError, timedFetch } from "./_shared.server";

const BASE = "https://api.liteapi.travel/v3.0";

function lHeaders() {
  const key = process.env.LITEAPI_KEY;
  if (!key) throw new Error("LITEAPI_KEY is not configured");
  return { "X-API-Key": key, "Content-Type": "application/json", Accept: "application/json" } as Record<string, string>;
}

const SearchInput = z.object({
  cityName: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  hotelIds: z.array(z.string()).optional(),
  checkin: z.string(),    // YYYY-MM-DD
  checkout: z.string(),
  adults: z.number().int().min(1).max(8).default(2),
  children: z.array(z.number().int()).default([]),
  rooms: z.number().int().min(1).max(8).default(1),
  currency: z.string().default("USD"),
  guestNationality: z.string().length(2).default("US"),
});

export const searchHotels = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data }) => {
    try {
      // Step 1: get rates
      const occupancies = Array.from({ length: data.rooms }, () => ({ adults: data.adults, children: data.children }));
      const ratesBody: any = {
        checkin: data.checkin,
        checkout: data.checkout,
        currency: data.currency,
        guestNationality: data.guestNationality,
        occupancies,
      };
      if (data.hotelIds?.length) ratesBody.hotelIds = data.hotelIds;
      else if (data.cityName) ratesBody.cityName = data.cityName;
      else if (data.countryCode) ratesBody.countryCode = data.countryCode;

      const { status, text } = await timedFetch("liteapi", `${BASE}/hotels/rates`, {
        method: "POST", headers: lHeaders(), body: JSON.stringify(ratesBody),
      });
      if (status >= 400) return { ok: false as const, error: friendlyError(status, text), hotels: [] };
      const json = JSON.parse(text);
      const data_arr = json?.data ?? [];
      // Each item: { hotelId, roomTypes: [{ rates: [{ retailRate: { total: [{ amount, currency }] } }] }] }
      const hotels = data_arr.slice(0, 50).map((h: any) => {
        const firstRoom = h.roomTypes?.[0];
        const firstRate = firstRoom?.rates?.[0];
        const total = firstRate?.retailRate?.total?.[0];
        return {
          id: h.hotelId,
          offer_id: firstRoom?.offerId ?? firstRate?.rateId ?? h.hotelId,
          price: total?.amount,
          currency: total?.currency ?? data.currency,
          board: firstRate?.boardName,
          refundable: firstRate?.cancellationPolicies?.refundableTag === "RFN",
          room_name: firstRoom?.roomTypes?.[0]?.name ?? firstRate?.name,
          raw: h,
        };
      });
      return { ok: true as const, hotels };
    } catch (e: any) {
      return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)), hotels: [] };
    }
  });

export const getHotelDetails = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ hotelId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { status, text } = await timedFetch("liteapi", `${BASE}/data/hotel?hotelId=${encodeURIComponent(data.hotelId)}`, {
        method: "GET", headers: lHeaders(),
      });
      if (status >= 400) return { ok: false as const, error: friendlyError(status, text) };
      return { ok: true as const, hotel: JSON.parse(text)?.data };
    } catch (e: any) {
      return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)) };
    }
  });
