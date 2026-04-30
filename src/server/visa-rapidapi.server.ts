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

  const data = raw.data ?? raw;
  const dest = data?.destination ?? {};
  const passport = data?.passport ?? {};
  const rules = data?.visa_rules ?? {};

  // Collect rules: primary + any additional alternatives the API returns.
  const ruleEntries: Array<{ key: string; rule: any }> = [];
  if (rules.primary_rule) ruleEntries.push({ key: "primary", rule: rules.primary_rule });
  for (const [k, v] of Object.entries(rules)) {
    if (k === "primary_rule") continue;
    if (v && typeof v === "object" && !Array.isArray(v) && (v as any).name) {
      ruleEntries.push({ key: k, rule: v });
    } else if (Array.isArray(v)) {
      v.forEach((r, i) => {
        if (r && typeof r === "object" && (r as any).name) {
          ruleEntries.push({ key: `${k}-${i}`, rule: r });
        }
      });
    }
  }

  if (ruleEntries.length === 0) return [];

  return ruleEntries.map(({ key, rule }, idx) => {
    const visaTypeRaw = strOrUndef(rule.name) ?? "Visa";
    const visaTypeLower = visaTypeRaw.toLowerCase();

    const visa_free = /visa[-\s]?free|not required|no visa/.test(visaTypeLower);
    const voa = /on[-\s]?arrival|voa\b/.test(visaTypeLower);
    const evisa = /e[-\s]?visa|electronic|online visa|eta\b|esta\b/.test(visaTypeLower);

    const destName = strOrUndef(dest.name) ?? destCC;
    const niceName =
      visa_free ? `Visa-free entry to ${destName}`
      : voa ? `Visa on arrival — ${destName}`
      : evisa ? `Online / e-Visa — ${destName}`
      : `${visaTypeRaw} — ${destName}`;

    const requirements: string[] = [];
    if (passport.name) requirements.push(`Valid ${passport.name} passport`);
    if (dest.passport_validity) {
      requirements.push(`Passport valid for at least ${dest.passport_validity} beyond entry`);
    } else {
      requirements.push("Passport valid for at least 6 months beyond entry");
    }
    requirements.push("Recent passport-size photograph (white background)");
    requirements.push("Proof of onward / return travel");
    requirements.push("Proof of accommodation for the stay");
    requirements.push("Proof of sufficient funds (recent bank statements)");
    if (!visa_free) requirements.push(`Completed ${visaTypeRaw.toLowerCase()} application`);

    return {
      id: `visa-${passportCC}-${destCC}-${key}-${idx}`,
      name: niceName,
      type: visaTypeRaw,
      visa_free,
      evisa,
      voa,
      duration: strOrUndef(rule.duration),
      validity: strOrUndef(rule.validity) ?? strOrUndef(rule.duration),
      processing_time:
        strOrUndef(rule.processing_time) ??
        (evisa ? "3–10 business days" : voa ? "On arrival" : visa_free ? "—" : "10–20 business days"),
      price: rule.price ?? rule.fee ?? undefined,
      currency: strOrUndef(rule.currency) ?? strOrUndef(dest.currency_code) ?? "USD",
      requirements,
      notes:
        strOrUndef(rule.notes) ??
        (rule.link ? `Apply / learn more: ${rule.link}` : undefined),
      source: rule.link ? String(rule.link) : "Visa Requirement API",
      provider_slug: "visa-requirement",
    };
  });
}
