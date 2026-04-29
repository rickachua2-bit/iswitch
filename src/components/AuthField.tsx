import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Check, X, Info, type LucideIcon } from "lucide-react";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  icon: LucideIcon;
  hint?: string;
  /** Optional success/validation state */
  valid?: boolean;
  /** Optional right-side adornment (e.g., a country code) */
  trailing?: ReactNode;
}

/**
 * A creative, icon-led auth input.
 * - Icon sits inside the input with a soft brand chip.
 * - Floating focus ring uses the primary color.
 * - Optional inline tip (Info icon) and validation tick.
 * - Auto-toggles password visibility for type="password".
 */
export function AuthField({
  label,
  icon: Icon,
  hint,
  valid,
  trailing,
  type = "text",
  className,
  ...rest
}: AuthFieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3 text-primary" />
        {label}
      </span>

      <div className="group relative">
        {/* Leading icon chip */}
        <span className="pointer-events-none absolute left-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md bg-gradient-to-br from-primary/15 to-accent/15 text-primary ring-1 ring-primary/15 transition group-focus-within:from-primary group-focus-within:to-primary-glow group-focus-within:text-primary-foreground group-focus-within:ring-primary">
          <Icon className="h-4 w-4" />
        </span>

        <input
          {...rest}
          type={inputType}
          className={
            "w-full rounded-xl border-2 border-border bg-background py-3 pl-12 pr-12 text-sm font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/70 transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 " +
            (className ?? "")
          }
        />

        {/* Trailing area: validation + password eye + custom trailing */}
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {valid === true && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
          {valid === false && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-500/15 text-rose-600">
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          {trailing}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </span>
      </div>

      {hint && (
        <span className="mt-1.5 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
          <span>{hint}</span>
        </span>
      )}
    </label>
  );
}

/** Live password strength meter — 0..4 score */
export function PasswordStrength({ value }: { value: string }) {
  const checks = [
    { ok: value.length >= 8, label: "8+ characters" },
    { ok: /[A-Z]/.test(value), label: "Uppercase letter" },
    { ok: /[0-9]/.test(value), label: "Number" },
    { ok: /[^A-Za-z0-9]/.test(value), label: "Symbol" },
  ];
  const score = checks.filter((c) => c.ok).length;
  const tones = [
    "bg-muted",
    "bg-rose-500",
    "bg-amber-500",
    "bg-sky-500",
    "bg-emerald-500",
  ];
  const labels = ["Too weak", "Weak", "Okay", "Strong", "Excellent"];

  if (!value) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={
              "h-1.5 flex-1 rounded-full transition " +
              (i < score ? tones[score] : "bg-muted")
            }
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold">
        <span className="text-foreground">
          {labels[score]}
        </span>
        {checks.map((c) => (
          <span
            key={c.label}
            className={c.ok ? "text-emerald-600" : "text-muted-foreground"}
          >
            {c.ok ? "✓" : "•"} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}
