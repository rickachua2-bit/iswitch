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
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  })
  .server(async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Response("Missing Supabase environment variables.", { status: 500 });
    }
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Response("Unauthorized", { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) throw new Response("Unauthorized", { status: 401 });

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      throw new Response("Unauthorized: Invalid token", { status: 401 });
    }

    return next({
      context: { supabase, userId: data.claims.sub, claims: data.claims },
    });
  });
