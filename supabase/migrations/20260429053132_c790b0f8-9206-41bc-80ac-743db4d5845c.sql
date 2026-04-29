-- Enum for wallet transaction types
DO $$ BEGIN
  CREATE TYPE public.wallet_tx_type AS ENUM ('fund', 'swap_in', 'swap_out', 'spend', 'refund', 'adjustment');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Per-user, per-currency balances
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  currency text NOT NULL,
  balance numeric(18,4) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own balances"
  ON public.wallet_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own balances"
  ON public.wallet_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own balances"
  ON public.wallet_balances FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all balances"
  ON public.wallet_balances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wallet_balances_updated
BEFORE UPDATE ON public.wallet_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ledger of every wallet movement
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tx_type public.wallet_tx_type NOT NULL,
  currency text NOT NULL,
  amount numeric(18,4) NOT NULL,
  counter_currency text,
  counter_amount numeric(18,4),
  exchange_rate numeric(18,8),
  description text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created
  ON public.wallet_transactions (user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all transactions"
  ON public.wallet_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage all transactions"
  ON public.wallet_transactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));