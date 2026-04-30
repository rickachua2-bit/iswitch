import { createServerFn } from "@tanstack/react-start";
import { VISA_COUNTRIES } from "./visa-countries.server";

/**
 * Returns the canonical list of countries supported by the Visa Requirement
 * RapidAPI provider. Used to power the visa nationality/destination autocomplete.
 */
export const listVisaCountries = createServerFn({ method: "GET" }).handler(
  async () => {
    return { countries: VISA_COUNTRIES };
  },
);
