import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Wallet, Plus, ArrowLeftRight, ArrowDownLeft, ArrowUpRight,
  Sparkles, Gift, TrendingUp, Loader2, Check, Globe2, Shield,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet & loyalty — iSwitch" }] }),
  component: WalletPage,
});

type Currency = { code: string; name: string; symbol: string; rate_to_usd: number };
type Balance = { currency: string; balance: number };
type Tx = {
  id: string; tx_type: string; currency: string; amount: number;
  counter_currency: string | null; counter_amount: number | null;
  exchange_rate: number | null; description: string | null; created_at: string;
};

const FEATURED = ["NGN", "USD", "EUR", "GBP"];

const CURRENCY_GRADIENTS: Record<string, string> = {
  NGN: "from-emerald-500 via-emerald-600 to-green-700",
  USD: "from-blue-600 via-indigo-600 to-violet-700",
  EUR: "from-sky-500 via-cyan-600 to-blue-700",
  GBP: "from-rose-500 via-pink-600 to-fuchsia-700",
  CAD: "from-red-500 via-rose-600 to-pink-700",
  AUD: "from-amber-500 via-orange-600 to-red-700",
  GHS: "from-yellow-500 via-amber-600 to-orange-700",
  KES: "from-lime-500 via-green-600 to-emerald-700",
  ZAR: "from-orange-500 via-amber-600 to-yellow-700",
  AED: "from-teal-500 via-emerald-600 to-green-700",
};

function gradientFor(code: string) {
  return CURRENCY_GRADIENTS[code] ?? "from-slate-600 via-slate-700 to-slate-900";
}

