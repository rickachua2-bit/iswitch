-- ENUMS
CREATE TYPE public.vertical AS ENUM ('flights','stays','visas','insurance','tours','pickups');
CREATE TYPE public.provider_kind AS ENUM ('api','crawl');
CREATE TYPE public.crawl_status AS ENUM ('queued','running','succeeded','failed');
CREATE TYPE public.unified_booking_status AS ENUM ('pending','confirmed','failed','cancelled','refunded');

-- PROVIDERS
CREATE TABLE public.providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  vertical public.vertical NOT NULL,
  kind public.provider_kind NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  base_url text,
  notes text,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  total_calls bigint NOT NULL DEFAULT 0,
  total_errors bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_providers_vertical ON public.providers(vertical);
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage providers" ON public.providers FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone views enabled providers" ON public.providers FOR SELECT USING (enabled = true);
CREATE TRIGGER trg_providers_updated BEFORE UPDATE ON public.providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVENTORY (crawled or curated catalog items for visas/insurance/tours/pickups)
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  vertical public.vertical NOT NULL,
  external_id text,                     -- id on the source site
  source_url text,
  title text NOT NULL,
  subtitle text,
  description text,
  origin text,                          -- e.g. nationality CC for visas, pickup for transfers
  destination text,                     -- destination CC/city
  currency text NOT NULL DEFAULT 'USD',
  price numeric(12,2),
  duration text,                        -- "3-5 business days", "2 hours"
  validity text,                        -- e.g. "90 days"
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,  -- arbitrary structured data per vertical
  raw jsonb,                            -- raw scraped payload for debugging
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider_id, external_id)
);
CREATE INDEX idx_inventory_vertical ON public.inventory_items(vertical, is_active);
CREATE INDEX idx_inventory_origin_dest ON public.inventory_items(origin, destination);
CREATE INDEX idx_inventory_provider ON public.inventory_items(provider_id);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inventory" ON public.inventory_items FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Anyone views active inventory" ON public.inventory_items FOR SELECT USING (is_active = true);
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CRAWL JOBS
CREATE TABLE public.crawl_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  status public.crawl_status NOT NULL DEFAULT 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  items_seen integer NOT NULL DEFAULT 0,
  items_upserted integer NOT NULL DEFAULT 0,
  items_deactivated integer NOT NULL DEFAULT 0,
  error text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crawl_jobs_provider ON public.crawl_jobs(provider_id, created_at DESC);
ALTER TABLE public.crawl_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage crawl jobs" ON public.crawl_jobs FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PROVIDER HEALTH EVENTS (lightweight log for uptime charts)
CREATE TABLE public.provider_health_events (
  id bigserial PRIMARY KEY,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  ok boolean NOT NULL,
  status_code integer,
  latency_ms integer,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_health_provider_time ON public.provider_health_events(provider_id, created_at DESC);
ALTER TABLE public.provider_health_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view health" ON public.provider_health_events FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert health" ON public.provider_health_events FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));

-- UNIFIED BOOKINGS (across all 6 verticals)
CREATE TABLE public.bookings_unified (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  vertical public.vertical NOT NULL,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  external_reference text,
  status public.unified_booking_status NOT NULL DEFAULT 'pending',
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_user ON public.bookings_unified(user_id, created_at DESC);
CREATE INDEX idx_bookings_vertical_status ON public.bookings_unified(vertical, status, created_at DESC);
CREATE INDEX idx_bookings_provider ON public.bookings_unified(provider_id, created_at DESC);
ALTER TABLE public.bookings_unified ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bookings" ON public.bookings_unified FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own bookings" ON public.bookings_unified FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone creates bookings" ON public.bookings_unified FOR INSERT
  WITH CHECK (
    ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id))
    OR ((user_id IS NULL) AND (length(customer_email) > 3) AND (length(customer_name) > 0))
  );
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings_unified FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 8 providers
INSERT INTO public.providers (slug, name, vertical, kind, base_url) VALUES
  ('duffel',       'Duffel',        'flights',  'api',   'https://api.duffel.com'),
  ('liteapi',      'LiteAPI',       'stays',    'api',   'https://api.liteapi.travel'),
  ('atlys',        'Atlys',         'visas',    'crawl', 'https://www.atlys.com'),
  ('sherpa',       'Sherpa',        'visas',    'crawl', 'https://www.joinsherpa.com'),
  ('ivisa',        'iVisa',         'visas',    'crawl', 'https://www.ivisa.com'),
  ('safetywing',   'SafetyWing',    'insurance','crawl', 'https://safetywing.com'),
  ('getyourguide', 'GetYourGuide',  'tours',    'crawl', 'https://www.getyourguide.com'),
  ('mozio',        'Mozio',         'pickups',  'crawl', 'https://www.mozio.com');