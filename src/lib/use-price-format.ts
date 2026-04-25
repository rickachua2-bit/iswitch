import { useCallback } from "react";
import { useCurrency } from "@/hooks/use-currency";

/**
 * Returns a formatter that converts a price expressed in ANY provider currency
 * (e.g. USD, NGN, EUR) into the user's currently-selected display currency.
 *
 * Pipeline: amount * (USD per provider unit) -> USD -> selected currency.
 *
 * `rate_to_usd` in the `currencies` table is defined as
 *   1 USD = rate_to_usd <code>
 * so to convert an amount expressed in <code> back to USD we divide by that rate.
 */
export function usePriceFormat() {
  const { currencies, currency, format } = useCurrency();

  return useCallback(
    (amount: number, providerCurrency: string | undefined | null) => {
      if (!Number.isFinite(amount)) return format(0);
      const provCode = (providerCurrency || "USD").toUpperCase();

      // Find provider rate. If unknown, treat as USD.
      const provRow = currencies.find((c) => c.code === provCode);
      const provRate = provRow ? Number(provRow.rate_to_usd) : provCode === "USD" ? 1 : 1;

      // amount in provider currency -> USD
      const usd = provRate > 0 ? amount / provRate : amount;
      // format() expects USD cents
      return format(Math.round(usd * 100));
    },
    [currencies, currency, format],
  );
}