function fmt(amount: number, code: string, symbol?: string) {
  const sym = symbol ?? "";
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${sym}${safe.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${code}`;
}

// USD-anchored cross rate: amount_from -> amount_to
function convert(amount: number, from: Currency, to: Currency) {
  if (!from || !to || !from.rate_to_usd || !to.rate_to_usd) return 0;
  const usd = amount / from.rate_to_usd;
  return usd * to.rate_to_usd;
}

function WalletPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFund, setShowFund] = useState(false);
  const [showSwap, setShowSwap] = useState(false);

  const currencyMap = useMemo(() => {
    const m = new Map<string, Currency>();
    currencies.forEach((c) => m.set(c.code, c));
    return m;
  }, [currencies]);

  const balanceFor = (code: string) =>
    balances.find((b) => b.currency === code)?.balance ?? 0;

  // Total wallet value in USD
  const totalUsd = useMemo(
    () =>
      balances.reduce((sum, b) => {
        const c = currencyMap.get(b.currency);
        return sum + (c?.rate_to_usd ? b.balance / c.rate_to_usd : 0);
      }, 0),
    [balances, currencyMap]
  );

  async function refresh(uid: string) {
    const [bRes, tRes] = await Promise.all([
      supabase.from("wallet_balances").select("currency,balance").eq("user_id", uid),
      supabase
        .from("wallet_transactions")
        .select("id,tx_type,currency,amount,counter_currency,counter_amount,exchange_rate,description,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(25),
    ]);
    setBalances((bRes.data ?? []) as Balance[]);
    setTransactions((tRes.data ?? []) as Tx[]);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      setUserId(uid);

      const { data: cur } = await supabase
        .from("currencies")
        .select("code,name,symbol,rate_to_usd")
        .eq("is_enabled", true)
        .order("sort_order", { ascending: true });
      setCurrencies((cur ?? []) as Currency[]);

      if (uid) await refresh(uid);
      setLoading(false);
    })();
  }, []);

  async function handleFund(amount: number, currency: string) {
    if (!userId || amount <= 0) return;
    // No mock crediting. Real payment provider integration is required to
    // confirm funds before they are added to the wallet balance.
    toast.info(
      `Top-up of ${fmt(amount, currency, currencyMap.get(currency)?.symbol)} requires payment. ` +
      `Your wallet will be credited once payment is confirmed.`
    );
    setShowFund(false);
  }

  async function handleSwap(fromCode: string, toCode: string, fromAmount: number) {
    if (!userId || fromAmount <= 0 || fromCode === toCode) return;
    const from = currencyMap.get(fromCode);
    const to = currencyMap.get(toCode);
    if (!from || !to) return toast.error("Currency unavailable");
    if (balanceFor(fromCode) < fromAmount) return toast.error("Insufficient balance");

    const toAmount = convert(fromAmount, from, to);
    const rate = toAmount / fromAmount;
    const newFrom = balanceFor(fromCode) - fromAmount;
    const newTo = balanceFor(toCode) + toAmount;

    const upd = await supabase
      .from("wallet_balances")
      .upsert(
        [
          { user_id: userId, currency: fromCode, balance: newFrom },
          { user_id: userId, currency: toCode, balance: newTo },
        ],
        { onConflict: "user_id,currency" }
      );
    if (upd.error) return toast.error(upd.error.message);

    await supabase.from("wallet_transactions").insert([
      {
        user_id: userId, tx_type: "swap_out", currency: fromCode, amount: fromAmount,
        counter_currency: toCode, counter_amount: toAmount, exchange_rate: rate,
        description: `Swap ${fromCode} → ${toCode}`,
      },
      {
        user_id: userId, tx_type: "swap_in", currency: toCode, amount: toAmount,
        counter_currency: fromCode, counter_amount: fromAmount, exchange_rate: 1 / rate,
        description: `Swap ${fromCode} → ${toCode}`,
      },
    ]);

    toast.success(`Swapped to ${fmt(toAmount, toCode, to.symbol)}`);
    setShowSwap(false);
    await refresh(userId);
  }

  const featuredCurrencies = useMemo(
    () => FEATURED.map((c) => currencyMap.get(c)).filter(Boolean) as Currency[],
    [currencyMap]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl shadow-elevated">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-glow to-accent" />
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
        <div className="relative grid gap-6 px-6 py-8 text-primary-foreground md:grid-cols-[1.4fr_1fr] md:px-10 md:py-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Multi-currency wallet
            </span>
            <h1 className="mt-3 font-display text-3xl font-extrabold md:text-4xl">Your global travel wallet</h1>
            <p className="mt-2 max-w-xl text-sm text-primary-foreground/85 md:text-base">
              Fund in Naira, swap to USD, EUR, GBP and more — pay for any booking instantly with no card fees.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => setShowFund(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-card transition hover:scale-[1.02]"
              >
                <Plus className="h-4 w-4" /> Add money
              </button>
              <button
                onClick={() => setShowSwap(true)}
                className="inline-flex items-center gap-2 rounded-full bg-black/20 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-black/30"
              >
                <ArrowLeftRight className="h-4 w-4" /> Swap currency
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white/15 p-5 backdrop-blur">
            <div className="text-xs font-bold uppercase tracking-wider opacity-90">Total balance (≈ USD)</div>
            <div className="mt-1 font-display text-4xl font-extrabold">
              ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs opacity-90">
              <TrendingUp className="h-3.5 w-3.5" /> Live FX rates · {currencies.length} currencies supported
            </div>
          </div>
        </div>
      </section>

      {/* BALANCE CARDS */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold text-foreground">Your balances</h2>
            <p className="text-sm text-muted-foreground">Hold and pay in any of your funded currencies.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featuredCurrencies.map((c) => (
              <CurrencyCard
                key={c.code}
                currency={c}
                balance={balanceFor(c.code)}
                onFund={() => setShowFund(true)}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECONDARY STATS */}
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Gift} label="Loyalty points" value="0 pts" hint="Earn 1 pt per $1 spent." grad="from-amber-500 to-orange-600" />
        <StatCard icon={Sparkles} label="Tier" value="Explorer" hint="Unlock perks as you travel." grad="from-violet-500 to-purple-600" />
        <StatCard icon={Shield} label="Wallet protection" value="100% secure" hint="Bank-grade encryption." grad="from-emerald-500 to-teal-600" />
      </section>

      {/* TRANSACTIONS */}
      <section className="rounded-2xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-foreground">Recent activity</h2>
            <p className="text-xs text-muted-foreground">Funding, swaps, refunds — all in one place.</p>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-foreground">
            {transactions.length} entries
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Wallet className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No transactions yet. Fund your wallet to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {transactions.map((t) => (
              <TxRow key={t.id} tx={t} symbolFor={(c) => currencyMap.get(c)?.symbol ?? ""} />
            ))}
          </ul>
        )}
      </section>

      {/* MODALS */}
      {showFund && (
        <FundModal
          currencies={currencies}
          onClose={() => setShowFund(false)}
          onConfirm={handleFund}
        />
      )}
      {showSwap && (
        <SwapModal
          currencies={currencies}
          balanceFor={balanceFor}
          onClose={() => setShowSwap(false)}
          onConfirm={handleSwap}
        />
      )}
    </div>
  );
}

/* ============== CARDS ============== */

function CurrencyCard({
  currency, balance, onFund,
}: { currency: Currency; balance: number; onFund: () => void }) {
  const grad = gradientFor(currency.code);
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${grad} p-5 text-white shadow-elevated`}>
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-black/15 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-lg font-extrabold backdrop-blur">
              {currency.symbol}
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-90">{currency.code}</div>
              <div className="text-[10px] opacity-75">{currency.name}</div>
            </div>
          </div>
          <Globe2 className="h-4 w-4 opacity-70" />
        </div>
        <div className="mt-5 font-display text-2xl font-extrabold">
          {currency.symbol}
          {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="mt-1 text-xs opacity-80">Available balance</div>
        <button
          onClick={onFund}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur transition hover:bg-white/30"
        >
          <Plus className="h-3.5 w-3.5" /> Top up
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, hint, grad,
}: { icon: typeof Gift; label: string; value: string; hint: string; grad: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-glow`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function TxRow({ tx, symbolFor }: { tx: Tx; symbolFor: (c: string) => string }) {
  const isIn = tx.tx_type === "fund" || tx.tx_type === "swap_in" || tx.tx_type === "refund";
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  const tone = isIn ? "from-emerald-500 to-teal-600" : "from-rose-500 to-pink-600";
  const sign = isIn ? "+" : "−";
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">
            {tx.description ?? tx.tx_type}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(tx.created_at).toLocaleString()}
            {tx.exchange_rate ? ` · rate ${tx.exchange_rate.toFixed(4)}` : ""}
          </div>
        </div>
      </div>
      <div className={`text-right font-extrabold ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
        {sign}
        {symbolFor(tx.currency)}
        {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
        <span className="text-xs font-bold opacity-70">{tx.currency}</span>
      </div>
    </li>
  );
}

/* ============== MODALS ============== */

function FundModal({
  currencies, onClose, onConfirm,
}: {
  currencies: Currency[];
  onClose: () => void;
  onConfirm: (amount: number, currency: string) => void;
}) {
  const [currency, setCurrency] = useState("NGN");
  const [amount, setAmount] = useState("10000");
  const quickAmounts = currency === "NGN"
    ? [5000, 10000, 25000, 50000, 100000]
    : [50, 100, 250, 500, 1000];
  const symbol = currencies.find((c) => c.code === currency)?.symbol ?? "";

  return (
    <Modal title="Add money to wallet" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Currency</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {FEATURED.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition ${
                  currency === c
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border-2 border-border bg-background px-4 py-3 focus-within:border-primary">
            <span className="text-xl font-extrabold text-muted-foreground">{symbol}</span>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-2xl font-extrabold text-foreground outline-none"
            />
            <span className="text-xs font-bold text-muted-foreground">{currency}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(String(a))}
                className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold text-foreground transition hover:bg-primary hover:text-primary-foreground"
              >
                {symbol}{a.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <Shield className="mr-1 inline h-3 w-3" /> Payment provider integration is being finalised. Your wallet will only be credited after a real payment is confirmed — no funds are added automatically.
        </div>

        <button
          onClick={() => onConfirm(parseFloat(amount) || 0, currency)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3 font-extrabold text-primary-foreground shadow-glow transition hover:opacity-95"
        >
          <Check className="h-4 w-4" /> Continue to payment
        </button>
      </div>
    </Modal>
  );
}

function SwapModal({
  currencies, balanceFor, onClose, onConfirm,
}: {
  currencies: Currency[];
  balanceFor: (c: string) => number;
  onClose: () => void;
  onConfirm: (from: string, to: string, amount: number) => void;
}) {
  const fundedFirst = useMemo(() => {
    const codes = currencies.map((c) => c.code);
    const funded = codes.filter((c) => balanceFor(c) > 0);
    return funded.length ? funded[0] : "NGN";
  }, [currencies, balanceFor]);

  const [from, setFrom] = useState(fundedFirst);
  const [to, setTo] = useState("USD");
  const [amount, setAmount] = useState("10000");

  const fromCur = currencies.find((c) => c.code === from);
  const toCur = currencies.find((c) => c.code === to);
  const amountNum = parseFloat(amount) || 0;
  const converted = fromCur && toCur ? convert(amountNum, fromCur, toCur) : 0;
  const rate = amountNum > 0 ? converted / amountNum : 0;
  const available = balanceFor(from);
  const insufficient = amountNum > available;

  function flip() {
    setFrom(to);
    setTo(from);
  }

  return (
    <Modal title="Swap currency" onClose={onClose}>
      <div className="space-y-3">
        {/* FROM */}
        <div className="rounded-2xl border-2 border-border bg-secondary/30 p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>From</span>
            <span>Balance: {fromCur?.symbol}{available.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-extrabold text-foreground outline-none focus:border-primary"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-right text-2xl font-extrabold text-foreground outline-none"
            />
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={flip}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow transition hover:rotate-180"
            title="Flip"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        </div>

        {/* TO */}
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>To</span>
            <span>Balance: {toCur?.symbol}{balanceFor(to).toFixed(2)}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-extrabold text-foreground outline-none focus:border-primary"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
            <div className="w-full text-right font-display text-2xl font-extrabold text-primary">
              {converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3 text-xs text-muted-foreground">
          <span>Exchange rate</span>
          <span className="font-bold text-foreground">
            1 {from} ≈ {rate.toFixed(4)} {to}
          </span>
        </div>

        {insufficient && (
          <div className="rounded-xl bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-600">
            Insufficient {from} balance. Add money first.
          </div>
        )}

        <button
          disabled={insufficient || amountNum <= 0 || from === to}
          onClick={() => onConfirm(from, to, amountNum)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-glow px-5 py-3 font-extrabold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeftRight className="h-4 w-4" /> Confirm swap
        </button>
      </div>
    </Modal>
  );
}

function Modal({
  title, children, onClose,
}: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-extrabold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
