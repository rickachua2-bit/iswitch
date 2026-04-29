import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { supabase as browserSupabase } from "./client";

/**
 * Combined auth middleware:
 *  - On the CLIENT, attaches the current Supabase session access token as a
 *    Bearer Authorization header.
 *  - On the SERVER, validates the Bearer token and exposes { supabase, userId, claims }
 *    in the function context.
 *
 * Use this in place of `requireSupabaseAuth` so that calls made via
 * `useServerFn(...)` / direct invocations are properly authenticated.
 */
export const supabaseAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    let token: string | null = null;
    try {
      const { data } = await browserSupabase.auth.getSession();
      token = data?.session?.access_token ?? null;
    } catch {
      token = null;
    }
    return next({
      sendContext: token ? { supabaseAccessToken: token } : {},
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  })
  .server(async ({ next, context }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing backend environment variables.");
    }
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    const contextToken = typeof (context as any)?.supabaseAccessToken === "string" ? (context as any).supabaseAccessToken : null;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "").trim() : contextToken;
    if (!token) throw new Error("Unauthorized: please sign in again.");

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Error("Unauthorized: invalid session. Please sign in again.");
    }

    return next({
      context: { supabase, userId: data.claims.sub, claims: data.claims },
    });
  });
