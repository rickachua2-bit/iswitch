import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset password — iSwitch" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-foreground">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email and we'll send a reset link.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-success/30 bg-success/10 p-6 text-center">
            <Mail className="mx-auto h-8 w-8 text-success" />
            <p className="mt-2 text-sm font-semibold text-foreground">Check your inbox at {email}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send reset link
            </button>
          </form>
        )}

        <div className="text-center text-xs">
          <Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
