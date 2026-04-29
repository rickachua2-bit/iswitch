// Crawler runner: uses Firecrawl to scrape source pages and upserts inventory_items.
// Called only from server functions or scheduled hooks.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";

type Vertical = "visas" | "insurance" | "tours" | "pickups";

export interface NormalizedItem {
  external_id: string;
  source_url?: string;
  title: string;
  subtitle?: string;
  description?: string;
  origin?: string;
  destination?: string;
  currency?: string;
  price?: number;
  duration?: string;
  validity?: string;
  images?: string[];
  attributes?: Record<string, any>;
  raw?: any;
}

interface SourceConfig {
  slug: string;
  vertical: Vertical;
  // seed URLs to crawl. If you pass a `prompt` for json extraction, items returned will be normalized.
  seeds: { url: string; prompt: string }[];
}

const SOURCES: SourceConfig[] = [
  {
    slug: "atlys",
    vertical: "visas",
    seeds: [
      { url: "https://www.atlys.com/en-us/visas", prompt: "Extract up to 50 visa products. For each: title (visa name + country), destination country code, price (USD number), duration (processing time), validity, source_url. Return JSON: { items: [{title, destination, price, duration, validity, source_url}] }" },
    ],
  },
  {
    slug: "sherpa",
    vertical: "visas",
    seeds: [
      { url: "https://www.joinsherpa.com/travel-restrictions", prompt: "Extract a list of country visa requirement entries. For each: title (country name), destination (ISO2 country code), description (one-line summary), source_url. Return JSON: { items: [{title, destination, description, source_url}] }" },
    ],
  },
  {
    slug: "ivisa",
    vertical: "visas",
    seeds: [
      { url: "https://www.ivisa.com/all-countries", prompt: "Extract a list of visa offerings. For each: title, destination country code, price USD if shown, duration, source_url. JSON: { items: [{title, destination, price, duration, source_url}] }" },
    ],
  },
  {
    slug: "safetywing",
    vertical: "insurance",
    seeds: [
      { url: "https://safetywing.com/nomad-insurance/prices", prompt: "Extract insurance plan tiers shown. For each: title (plan name), description, price (USD per period), duration (per week / per 4 weeks), source_url. JSON: { items: [{title, description, price, duration, source_url}] }" },
    ],
  },
  {
    slug: "getyourguide",
    vertical: "tours",
    seeds: [
      { url: "https://www.getyourguide.com/-l17/", prompt: "Extract popular tour cards. For each: title, destination (city), price (number), currency, duration, image url, source_url. JSON: { items: [{title, destination, price, currency, duration, image, source_url}] }" },
    ],
  },
  {
    slug: "mozio",
    vertical: "pickups",
    seeds: [
      { url: "https://www.mozio.com/en-us/", prompt: "Extract featured airport transfer routes / cities. For each: title, origin (airport / city), destination (city), price USD if shown, duration, source_url. JSON: { items: [{title, origin, destination, price, duration, source_url}] }" },
    ],
  },
];

// Walk an arbitrary object and return the first array of plain objects we find.
// Firecrawl's JSON extract wraps results under varying keys ({items}, {data},
// {results}, {products}, the vertical name, etc.) — instead of guessing every
// shape, recursively pick the largest object-array we can find.
function deepFindItems(node: any, depth = 0): any[] {
  if (!node || depth > 6) return [];
  if (Array.isArray(node)) {
    const objs = node.filter(x => x && typeof x === "object" && !Array.isArray(x));
    if (objs.length) return objs;
    return [];
  }
  if (typeof node !== "object") return [];
  let best: any[] = [];
  for (const k of Object.keys(node)) {
    const found = deepFindItems(node[k], depth + 1);
    if (found.length > best.length) best = found;
  }
  return best;
}

