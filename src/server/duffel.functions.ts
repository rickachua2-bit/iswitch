import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { friendlyError, timedFetch } from "./_shared.server";

const DUFFEL_BASE = "https://api.duffel.com";

function dHeaders() {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) throw new Error("DUFFEL_API_KEY is not configured");
  return {
    Authorization: `Bearer ${key}`,
    "Duffel-Version": "v2",
    "Content-Type": "application/json",
    Accept: "application/json",
  } as Record<string, string>;
}

const SearchInput = z.object({
  origin: z.string().min(3),
  destination: z.string().min(3),
  departure_date: z.string(),        // YYYY-MM-DD
  return_date: z.string().optional(),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(9).default(0),
  infants: z.number().int().min(0).max(9).default(0),
  cabin: z.enum(["economy", "premium_economy", "business", "first"]).default("economy"),
});

// helper to extract IATA from "Lagos (LOS)"
function iata(s: string): string {
  const m = s.match(/\(([A-Z]{3})\)/);
  return (m ? m[1] : s).toUpperCase().trim();
}

export const searchFlights = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SearchInput.parse(d))
  .handler(async ({ data }) => {
    try {
      const slices = [
        { origin: iata(data.origin), destination: iata(data.destination), departure_date: data.departure_date },
      ];
      if (data.return_date) slices.push({ origin: iata(data.destination), destination: iata(data.origin), departure_date: data.return_date });
      const passengers: any[] = [];
      for (let i = 0; i < data.adults; i++) passengers.push({ type: "adult" });
      for (let i = 0; i < data.children; i++) passengers.push({ type: "child", age: 8 });
      for (let i = 0; i < data.infants; i++) passengers.push({ type: "infant_without_seat" });

      const { status, text } = await timedFetch("duffel", `${DUFFEL_BASE}/air/offer_requests?return_offers=true`, {
        method: "POST",
        headers: dHeaders(),
        body: JSON.stringify({ data: { slices, passengers, cabin_class: data.cabin } }),
      });
      if (status >= 400) return { ok: false as const, error: friendlyError(status, text), offers: [] };
      const json = JSON.parse(text);
      const offers = (json?.data?.offers ?? []).slice(0, 50).map((o: any) => ({
        id: o.id,
        total_amount: o.total_amount,
        total_currency: o.total_currency,
        owner: o.owner?.name,
        owner_logo: o.owner?.logo_symbol_url,
        slices: (o.slices ?? []).map((s: any) => ({
          origin: s.origin?.iata_code,
          destination: s.destination?.iata_code,
          duration: s.duration,
          segments: (s.segments ?? []).map((seg: any) => ({
            marketing_carrier: seg.marketing_carrier?.name,
            marketing_carrier_iata: seg.marketing_carrier?.iata_code,
            flight_number: seg.marketing_carrier_flight_number,
            departing_at: seg.departing_at,
            arriving_at: seg.arriving_at,
            origin: seg.origin?.iata_code,
            destination: seg.destination?.iata_code,
          })),
        })),
      }));
      return { ok: true as const, offers };
    } catch (e: any) {
      return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)), offers: [] };
    }
  });

export const getFlightOffer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ offer_id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { status, text } = await timedFetch("duffel", `${DUFFEL_BASE}/air/offers/${data.offer_id}?return_available_services=true`, {
        method: "GET", headers: dHeaders(),
      });
      if (status >= 400) return { ok: false as const, error: friendlyError(status, text) };
      return { ok: true as const, offer: JSON.parse(text)?.data };
    } catch (e: any) {
      return { ok: false as const, error: friendlyError(null, String(e?.message ?? e)) };
    }
  });
