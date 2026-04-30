/**
 * Read the user's currently-selected display currency code from localStorage.
 * Safe to call from isomorphic loaders — returns "USD" on the server or when
 * nothing has been selected yet. Mirrors the storage key used by
 * `CurrencyProvider` in src/hooks/use-currency.tsx.
 */
export function getUserCurrencyCode(): string {
  if (typeof window === "undefined") return "USD";
  try {
    return (localStorage.getItem("iswitch.currency") || "USD").toUpperCase();
  } catch {
    return "USD";
  }
}
