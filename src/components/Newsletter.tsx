import { useState } from "react";
import { Mail, Send, CheckCircle2, Sparkles } from "lucide-react";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-8 md:p-14">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-primary-glow/30 blur-3xl" />
          <div className="relative grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                <Sparkles className="h-3 w-3" /> Insider deals
              </span>
              <h2 className="mt-3 font-display text-2xl font-extrabold text-primary-foreground md:text-3xl">
                Get $50 off your first booking.
              </h2>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Subscribe and we'll send weekly hand-picked flash deals + a $50 voucher to your inbox.
              </p>
            </div>

            {done ? (
              <div className="rounded-2xl border border-white/20 bg-white/15 p-6 text-center backdrop-blur">
                <CheckCircle2 className="mx-auto h-10 w-10 text-accent" />
                <div className="mt-2 font-bold text-primary-foreground">You're in!</div>
                <p className="mt-1 text-sm text-primary-foreground/80">Check your inbox for your $50 voucher.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); if (email) setDone(true); }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <label className="flex flex-1 items-center gap-2 rounded-xl bg-card px-4 py-3 shadow-card">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-glow transition hover:opacity-95"
                >
                  Subscribe <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
