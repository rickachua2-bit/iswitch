import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, UserPlus, Mail, Lock, User, Phone, Gift, Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";
import { AuthField, PasswordStrength } from "@/components/AuthField";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — iSwitch" },
      { name: "description", content: "Create your iSwitch traveler account in seconds." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agree) {
      setError("Please accept the Terms to continue.");
      return;
    }

    setLoading(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
          phone,
          account_type: "customer",
        },
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    void navigate({ to: "/dashboard" });
  }

  return (
    <AuthSplitLayout
      variant="customer"
      formTitle="Create your account"
      formSubtitle="Travel smarter with iSwitch — flights, stays, visas and more in one login."
    >
      {/* Welcome perks banner */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-accent/30 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-md">
          <Gift className="h-4 w-4" />
        </span>
        <div className="text-xs">
          <div className="font-extrabold text-foreground">Welcome bonus unlocked</div>
          <div className="text-muted-foreground">Get loyalty points & free seat selection on your first booking.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Full name"
          icon={User}
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jane Doe"
          hint="As shown on your passport — used for ticketing."
        />

        <AuthField
          label="Phone"
          icon={Phone}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+234 801 234 5678"
          hint="We'll send WhatsApp & SMS booking updates here."
        />

        <AuthField
          label="Email"
          icon={Mail}
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          hint="Booking confirmations & e-tickets land here."
          valid={email.length > 0 && /.+@.+\..+/.test(email) ? true : undefined}
        />

        <div className="space-y-2">
          <AuthField
            label="Password"
            icon={Lock}
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
          />
          <PasswordStrength value={password} />
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-primary"
          />
          <span>
            I agree to the{" "}
            <Link to="/" className="font-bold text-primary hover:underline">Terms</Link> and{" "}
            <Link to="/" className="font-bold text-primary hover:underline">Privacy Policy</Link>.
          </span>
        </label>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary-glow to-accent px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create my account
        </button>

        <div className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-extrabold text-primary hover:underline">Sign in</Link>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Plane className="h-3 w-3 text-primary" />
        Are you a travel agent?{" "}
        <Link to="/agents/apply" className="font-bold text-primary hover:underline">
          Apply as agent
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
