import { createFileRoute } from "@tanstack/react-router";
import { Wallet, CreditCard, Gift, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet & loyalty — iSwitch" }] }),
  component: WalletPage,
});

function WalletPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Wallet & loyalty</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage payment methods, balance and rewards.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card icon={Wallet} label="Wallet balance" value="$0.00" hint="Top up to book faster." />
        <Card icon={Gift} label="Loyalty points" value="0 pts" hint="Earn on every booking." />
        <Card icon={Sparkles} label="Tier" value="Explorer" hint="Unlock perks as you travel." />
      </div>

      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 font-display text-lg font-extrabold">No saved payment methods</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saved cards & wallet top-ups arrive with payment integration.</p>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, hint }: { icon: typeof Wallet; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <Icon className="h-5 w-5 text-primary" />
      <div className="mt-3 text-2xl font-extrabold text-foreground">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
