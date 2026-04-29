-- Payment provider enum
CREATE TYPE public.payment_provider AS ENUM ('stripe', 'korapay');

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled');

-- Fulfillment status enum
CREATE TYPE public.fulfillment_status AS ENUM ('pending', 'auto_confirmed', 'manual_pending', 'fulfilled', 'failed');

-- Add payment columns to bookings_unified
ALTER TABLE public.bookings_unified
  ADD COLUMN IF NOT EXISTS payment_provider public.payment_provider,
  ADD COLUMN IF NOT EXISTS payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS fulfillment_status public.fulfillment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS provider_confirmation jsonb;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent ON public.bookings_unified(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings_unified(payment_status);

-- Payment events audit table
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings_unified(id) ON DELETE SET NULL,
  provider public.payment_provider NOT NULL,
  event_type text NOT NULL,
  payment_intent_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_booking ON public.payment_events(booking_id);
CREATE INDEX idx_payment_events_intent ON public.payment_events(payment_intent_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view payment events"
  ON public.payment_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage payment events"
  ON public.payment_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));