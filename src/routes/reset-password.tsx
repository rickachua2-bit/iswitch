import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — iSwitch" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    void navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <section className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold text-foreground">Set a new password</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
          <Field label="New password">
            <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          </Field>
          <Field label="Confirm password">
            <input required type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" />
          </Field>
          {error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Update password
          </button>
        </form>
        <div className="text-center text-xs">
          <Link to="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
        </div>
      </section>
      <Footer />
      <style>{`.input{width:100%;border-radius:.375rem;border:1px solid hsl(var(--input));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem}.input:focus{outline:none;border-color:hsl(var(--primary));box-shadow:0 0 0 2px color-mix(in oklab,hsl(var(--primary)) 20%,transparent)}`}</style>
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
