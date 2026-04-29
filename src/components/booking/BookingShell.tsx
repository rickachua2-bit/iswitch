import { Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, BadgeCheck, CreditCard } from "lucide-react";
import type { ReactNode } from "react";

export function BookingShell({
  backTo,
  backLabel = "Back to results",
  step = 2,
  children,
}: {
  backTo: string;
  backLabel?: string;
  step?: number;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 text-sm">
          <Link
            to={backTo as any}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
          <Stepper step={step} />
        </div>
      </div>
      {children}
      <Footer />
    </div>
  );
}

export function Stepper({ step }: { step: number }) {
  const steps = ["Choose", "Review & details", "Payment"];
  return (
    <div className="ml-auto hidden items-center gap-2 text-xs font-semibold text-muted-foreground md:flex">
      {steps.map((s, i) => {
        const active = i + 1 === step;
        const done = i + 1 < step;
        return (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </span>
            <span className={active ? "text-foreground" : ""}>{s}</span>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-5">
      <div className="mb-3">
        <div className="text-sm font-bold text-foreground">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function ConfirmButton({ submitting, label = "Confirm and pay" }: { submitting: boolean; label?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-extrabold text-primary-foreground shadow-card transition hover:bg-primary-glow disabled:cursor-wait disabled:opacity-80"
      >
        {submitting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
            Confirming…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" /> {label}
          </>
        )}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-emerald-600" /> Encrypted checkout · iSwitch best price guarantee
      </p>
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-3 text-center text-[11px] text-muted-foreground shadow-card">
      <div className="flex flex-col items-center gap-1">
        <BadgeCheck className="h-4 w-4 text-primary" />
        Best price guaranteed
      </div>
      <div className="flex flex-col items-center gap-1">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        Secure checkout
      </div>
      <div className="flex flex-col items-center gap-1">
        <CreditCard className="h-4 w-4 text-primary" />
        Card · Bank · Wallet
      </div>
    </div>
  );
}

export function SuccessCard({
  title,
  reference,
  status,
  email,
  backTo,
  backLabel,
}: {
  title: string;
  reference?: string;
  status?: string;
  email?: string;
  backTo: string;
  backLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-card p-8 text-center shadow-card">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reference: <span className="font-bold text-foreground">{reference ?? "—"}</span>
      </p>
      <p className="text-sm text-muted-foreground">
        Status: <span className="font-bold text-foreground">{status ?? "confirmed"}</span>
      </p>
      {email && (
        <p className="mt-3 text-xs text-muted-foreground">A confirmation email is on its way to {email}.</p>
      )}
      <div className="mt-5 flex justify-center gap-2">
        <Link
          to={backTo as any}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-secondary"
        >
          {backLabel}
        </Link>
        <Link
          to="/dashboard"
          className="rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-glow"
        >
          View my bookings
        </Link>
      </div>
    </div>
  );
}
