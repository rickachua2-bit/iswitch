CREATE TABLE IF NOT EXISTS public.vertical_markups (
  vertical public.vertical NOT NULL PRIMARY KEY,
  customer_pct numeric(6,3) NOT NULL DEFAULT 0,
  b2b_pct numeric(6,3) NOT NULL DEFAULT 0,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vertical_markups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads markups"
  ON public.vertical_markups FOR SELECT
  USING (true);

CREATE POLICY "Admins manage markups"
  ON public.vertical_markups FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed defaults at 0% so prices remain unchanged until admin updates them.
INSERT INTO public.vertical_markups (vertical, customer_pct, b2b_pct) VALUES
  ('flights', 0, 0),
  ('stays', 0, 0),
  ('visas', 0, 0),
  ('insurance', 0, 0),
  ('tours', 0, 0),
  ('pickups', 0, 0)
ON CONFLICT (vertical) DO NOTHING;
