-- ============ CURRENCIES ============
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  rate_to_usd NUMERIC(18, 6) NOT NULL DEFAULT 1,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone views enabled currencies"
  ON public.currencies FOR SELECT
  USING (is_enabled = true);

CREATE POLICY "Admins view all currencies"
  ON public.currencies FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage currencies"
  ON public.currencies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER currencies_updated_at
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.currencies (code, name, symbol, rate_to_usd, sort_order) VALUES
  ('USD', 'US Dollar', '$', 1.000000, 1),
  ('EUR', 'Euro', '€', 0.920000, 2),
  ('GBP', 'British Pound', '£', 0.790000, 3),
  ('NGN', 'Nigerian Naira', '₦', 1600.000000, 4),
  ('KES', 'Kenyan Shilling', 'KSh', 129.000000, 5),
  ('ZAR', 'South African Rand', 'R', 18.500000, 6),
  ('GHS', 'Ghanaian Cedi', 'GH₵', 15.000000, 7),
  ('EGP', 'Egyptian Pound', 'E£', 49.000000, 8),
  ('MAD', 'Moroccan Dirham', 'DH', 9.900000, 9),
  ('CAD', 'Canadian Dollar', 'C$', 1.380000, 10),
  ('AUD', 'Australian Dollar', 'A$', 1.520000, 11),
  ('JPY', 'Japanese Yen', '¥', 151.000000, 12),
  ('CNY', 'Chinese Yuan', '¥', 7.230000, 13),
  ('INR', 'Indian Rupee', '₹', 83.500000, 14),
  ('AED', 'UAE Dirham', 'د.إ', 3.670000, 15),
  ('SAR', 'Saudi Riyal', '﷼', 3.750000, 16),
  ('BRL', 'Brazilian Real', 'R$', 5.100000, 17),
  ('MXN', 'Mexican Peso', '$', 20.000000, 18),
  ('ARS', 'Argentine Peso', '$', 980.000000, 19),
  ('CHF', 'Swiss Franc', 'CHF', 0.880000, 20),
  ('SEK', 'Swedish Krona', 'kr', 10.700000, 21),
  ('NOK', 'Norwegian Krone', 'kr', 10.900000, 22),
  ('DKK', 'Danish Krone', 'kr', 6.860000, 23),
  ('PLN', 'Polish Zloty', 'zł', 4.000000, 24),
  ('TRY', 'Turkish Lira', '₺', 34.500000, 25),
  ('RUB', 'Russian Ruble', '₽', 92.000000, 26),
  ('KRW', 'South Korean Won', '₩', 1380.000000, 27),
  ('SGD', 'Singapore Dollar', 'S$', 1.340000, 28),
  ('HKD', 'Hong Kong Dollar', 'HK$', 7.810000, 29),
  ('NZD', 'New Zealand Dollar', 'NZ$', 1.650000, 30);

-- ============ GUEST BOOKINGS ============
ALTER TABLE public.consultation_bookings
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN guest_name TEXT,
  ADD COLUMN guest_email TEXT,
  ADD COLUMN guest_phone TEXT;

-- Replace insert policy: allow logged-in users to book for themselves OR allow guest bookings (no user_id, with guest contact info).
DROP POLICY IF EXISTS "Users create own bookings" ON public.consultation_bookings;

CREATE POLICY "Anyone can create bookings"
  ON public.consultation_bookings FOR INSERT
  WITH CHECK (
    -- Logged-in user booking for themselves
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR
    -- Guest booking: no user_id, must include guest email
    (user_id IS NULL AND guest_email IS NOT NULL AND length(guest_name) > 0)
  );
