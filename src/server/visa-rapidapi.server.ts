// Visa Requirement RapidAPI provider
// https://rapidapi.com/TravelBuddyAI/api/visa-requirement

const HOST = "visa-requirement.p.rapidapi.com";
const BASE = `https://${HOST}`;

/* ------------------------------ Country mapping ------------------------------ */
// The endpoint expects ISO-3166-1 alpha-2 codes (e.g. CN, ID, NG, GB).
const NAME_TO_CC: Record<string, string> = {
  nigeria: "NG", "united kingdom": "GB", uk: "GB", britain: "GB", england: "GB",
  "united states": "US", "united states of america": "US", usa: "US", us: "US", america: "US",
  canada: "CA", germany: "DE", france: "FR",
  "united arab emirates": "AE", uae: "AE", emirates: "AE",
  "schengen area": "DE", schengen: "DE",
  australia: "AU", india: "IN", china: "CN",
  "south africa": "ZA", ghana: "GH", kenya: "KE", japan: "JP", brazil: "BR",
  spain: "ES", italy: "IT", netherlands: "NL", portugal: "PT", ireland: "IE",
  turkey: "TR", egypt: "EG", morocco: "MA", saudi: "SA", "saudi arabia": "SA",
  qatar: "QA", indonesia: "ID", singapore: "SG", malaysia: "MY", thailand: "TH",
  vietnam: "VN", philippines: "PH", "south korea": "KR", korea: "KR",
  mexico: "MX", argentina: "AR", chile: "CL", colombia: "CO", peru: "PE",
  switzerland: "CH", sweden: "SE", norway: "NO", denmark: "DK", finland: "FI",
  belgium: "BE", austria: "AT", greece: "GR", poland: "PL",
  "new zealand": "NZ", russia: "RU", ukraine: "UA",
};

export function toCountryCode(input: string): string {
  if (!input) return "";
  const s = input.trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  const k = s.toLowerCase();
  if (NAME_TO_CC[k]) return NAME_TO_CC[k];
  // Best effort — first 2 letters; the API will reject if invalid and we fall back.
  return s.slice(0, 2).toUpperCase();
}

/* --------------------------------- Fetch --------------------------------- */

export type VisaCheckResult = {
  ok: boolean;
  status: number;
  raw: any;
  error?: string;
};

export async function checkVisaRequirement(
  passport: string,
  destination: string,
): Promise<VisaCheckResult> {
  const key = process.env.RAPIDAPI_VISA_KEY;
  if (!key) {
    return { ok: false, status: 0, raw: null, error: "RAPIDAPI_VISA_KEY is not configured" };
  }
  const passportCC = toCountryCode(passport);
  const destCC = toCountryCode(destination);
  if (!passportCC || !destCC) {
    return { ok: false, status: 400, raw: null, error: "Invalid passport or destination country" };
  }

  const body = new URLSearchParams({ passport: passportCC, destination: destCC });

  try {
    const res = await fetch(`${BASE}/v2/visa/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-rapidapi-host": HOST,
        "x-rapidapi-key": key,
      },
      body: body.toString(),
    });
    const text = await res.text();
    let raw: any = text;
    try { raw = JSON.parse(text); } catch { /* leave as string */ }
    if (!res.ok) {
      const msg =
        (raw && typeof raw === "object" && (raw.message || raw.error)) ||
        `Visa API error (${res.status})`;
      return { ok: false, status: res.status, raw, error: String(msg) };
    }
    return { ok: true, status: res.status, raw };
  } catch (e: any) {
    return { ok: false, status: 0, raw: null, error: e?.message ?? "Network error" };
  }
}

/* -------------------------- Normalize to UI shape -------------------------- */

type NormalizedVisa = {
  id: string;
  name: string;
  type?: string;
  visa_free?: boolean;
  evisa?: boolean;
  voa?: boolean;
  duration?: string;
  validity?: string;
  processing_time?: string;
  price?: number | string;
  currency?: string;
  requirements?: string[];
  notes?: string;
  source?: string;
  provider_slug?: string;
};

function strOrUndef(v: any): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

function asArray(v: any): string[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === "string") {
    const parts = v.split(/[\n;•]+|(?:^|\s)-\s+/).map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : [v];
  }
  return undefined;
}

export function normalizeVisaResponse(
  raw: any,
  passportCC: string,
  destCC: string,
): NormalizedVisa[] {
  if (!raw || typeof raw !== "object") return [];

  // The API returns a single object describing the visa rule for the pair.
  // Handle both wrapped and unwrapped shapes.
  const root = raw.data ?? raw.result ?? raw;

  // Some responses include an array of categories — expand them.
  const categories: any[] =
    Array.isArray(root?.categories) ? root.categories
    : Array.isArray(root?.options) ? root.options
    : [root];

  const out: NormalizedVisa[] = [];
  categories.forEach((c, idx) => {
    if (!c || typeof c !== "object") return;

    const visaType =
      strOrUndef(c.visa) ??
      strOrUndef(c.visa_type) ??
      strOrUndef(c.category) ??
      strOrUndef(c.type) ??
      strOrUndef(root.visa) ??
      strOrUndef(root.visa_type);

    const visaTypeLower = (visaType ?? "").toLowerCase();
    const visa_free =
      c.visa_free === true ||
      /visa[-\s]?free|not required|no visa/.test(visaTypeLower);
    const voa =
      c.visa_on_arrival === true ||
      /on[-\s]?arrival|voa\b/.test(visaTypeLower);
    const evisa =
      c.evisa === true ||
      /e[-\s]?visa|electronic|eta\b|esta\b/.test(visaTypeLower);

    const niceName =
      visa_free ? "Visa-free entry"
      : voa ? "Visa on arrival"
      : evisa ? "Electronic visa (e-Visa)"
      : visaType ? `${visaType} visa`
      : `${passportCC} → ${destCC} visa`;

    const price =
      c.price ?? c.fee ?? c.cost ?? root.price ?? root.fee ?? root.cost;
    const currency =
      strOrUndef(c.currency) ?? strOrUndef(root.currency) ?? "USD";
    const duration =
      strOrUndef(c.stay_duration) ?? strOrUndef(c.stay) ?? strOrUndef(c.duration) ??
      strOrUndef(root.stay_duration) ?? strOrUndef(root.stay);
    const validity =
      strOrUndef(c.validity) ?? strOrUndef(root.validity);
    const processing_time =
      strOrUndef(c.processing_time) ?? strOrUndef(c.processing) ??
      strOrUndef(root.processing_time) ?? strOrUndef(root.processing);

    const requirements =
      asArray(c.requirements) ??
      asArray(c.required_documents) ??
      asArray(root.requirements) ??
      asArray(root.required_documents);

    const notes =
      strOrUndef(c.notes) ?? strOrUndef(c.description) ??
      strOrUndef(root.notes) ?? strOrUndef(root.description);

    out.push({
      id: `visa-${passportCC}-${destCC}-${idx}`,
      name: niceName,
      type: visaType,
      visa_free,
      evisa,
      voa,
      duration,
      validity,
      processing_time,
      price: typeof price === "number" ? price : strOrUndef(price),
      currency,
      requirements,
      notes,
      source: strOrUndef(root.source) ?? "Visa Requirement API",
      provider_slug: "visa-requirement",
    });
  });

  return out;
}
