import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  rate_to_usd: number;
};

type CurrencyContextValue = {
  currency: Currency;
  currencies: Currency[];
  loading: boolean;
  setCurrency: (code: string) => void;
  /** Convert a USD-cents amount to the active currency, returning a localized formatted string. */
  format: (usdCents: number) => string;
};

const FALLBACK: Currency = { code: "USD", name: "US Dollar", symbol: "$", rate_to_usd: 1 };

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<Currency[]>([FALLBACK]);
  const [code, setCode] = useState<string>(() => {
    if (typeof window === "undefined") return "USD";
    return localStorage.getItem("iswitch.currency") ?? "USD";
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("currencies")
        .select("code, name, symbol, rate_to_usd")
        .eq("is_enabled", true)
        .order("sort_order");
      if (data && data.length > 0) {
        setCurrencies(data.map((c) => ({ ...c, rate_to_usd: Number(c.rate_to_usd) })));
      }
      setLoading(false);
    })();
  }, []);

  const currency = useMemo<Currency>(
    () => currencies.find((c) => c.code === code) ?? currencies[0] ?? FALLBACK,
    [code, currencies],
  );

  const value: CurrencyContextValue = {
    currency,
    currencies,
    loading,
    setCurrency: (next) => {
      setCode(next);
      if (typeof window !== "undefined") localStorage.setItem("iswitch.currency", next);
    },
    format: (usdCents) => {
      const usd = usdCents / 100;
      const converted = usd * currency.rate_to_usd;
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currency.code,
          maximumFractionDigits: converted >= 100 ? 0 : 2,
        }).format(converted);
      } catch {
        return `${currency.symbol}${converted.toFixed(2)}`;
      }
    },
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside <CurrencyProvider>");
  return ctx;
}