async function firecrawlScrape(url: string, prompt: string): Promise<any[]> {
  const FK = process.env.FIRECRAWL_API_KEY;
  if (!FK) throw new Error("FIRECRAWL_API_KEY not configured");

  // Cap each scrape to ~45s so the outer server function doesn't hit the
  // edge upstream timeout (~60s on Cloudflare Workers).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45000);

  let res: Response;
  try {
    res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${FK}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        url,
        formats: [
          { type: "json", prompt: `${prompt}\n\nIMPORTANT: Always return a top-level JSON object with an "items" array, even if you can only extract 1-3 entries from the page. Never return an empty object.` },
        ],
        onlyMainContent: true,
        // Tighter Firecrawl-side timeout to prevent long-tail page loads.
        timeout: 30000,
      }),
    });
  } catch (e: any) {
    clearTimeout(timer);
    if (e?.name === "AbortError") {
      throw new Error(`firecrawl timeout after 45s for ${url}`);
    }
    throw e;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 402 || /insufficient credits/i.test(t)) {
      throw new Error("Firecrawl has insufficient credits. Top up the Firecrawl account for the configured API key, then run Seed all again.");
    }
    if (res.status === 408 || res.status === 504 || /timeout/i.test(t)) {
      throw new Error(`firecrawl timeout for ${url}`);
    }
    throw new Error(`firecrawl ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const root = json?.data ?? json;
  const extracted = root?.json ?? root?.extract ?? root?.llm_extraction ?? root;
  const items = deepFindItems(extracted);
  if (!items.length) {
    console.log(`[crawler] ${url} → empty extract. Top keys:`, Object.keys(root ?? {}), "json keys:", Object.keys(extracted ?? {}));
  } else {
    console.log(`[crawler] ${url} → ${items.length} items extracted`);
  }
  return items;
}

function normalize(raw: any, sourceUrl: string): NormalizedItem | null {
  const title = String(raw?.title ?? raw?.name ?? "").trim();
  if (!title) return null;
  const ext = String(raw?.id ?? raw?.source_url ?? raw?.url ?? `${title}|${raw?.destination ?? ""}`).slice(0, 240);
  const priceNum = typeof raw?.price === "number" ? raw.price : Number(String(raw?.price ?? "").replace(/[^0-9.]/g, "")) || undefined;
  return {
    external_id: ext,
    source_url: raw?.source_url ?? raw?.url ?? sourceUrl,
    title,
    subtitle: raw?.subtitle ?? undefined,
    description: raw?.description ?? undefined,
    origin: raw?.origin ?? undefined,
    destination: raw?.destination ?? undefined,
    currency: raw?.currency ?? "USD",
    price: priceNum,
    duration: raw?.duration ?? undefined,
    validity: raw?.validity ?? undefined,
    images: raw?.image ? [raw.image] : raw?.images ?? [],
    attributes: {},
    raw,
  };
}

export async function runCrawl(providerSlug: string, triggeredBy?: string): Promise<{ jobId: string; status: string; items_upserted: number; error?: string }> {
  const cfg = SOURCES.find(s => s.slug === providerSlug);
  if (!cfg) throw new Error(`Unknown provider slug: ${providerSlug}`);

  const { data: prov } = await supabaseAdmin.from("providers").select("id").eq("slug", providerSlug).maybeSingle();
  if (!prov) throw new Error(`Provider ${providerSlug} not in DB`);

  const { data: job } = await supabaseAdmin.from("crawl_jobs").insert({
    provider_id: prov.id, status: "running", started_at: new Date().toISOString(), triggered_by: triggeredBy ?? null,
  }).select("id").single();

  let seen = 0, upserted = 0;
  const MAX_ITEMS = 50; // cap per crawl run, per vertical request
  try {
    outer: for (const seed of cfg.seeds) {
      const items = await firecrawlScrape(seed.url, seed.prompt);
      for (const r of items) {
        if (upserted >= MAX_ITEMS) break outer;
        const n = normalize(r, seed.url);
        if (!n) continue;
        seen++;
        const { error } = await supabaseAdmin.from("inventory_items").upsert({
          provider_id: prov.id,
          vertical: cfg.vertical,
          external_id: n.external_id,
          source_url: n.source_url,
          title: n.title,
          subtitle: n.subtitle,
          description: n.description,
          origin: n.origin,
          destination: n.destination,
          currency: n.currency,
          price: n.price,
          duration: n.duration,
          validity: n.validity,
          images: n.images ?? [],
          attributes: n.attributes ?? {},
          raw: n.raw,
          is_active: true,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "provider_id,external_id" });
        if (!error) upserted++;
      }
    }
    await supabaseAdmin.from("crawl_jobs").update({
      status: "succeeded", finished_at: new Date().toISOString(), items_seen: seen, items_upserted: upserted,
    }).eq("id", job!.id);
    return { jobId: job!.id, status: "succeeded", items_upserted: upserted };
  } catch (e: any) {
    const msg = String(e?.message ?? e).slice(0, 1000);
    await supabaseAdmin.from("crawl_jobs").update({
      status: "failed", finished_at: new Date().toISOString(), items_seen: seen, items_upserted: upserted, error: msg,
    }).eq("id", job!.id);
    return { jobId: job!.id, status: "failed", items_upserted: upserted, error: msg };
  }
}

/**
 * Seed every crawled vertical: visas, insurance, tours, pickups.
 * Picks the first provider per vertical and crawls up to 50 items each.
 * Designed to be safe to call repeatedly — items are upserted by external_id.
 */
export async function runAllCrawls(triggeredBy?: string) {
  const verticals: Vertical[] = ["visas", "insurance", "tours", "pickups"];
  const results: Array<{ vertical: Vertical; slug: string; items_upserted: number; status: string; error?: string }> = [];
  for (const v of verticals) {
    const src = SOURCES.find(s => s.vertical === v);
    if (!src) continue;
    try {
      const r = await runCrawl(src.slug, triggeredBy);
      results.push({ vertical: v, slug: src.slug, ...r });
      if (r.error && /insufficient credits/i.test(r.error)) {
        break;
      }
    } catch (e: any) {
      const error = String(e?.message ?? e).slice(0, 300);
      results.push({ vertical: v, slug: src.slug, items_upserted: 0, status: "failed", error });
      if (/insufficient credits/i.test(error)) {
        break;
      }
    }
  }
  return results;
}

export const CRAWLER_SOURCES = SOURCES.map(s => ({ slug: s.slug, vertical: s.vertical, seeds: s.seeds.length }));
