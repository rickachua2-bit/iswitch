// Shared helper to durably hand off a selected result to its /book page.
// Saves to sessionStorage immediately AND awaits a backend cache write so
// the booking page can recover the offer even after refresh / cross-tab /
// payment redirect. Falls back gracefully if the backend save fails.

export type Vertical = "flights" | "stays" | "visas" | "car_rentals" | "tours" | "pickups";

export type PersistResult =
  | { ok: true; via: "session+server" | "session-only" | "server-only" }
  | { ok: false; error: string };

export async function persistSelectedOffer(opts: {
  vertical: Vertical;
  // sessionStorage key prefix used by the booking page (e.g. "hotel", "visa", "tour", "vehicle", "plan", "offer")
  sessionPrefix: string;
  // backend cache key prefix (must match what the booking page reads)
  cachePrefix: string;
  id: string;
  // The full payload the booking page needs (item + any context like dates, guests…)
  payload: Record<string, any>;
}): Promise<PersistResult> {
  const { vertical, sessionPrefix, cachePrefix, id, payload } = opts;

  // 1. sessionStorage — fast, same-tab path
  let sessionOk = false;
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`${sessionPrefix}:${id}`, JSON.stringify(payload));
      sessionOk = true;
    }
  } catch {
    /* quota / private mode — keep going, server cache will save us */
  }

  // 2. Server-side cache — survives refresh / payment redirect / new tab.
  // Awaited so the booking page can read it on first mount.
  let serverOk = false;
  let serverErr: string | undefined;
  try {
    const { saveOffer } = await import("@/server/offer-cache.functions");
    const res = await saveOffer({
      data: {
        id: `${cachePrefix}:${id}`,
        vertical,
        payload,
      },
    });
    if ((res as any)?.ok === true) serverOk = true;
    else serverErr = (res as any)?.error ?? "Failed to cache offer";
  } catch (e: any) {
    serverErr = e?.message ?? "Network error while saving offer";
  }

  if (sessionOk && serverOk) return { ok: true, via: "session+server" };
  if (sessionOk) return { ok: true, via: "session-only" };
  if (serverOk) return { ok: true, via: "server-only" };
  return { ok: false, error: serverErr ?? "Could not save your selection" };
}

/**
 * Recover an offer that was persisted with `persistSelectedOffer`.
 * Tries sessionStorage first, then the backend cache (with multiple retries
 * to cover the race where the saveOffer write is still in-flight).
 */
export async function recoverSelectedOffer(opts: {
  sessionPrefix: string;
  cachePrefix: string;
  id: string;
  /** How many times to retry the server cache (default 4 → up to ~3s). */
  retries?: number;
  /** Delay between retries in ms (default 750). */
  retryDelayMs?: number;
}): Promise<any | null> {
  const { sessionPrefix, cachePrefix, id, retries = 4, retryDelayMs = 750 } = opts;

  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(`${sessionPrefix}:${id}`);
      if (raw) return JSON.parse(raw);
    }
  } catch {
    /* ignore */
  }

  try {
    const { getOffer } = await import("@/server/offer-cache.functions");
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const res = await getOffer({ data: { id: `${cachePrefix}:${id}` } });
        if ((res as any)?.ok) return (res as any).payload;
      } catch {
        /* swallow and retry */
      }
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
