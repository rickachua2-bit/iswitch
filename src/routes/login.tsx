import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, LogIn, Mail, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";

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
    <AuthSplitLayout
      variant="customer"
      formTitle="Welcome back"
      formSubtitle={
        redirect === "/consultations"
          ? "Sign in to book your consultation."
          : "Sign in to your iSwitch account."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="••••••••"
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </button>

        <div className="flex items-center justify-between pt-1 text-xs">
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create account
          </Link>
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

function Field({ label, icon: Icon, children }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
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
