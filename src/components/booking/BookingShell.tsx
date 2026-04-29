import { Link } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Plane,
  BedDouble,
  Compass,
  FileCheck2,
  Heart,
  Car,
} from "lucide-react";
import type { ReactNode, ComponentType, SVGProps } from "react";

/* ============================================================
 * Types
 * ============================================================ */

export type BookingVertical =
  | "flights"
  | "stays"
  | "tours"
  | "visas"
  | "insurance"
  | "pickups";

export type BookingHeroProps = {
  vertical: BookingVertical;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: Array<{ icon?: ComponentType<SVGProps<SVGSVGElement>>; label: string }>;
  priceLabel?: string;
  priceValue?: string;
  priceFootnote?: string;
  backTo: string;
  backLabel?: string;
  step?: number;
};

const VERTICAL_META: Record<
  BookingVertical,
  { icon: ComponentType<SVGProps<SVGSVGElement>>; label: string }
> = {
  flights: { icon: Plane, label: "Flights" },
  stays: { icon: BedDouble, label: "Stays" },
  tours: { icon: Compass, label: "Tours" },
  visas: { icon: FileCheck2, label: "Visas" },
  insurance: { icon: Heart, label: "Insurance" },
  pickups: { icon: Car, label: "Pickups" },
};

/* ============================================================
 * Shell
 * ============================================================ */

export function BookingShell({
  backTo,
  backLabel = "Back to results",
  step = 2,
  hero,
  children,
}: {
  backTo: string;
  backLabel?: string;
  step?: number;
  hero?: BookingHeroProps;
  children: ReactNode;
}) {
  return (
    <div className="booking-shell relative min-h-screen">
      <Header />
      {hero ? (
        <BookingHero
          {...hero}
          backTo={hero.backTo ?? backTo}
          backLabel={hero.backLabel ?? backLabel}
          step={hero.step ?? step}
        />
      ) : (
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
      )}
      {children}
      <Footer />
    </div>
  );
}

/* ============================================================
 * Hero
 * ============================================================ */

export function BookingHero({
  vertical,
  eyebrow,
  title,
  subtitle,
  meta,
  priceLabel,
  priceValue,
  priceFootnote,
  backTo,
  backLabel = "Back to results",
  step = 2,
}: BookingHeroProps) {
  const v = VERTICAL_META[vertical];
  const VIcon = v.icon;
  return (
    <header className="booking-hero">
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-8 md:pt-8 md:pb-10">
        <Link
          to={backTo as any}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur transition hover:bg-white/15 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </Link>
        <div className="mt-5 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="booking-hero-chip">
                <VIcon className="h-4 w-4" />
                <span className="uppercase tracking-[0.18em]">
                  {v.label}
                </span>
              </span>
              {eyebrow && (
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                  {eyebrow}
                </span>
              )}
            </div>
            <h1 className="booking-hero-title mt-3 text-2xl leading-tight md:text-[34px]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 max-w-2xl text-sm text-white/75 md:text-base">
                {subtitle}
              </p>
            )}
            {meta && meta.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {meta.map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur"
                    >
                      {Icon && <Icon className="h-3.5 w-3.5 text-[var(--color-accent)]" />}
                      {m.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          {priceValue && (
            <div className="booking-hero-price">
              {priceLabel && (
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                  {priceLabel}
                </div>
              )}
              <div className="mt-1 text-3xl font-extrabold text-[var(--color-accent)] md:text-4xl">
                {priceValue}
              </div>
              {priceFootnote && (
                <div className="mt-1 text-[11px] text-white/70">{priceFootnote}</div>
              )}
            </div>
          )}
        </div>
        <div className="mt-6">
          <Stepper step={step} variant="hero" />
        </div>
      </div>
    </header>
  );
}

/* ============================================================
 * Stepper
 * ============================================================ */

export function Stepper({
  step,
  variant = "light",
}: {
  step: number;
  variant?: "light" | "hero";
}) {
  const steps = ["Choose", "Review & details", "Payment"];
  const isHero = variant === "hero";
  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${
        isHero ? "text-white/80" : "ml-auto hidden text-muted-foreground md:flex"
      }`}
    >
      {steps.map((s, i) => {
        const active = i + 1 === step;
        const done = i + 1 < step;
        return (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                done
                  ? isHero
                    ? "bg-[var(--color-success)] text-white"
                    : "bg-emerald-500 text-white"
                  : active
                    ? isHero
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
                      : "bg-primary text-primary-foreground"
                    : isHero
                      ? "bg-white/20 text-white/80"
                      : "bg-secondary text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={
                active ? (isHero ? "text-white" : "text-foreground") : ""
              }
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <span
                className={`mx-1 h-px w-6 ${isHero ? "bg-white/25" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
 * Section Card
 * ============================================================ */

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="booking-card p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="booking-card-rule" aria-hidden />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              {Icon && <Icon className="h-4 w-4 text-primary" />}
              {title}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
 * Field
 * ============================================================ */

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

/* ============================================================
 * Confirm Button
 * ============================================================ */

export function ConfirmButton({
  submitting,
  label = "Confirm and pay",
}: {
  submitting: boolean;
  label?: string;
}) {
  return (
    <div className="booking-card p-4">
      <button
        type="submit"
        disabled={submitting}
        className="booking-confirm-btn"
      >
        {submitting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
            Confirming…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 text-[var(--color-accent)]" /> {label}
          </>
        )}
      </button>
      <p className="mt-2 flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3 w-3 text-emerald-600" /> Encrypted checkout · iSwitch best price guarantee
      </p>
    </div>
  );
}

/* ============================================================
 * Trust Strip
 * ============================================================ */

export function TrustStrip() {
  return (
    <div className="booking-card grid grid-cols-3 gap-2 p-3 text-center text-[11px] text-muted-foreground">
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

/* ============================================================
 * Success Card
 * ============================================================ */

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
    <div className="booking-card p-8 text-center" style={{ borderColor: "color-mix(in oklab, var(--color-success) 40%, var(--color-border))" }}>
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
