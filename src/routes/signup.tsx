import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-foreground">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Travel smarter with iSwitch.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
          <Field label="Full name">
            <input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input" />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." className="input" />
          </Field>
          <Field label="Email">
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
            <span className="mt-1 block text-[11px] text-muted-foreground">At least 8 characters.</span>
          </Field>

          {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

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

        <div className="text-center text-xs text-muted-foreground">
          Are you a travel agent or business?{" "}
          <Link to="/agents/apply" className="font-bold text-primary hover:underline">
            Apply as agent
          </Link>
        </div>
      </section>
      <Footer />

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid hsl(var(--input));
          background: hsl(var(--background));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 2px color-mix(in oklab, hsl(var(--primary)) 20%, transparent);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
