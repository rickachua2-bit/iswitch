import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, UserPlus, Mail, Lock, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";

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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
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
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <Field label="Full name" icon={User}>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="auth-input"
            placeholder="Jane Doe"
          />
        </Field>
        <Field label="Phone" icon={Phone}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+234..."
            className="auth-input"
          />
        </Field>
        <Field label="Email" icon={Mail}>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" icon={Lock}>
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="At least 8 characters"
          />
        </Field>

        {error && (
          <div className="rounded-md bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create account
        </button>

        <div className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-bold text-primary hover:underline">Sign in</Link>
        </div>
      </form>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Are you a travel agent or business?{" "}
        <Link to="/agents/apply" className="font-bold text-primary hover:underline">
          Apply as agent
        </Link>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .auth-input:focus {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px color-mix(in oklab, hsl(var(--primary)) 18%, transparent);
        }
      `}</style>
    </AuthSplitLayout>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      {children}
    </label>
  );
}
