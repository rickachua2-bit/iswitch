import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — iSwitch" },
      { name: "description", content: "Sign in to manage bookings, applications and consultations." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dest = redirect && redirect.startsWith("/") ? redirect : "/dashboard";

  if (!authLoading && user) {
    void navigate({ to: dest });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    void navigate({ to: dest });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {redirect === "/consultations"
              ? "Sign in to book your consultation."
              : "Sign in to your iSwitch account."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
          <Field label="Email">
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <Field label="Password">
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </Field>

          {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </button>

          <div className="flex items-center justify-between pt-2 text-xs">
            <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create account
            </Link>
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
