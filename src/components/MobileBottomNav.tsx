import { Link, useLocation, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Home, Search, User, LayoutGrid, X,
  Plane, Hotel, FileCheck2, ShieldCheck, Compass, Car,
} from "lucide-react";

/**
 * MobileBottomNav — a beautiful, brand-themed bottom tab bar for mobile only.
 *
 * - 4 quick tabs + a central elevated launcher.
 * - The launcher opens a "verticals" sheet showing all 6 booking verticals,
 *   each linking to its own page.
 * - Works the same for guests, signed-in customers, and B2B agents — all the
 *   target routes are public marketing pages with their own auth flows.
 * - Hidden on tablet/desktop (md+).
 * - Hidden on auth pages so it never overlaps the centered forms.
 */

const VERTICALS = [
  { to: "/flights",   label: "Flights",   Icon: Plane,        grad: "from-sky-500 to-blue-600"        },
  { to: "/stays",     label: "Stays",     Icon: Hotel,        grad: "from-emerald-500 to-teal-600"    },
  { to: "/visas",     label: "Visas",     Icon: FileCheck2,   grad: "from-violet-500 to-purple-600"   },
  { to: "/insurance", label: "Insurance", Icon: ShieldCheck,  grad: "from-rose-500 to-pink-600"       },
  { to: "/tours",     label: "Tours",     Icon: Compass,      grad: "from-amber-500 to-orange-600"    },
  { to: "/pickups",   label: "Transfers", Icon: Car,          grad: "from-cyan-500 to-sky-600"        },
] as const;

const HIDDEN_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password", "/agents/apply", "/admin"];

export function MobileBottomNav() {
  const location = useLocation();
  const isLoading = useRouterState({ select: (s) => s.status === "pending" });
  const [open, setOpen] = useState(false);

  // Close the sheet on route change.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, isLoading]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <>
      {/* Spacer so fixed bar never covers content on mobile */}
      <div aria-hidden className="h-20 md:hidden" />

      {/* The bar */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="relative mx-3 mb-3">
          {/* Glow halo behind the bar */}
          <div className="pointer-events-none absolute inset-x-8 -top-3 h-8 rounded-full bg-primary/20 blur-2xl" />

          <div className="relative flex items-end justify-between gap-1 rounded-2xl border border-primary/15 bg-card/95 px-2 pt-2 pb-2 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <TabLink to="/" label="Home" Icon={Home} exact />
            <TabLink to="/dashboard/book" label="Search" Icon={Search} />

            {/* Central launcher */}
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label="Open verticals"
              className="group relative -mt-7 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground shadow-[0_12px_28px_-8px_var(--primary)] ring-4 ring-background transition active:scale-95"
            >
              <span className={`grid h-9 w-9 place-items-center transition-transform duration-300 ${open ? "rotate-45" : "rotate-0"}`}>
                {open ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
              </span>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-accent px-1.5 py-px text-[8px] font-extrabold uppercase tracking-wider text-accent-foreground shadow">
                Book
              </span>
            </button>

            <TabLink to="/dashboard/bookings" label="Trips" Icon={Compass} />
            <TabLink to="/dashboard/profile" label="Account" Icon={User} />
          </div>
        </div>
      </nav>

      {/* Verticals sheet */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        />

        {/* Sheet */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose a service to book"
          className={`absolute inset-x-0 bottom-0 transform overflow-hidden rounded-t-3xl border-t border-primary/20 bg-card shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${open ? "translate-y-0" : "translate-y-full"}`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {/* drag handle */}
          <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

          <div className="px-5 pt-2 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Quick book</div>
                <h3 className="font-display text-lg font-extrabold text-foreground">What are you booking?</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap a service to start. Works as guest or signed-in.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 px-5 pb-6">
            {VERTICALS.map(({ to, label, Icon, grad }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border bg-background p-3 text-center shadow-sm transition active:scale-95"
              >
                <span className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-md transition group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-extrabold text-foreground">{label}</span>
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary to-accent transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </div>

          <div className="mx-5 mb-5 flex items-center justify-between gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
            <div className="text-xs">
              <div className="font-extrabold text-foreground">Travel agent?</div>
              <div className="text-muted-foreground">Unlock B2B net rates.</div>
            </div>
            <Link
              to="/agents/apply"
              onClick={() => setOpen(false)}
              className="rounded-full bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary-foreground shadow-glow"
            >
              Apply
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function TabLink({
  to, label, Icon, exact,
}: {
  to: string;
  label: string;
  Icon: typeof Home;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: !!exact }}
      className="group flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-muted-foreground transition data-[status=active]:text-primary"
    >
      {({ isActive }) => (
        <>
          <span
            className={
              "relative grid h-8 w-8 place-items-center rounded-lg transition " +
              (isActive
                ? "bg-gradient-to-br from-primary/15 to-accent/15 text-primary"
                : "text-muted-foreground group-hover:text-foreground")
            }
          >
            <Icon className="h-5 w-5" />
            {isActive && (
              <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
            )}
          </span>
          <span className={"text-[10px] font-bold " + (isActive ? "text-primary" : "")}>
            {label}
          </span>
        </>
      )}
    </Link>
  );
}
