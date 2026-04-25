-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('customer', 'agent', 'admin');
CREATE TYPE public.account_type AS ENUM ('customer', 'agent');
CREATE TYPE public.agent_status AS ENUM ('none', 'pending', 'approved', 'rejected');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- =========================================
-- updated_at helper
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  account_type public.account_type NOT NULL DEFAULT 'customer',
  agent_status public.agent_status NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER ROLES (separate table — never on profiles)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role checker (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================================
-- Auto-create profile + assign customer role on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _account_type public.account_type;
  _role public.app_role;
BEGIN
  _account_type := COALESCE(
    (NEW.raw_user_meta_data ->> 'account_type')::public.account_type,
    'customer'
  );

  INSERT INTO public.profiles (user_id, display_name, phone, account_type, agent_status)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'phone',
    _account_type,
    CASE WHEN _account_type = 'agent' THEN 'pending'::public.agent_status ELSE 'none'::public.agent_status END
  );

  -- Customers get the customer role immediately. Agents get NO role until admin approves.
  IF _account_type = 'customer' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- AGENT APPLICATIONS (KYB)
-- =========================================
CREATE TABLE public.agent_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  country TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  business_type TEXT NOT NULL,
  website TEXT,
  document_paths TEXT[] NOT NULL DEFAULT '{}',
  status public.application_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_agent_applications_updated_at
BEFORE UPDATE ON public.agent_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- CONSULTATION SERVICES (admin-managed catalog)
-- =========================================
CREATE TABLE public.consultation_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g. 'study_abroad', 'immigration', 'work_abroad', 'business_registration'
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_services ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_consultation_services_updated_at
BEFORE UPDATE ON public.consultation_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- CONSULTATION TIERS (30/60/90 min pricing)
-- =========================================
CREATE TABLE public.consultation_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.consultation_services(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30, 60, 90)),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (service_id, duration_minutes)
);

ALTER TABLE public.consultation_tiers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_consultation_tiers_updated_at
BEFORE UPDATE ON public.consultation_tiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- CONSULTATION SLOTS (admin-defined availability)
-- =========================================
CREATE TABLE public.consultation_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.consultation_services(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

ALTER TABLE public.consultation_slots ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_consultation_slots_service_starts ON public.consultation_slots (service_id, starts_at);
CREATE INDEX idx_consultation_slots_available ON public.consultation_slots (service_id, starts_at) WHERE is_booked = false;

CREATE TRIGGER trg_consultation_slots_updated_at
BEFORE UPDATE ON public.consultation_slots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- CONSULTATION BOOKINGS
-- =========================================
CREATE TABLE public.consultation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL UNIQUE REFERENCES public.consultation_slots(id) ON DELETE RESTRICT,
  tier_id UUID NOT NULL REFERENCES public.consultation_tiers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.consultation_services(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consultation_bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_consultation_bookings_user ON public.consultation_bookings (user_id);

CREATE TRIGGER trg_consultation_bookings_updated_at
BEFORE UPDATE ON public.consultation_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- SYSTEM SETTINGS (admin-only key/value store)
-- =========================================
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Seed sensible defaults for markups & commission
INSERT INTO public.system_settings (key, value, description) VALUES
  ('markup_b2c_percent', '15'::jsonb, 'Default markup % applied on B2C bookings'),
  ('markup_b2b_percent', '8'::jsonb, 'Default markup % applied on B2B (agent) bookings'),
  ('agent_commission_percent', '5'::jsonb, 'Default commission % paid to approved agents');

-- =========================================
-- RLS POLICIES
-- =========================================

-- profiles
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- agent_applications
CREATE POLICY "Agents view own application"
  ON public.agent_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agents create own application"
  ON public.agent_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agents update own pending application"
  ON public.agent_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins view all applications"
  ON public.agent_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all applications"
  ON public.agent_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- consultation_services (public read for active)
CREATE POLICY "Anyone views active services"
  ON public.consultation_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins view all services"
  ON public.consultation_services FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage services"
  ON public.consultation_services FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- consultation_tiers (public read for active)
CREATE POLICY "Anyone views active tiers"
  ON public.consultation_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage tiers"
  ON public.consultation_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- consultation_slots (public read for available)
CREATE POLICY "Anyone views available slots"
  ON public.consultation_slots FOR SELECT
  USING (is_booked = false AND starts_at > now());

CREATE POLICY "Admins view all slots"
  ON public.consultation_slots FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage slots"
  ON public.consultation_slots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- consultation_bookings
CREATE POLICY "Users view own bookings"
  ON public.consultation_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own bookings"
  ON public.consultation_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cancel own pending bookings"
  ON public.consultation_bookings FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'confirmed'));

CREATE POLICY "Admins view all bookings"
  ON public.consultation_bookings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage all bookings"
  ON public.consultation_bookings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- system_settings (admin only)
CREATE POLICY "Admins view settings"
  ON public.system_settings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage settings"
  ON public.system_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- STORAGE: kyb-documents (private bucket)
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyb-documents', 'kyb-documents', false);

CREATE POLICY "Agents upload own KYB docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyb-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Agents view own KYB docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyb-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Agents delete own KYB docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kyb-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all KYB docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyb-documents'
    AND public.has_role(auth.uid(), 'admin')
  );