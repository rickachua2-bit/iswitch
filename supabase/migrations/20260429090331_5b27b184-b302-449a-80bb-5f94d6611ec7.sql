
CREATE TABLE IF NOT EXISTS public.offer_cache (
  id text PRIMARY KEY,
  vertical text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_offer_cache_expires ON public.offer_cache(expires_at);

ALTER TABLE public.offer_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone can insert offers" ON public.offer_cache;
CREATE POLICY "anyone can insert offers"
ON public.offer_cache FOR INSERT TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "anyone can read offers" ON public.offer_cache;
CREATE POLICY "anyone can read offers"
ON public.offer_cache FOR SELECT TO anon, authenticated
USING (expires_at > now());
