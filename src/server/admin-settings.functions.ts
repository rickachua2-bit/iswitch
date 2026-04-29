// Server functions for admin self-service settings: profile, notifications, brand.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

// ----- Profile -----
export const updateAdminProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(100).optional(),
        phone: z.string().trim().max(40).optional().or(z.literal("")),
        avatar_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
        bio: z.string().trim().max(500).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await assertAdmin(userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        display_name: data.display_name ?? null,
        phone: data.phone || null,
        avatar_url: data.avatar_url || null,
        bio: data.bio || null,
      })
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ----- Password change -----
export const changeAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        current_password: z.string().min(1),
        new_password: z.string().min(8).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;
    await assertAdmin(userId);

    // Verify current password by attempting a sign-in with the user's email.
    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getErr || !userRes?.user?.email) {
      return { ok: false as const, error: "Could not load account" };
    }
    const email = userRes.user.email;

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: data.current_password,
    });
    if (signErr) return { ok: false as const, error: "Current password is incorrect" };

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.new_password,
    });
    if (updErr) return { ok: false as const, error: updErr.message };
    return { ok: true as const };
  });

// ----- Notification prefs (stored on profile) -----
export const updateAdminNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        marketing_emails: z.boolean(),
        sms_notifications: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await assertAdmin(userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        marketing_emails: data.marketing_emails,
        sms_notifications: data.sms_notifications,
      })
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

// ----- Brand / site settings (system_settings key = "brand") -----
const BRAND_KEY = "brand";

export const getBrandSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("value")
      .eq("key", BRAND_KEY)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    const v = (data?.value ?? {}) as Record<string, string>;
    return {
      ok: true as const,
      settings: {
        brand_name: v.brand_name ?? "iSwitch",
        logo_url: v.logo_url ?? "",
        support_email: v.support_email ?? "",
        support_phone: v.support_phone ?? "",
        tagline: v.tagline ?? "",
      },
    };
  });

export const saveBrandSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        brand_name: z.string().trim().min(1).max(80),
        logo_url: z.string().trim().max(1000).optional().or(z.literal("")),
        support_email: z.string().trim().email().max(255).optional().or(z.literal("")),
        support_phone: z.string().trim().max(40).optional().or(z.literal("")),
        tagline: z.string().trim().max(200).optional().or(z.literal("")),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert(
        {
          key: BRAND_KEY,
          value: data,
          updated_by: context.userId,
          updated_at: new Date().toISOString(),
          description: "Brand and support contact settings",
        },
        { onConflict: "key" },
      );
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const getAdminProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("display_name, phone, avatar_url, bio, marketing_emails, sms_notifications")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) return { ok: false as const, error: error.message };
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    return {
      ok: true as const,
      profile: {
        email: u?.user?.email ?? "",
        display_name: data?.display_name ?? "",
        phone: data?.phone ?? "",
        avatar_url: data?.avatar_url ?? "",
        bio: data?.bio ?? "",
        marketing_emails: data?.marketing_emails ?? true,
        sms_notifications: data?.sms_notifications ?? true,
      },
    };
  });
