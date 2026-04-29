// Shared helper to durably hand off a selected result to its /book page.
// Saves to sessionStorage immediately AND awaits a backend cache write so
// the booking page can recover the offer even after refresh / cross-tab /
// payment redirect. Falls back gracefully if the backend save fails.

export type Vertical = "flights" | "stays" | "visas" | "insurance" | "tours" | "pickups";

export async function persistSelectedOffer(opts: {
  vertical: Vertical;
  // sessionStorage key prefix used by the booking page (e.g. "hotel", "visa", "tour", "vehicle", "plan", "offer")
  sessionPrefix: string;
  // backend cache key prefix (must match what the booking page reads)
  cachePrefix: string;
  id: string;
  // The full payload the booking page needs (item + any context like dates, guests…)
  payload: Record<string, any>;
}): Promise<void> {
  const { vertical, sessionPrefix, cachePrefix, id, payload } = opts;

  // 1. sessionStorage — fast, same-tab path
  try {
    sessionStorage.setItem(`${sessionPrefix}:${id}`, JSON.stringify(payload));
  } catch {
    /* quota — ignore */
  }

  // 2. Server-side cache — survives refresh / payment redirect / new tab.
  // Awaited so the booking page can read it on first mount.
  try {
    const { saveOffer } = await import("@/server/offer-cache.functions");
    await saveOffer({
      data: {
        id: `${cachePrefix}:${id}`,
        vertical,
        payload,
      },
    });
  } catch {
    /* non-fatal — sessionStorage path will still work in same tab */
  }
}

/**
 * Recover an offer that was persisted with `persistSelectedOffer`.
 * Tries sessionStorage first, then the backend cache (with one short retry
 * to cover the race where the saveOffer write is still in-flight).
 */
export async function recoverSelectedOffer(opts: {
  sessionPrefix: string;
  cachePrefix: string;
  id: string;
}): Promise<any | null> {
  const { sessionPrefix, cachePrefix, id } = opts;

  try {
    const raw = sessionStorage.getItem(`${sessionPrefix}:${id}`);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }

  try {
    const { getOffer } = await import("@/server/offer-cache.functions");
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await getOffer({ data: { id: `${cachePrefix}:${id}` } });
      if (res.ok) return res.payload;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
    }
  } catch {
    /* ignore */
  }
  return null;
}
