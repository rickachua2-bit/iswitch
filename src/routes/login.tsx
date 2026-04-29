import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, LogIn, Mail, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AuthSplitLayout } from "@/components/AuthSplitLayout";
import { AuthField } from "@/components/AuthField";

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
  const [remember, setRemember] = useState(true);
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
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField
          label="Email"
          icon={Mail}
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          hint="Use the email you signed up with."
          valid={email.length > 0 && /.+@.+\..+/.test(email) ? true : undefined}
        />

        <AuthField
          label="Password"
          icon={Lock}
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex cursor-pointer items-center gap-2 font-semibold text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border accent-primary"
            />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="font-bold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary-glow to-accent px-4 py-3 text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-glow transition hover:scale-[1.01] disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </button>

        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-center text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
          New here?{" "}
          <Link to="/signup" className="font-extrabold text-primary hover:underline">
            Create your free account
          </Link>{" "}
          in 60 seconds.
        </div>
      </form>

      <div className="mt-4 text-center text-xs text-muted-foreground">
        Are you a travel agent or business?{" "}
        <Link to="/agents/apply" className="font-bold text-primary hover:underline">
          Apply as agent
        </Link>
      </div>
    </AuthSplitLayout>
  );
}
