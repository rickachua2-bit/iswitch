import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { friendlyError, timedFetch } from "./_shared.server";
import { getProviderKey } from "./provider-keys.server";

const BASE = "https://api.liteapi.travel/v3.0";

async function lHeaders() {
  const key = await getProviderKey("liteapi");
  if (!key) throw new Error("LiteAPI key not configured for current mode");
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
      const occupancies = Array.from({ length: data.rooms }, () => ({ adults: data.adults, children: data.children }));
      const ratesBody: any = {
        checkin: data.checkin,
        checkout: data.checkout,
        currency: data.currency,
        guestNationality: data.guestNationality,
        occupancies,
      };
      if (data.hotelIds?.length) ratesBody.hotelIds = data.hotelIds;
      else if (data.cityName) {
        // Resolve cityName -> hotelIds (LiteAPI v3 no longer accepts cityName on /hotels/rates)
        const parts = [`cityName=${encodeURIComponent(data.cityName)}`, "limit=50"];
        if (data.countryCode) parts.push(`countryCode=${data.countryCode}`);
        const lookup = await timedFetch("liteapi", `${BASE}/data/hotels?${parts.join("&")}`, { method: "GET", headers: lHeaders() });
        if (lookup.status < 400) {
          const lj = JSON.parse(lookup.text);
          const ids = (lj?.data ?? []).map((h: any) => h?.id).filter(Boolean).slice(0, 50);
          if (ids.length) ratesBody.hotelIds = ids;
        }
        if (!ratesBody.hotelIds && data.countryCode) ratesBody.countryCode = data.countryCode;
      } else if (data.countryCode) ratesBody.countryCode = data.countryCode;

      if (!ratesBody.hotelIds && !ratesBody.countryCode) {
        return { ok: false as const, error: "Please pick a city or country to search hotels.", hotels: [] };
      }

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
