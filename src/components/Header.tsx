import { Link } from "@tanstack/react-router";
import { ChevronDown, Globe, Menu, User } from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Flights", to: "/flights" },
  { label: "Hotels", to: "/stays" },
  { label: "Visas", to: "/visas" },
  { label: "Insurance", to: "/insurance" },
  { label: "Tours", to: "/tours" },
  { label: "Car Transfers", to: "/pickups" },
  { label: "Consultations", to: "/consultations" },
] as const;

export function Header({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-50 w-full ${
        transparent
          ? "bg-[var(--header-bg)]/95 backdrop-blur"
          : "bg-[var(--header-bg)] shadow-card"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
              <span className="font-display text-lg font-black text-accent-foreground">i</span>
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight text-primary-foreground">
              iSwitch
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-semibold text-primary-foreground/85 transition hover:bg-white/10 hover:text-primary-foreground"
                activeProps={{ className: "rounded-md px-3 py-2 text-sm font-semibold bg-white/15 text-accent" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-primary-foreground/85 transition hover:bg-white/10 md:flex">
            USD <ChevronDown className="h-3 w-3" />
          </button>
          <button className="hidden items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-primary-foreground/85 transition hover:bg-white/10 md:flex">
            <Globe className="h-3.5 w-3.5" /> EN
          </button>
          <button className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary-foreground/85 transition hover:bg-white/10 md:flex">
            <User className="h-4 w-4" /> Sign in
          </button>
          <Link
            to="/consultations"
            className="hidden rounded-md bg-gradient-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground shadow-glow transition hover:opacity-90 md:inline-block"
          >
            Book a Consult
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-md p-2 text-primary-foreground hover:bg-white/10 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[var(--header-bg)] lg:hidden">
          <nav className="flex flex-col p-3">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-semibold text-primary-foreground/85 hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
