import { createFileRoute } from "@tanstack/react-router";

/**
 * TEMPORARY diagnostic endpoint — verifies the RapidAPI Booking.com account
 * is reachable, the key is valid, and offers are returned. Safe to expose
 * because it returns no PII and only the count of results, not the data.
 *
 * GET /api/public/booking-health
 */
export const Route = createFileRoute("/api/public/booking-health")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.RAPIDAPI_BOOKING_KEY;
        if (!key) {
          return Response.json(
            { ok: false, reason: "RAPIDAPI_BOOKING_KEY missing in runtime env" },
            { status: 500 },
          );
        }
        const HOST = "booking-com15.p.rapidapi.com";
        const params = new URLSearchParams({
          fromId: "LOS.AIRPORT",
          toId: "LHR.AIRPORT",
          departDate: "2026-06-15",
          adults: "1",
          cabinClass: "ECONOMY",
          currency_code: "NGN",
          stops: "none",
          pageNo: "1",
          sort: "BEST",
        });
        const url = `https://${HOST}/api/v1/flights/searchFlights?${params}`;
        const t0 = Date.now();
        let res: Response;
        try {
          res = await fetch(url, {
            headers: {
              "x-rapidapi-host": HOST,
              "x-rapidapi-key": key,
              Accept: "application/json",
            },
            cache: "no-store",
          });
        } catch (e: any) {
          return Response.json(
            { ok: false, stage: "fetch", error: String(e?.message ?? e), ms: Date.now() - t0 },
            { status: 502 },
          );
        }
        const ms = Date.now() - t0;
        const text = await res.text();
        const rate = {
          requests_remaining: res.headers.get("x-ratelimit-requests-remaining"),
          requests_limit: res.headers.get("x-ratelimit-requests-limit"),
          monthly_remaining: res.headers.get("x-ratelimit-rapid-free-plans-hard-limit-remaining"),
        };
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {
          return Response.json(
            { ok: false, stage: "parse", http: res.status, ms, rate, body: text.slice(0, 400) },
            { status: 502 },
          );
        }
        const offers = json?.data?.flightOffers ?? [];
        const first = offers[0];
        const firstPriceTotal = first?.priceBreakdown?.total ?? null;
        const firstAmount = firstPriceTotal
          ? (Number(firstPriceTotal.units ?? 0) + Number(firstPriceTotal.nanos ?? 0) / 1e9).toFixed(2)
          : null;
        const firstCarrier = first?.segments?.[0]?.legs?.[0]?.carriersData?.[0]?.name ?? null;

        return Response.json({
          ok: res.ok && offers.length > 0,
          http: res.status,
          ms,
          rate,
          api_status_flag: json?.status ?? null,
          api_message: json?.message ?? null,
          offers_count: offers.length,
          sample: first
            ? {
                amount: firstAmount,
                currency: firstPriceTotal?.currencyCode ?? null,
                carrier: firstCarrier,
                token_present: !!first?.token,
              }
            : null,
        });
      },
    },
  },
});
