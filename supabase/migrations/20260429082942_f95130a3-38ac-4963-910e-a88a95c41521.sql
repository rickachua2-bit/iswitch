-- Add mode column to providers (test | live), default live
DO $$ BEGIN
  CREATE TYPE public.provider_mode AS ENUM ('test', 'live');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS mode public.provider_mode NOT NULL DEFAULT 'live';

-- Seed global mode setting (used as fallback when admin wants one switch)
INSERT INTO public.system_settings (key, value, description)
VALUES ('provider_mode', '"live"'::jsonb, 'Global API mode: test or live')
ON CONFLICT (key) DO NOTHING;
