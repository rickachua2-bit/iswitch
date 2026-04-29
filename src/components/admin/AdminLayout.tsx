import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Receipt,
  Wallet,
  Calendar,
  Activity,
  Percent,
  DollarSign,
  ShieldAlert,
  Loader2,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Crown,
  Plug,
  History,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Footer } from "@/components/Footer";

const NAV: { to: string; label: string; icon: typeof Users; group: "Overview" | "People" | "Commerce" | "System" }[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, group: "Overview" },
  { to: "/admin/users", label: "Users & Roles", icon: Users, group: "People" },
  { to: "/admin/agents", label: "Agent Applications", icon: Briefcase, group: "People" },
  { to: "/admin/bookings", label: "Bookings", icon: Receipt, group: "Commerce" },
  { to: "/admin/consultations", label: "Consultations", icon: Calendar, group: "Commerce" },
  { to: "/admin/wallets", label: "Wallets & Ledger", icon: Wallet, group: "Commerce" },
  { to: "/admin/operations", label: "Operations", icon: Activity, group: "System" },
  { to: "/admin/markups", label: "Markups & Settings", icon: Percent, group: "System" },
  { to: "/admin/currencies", label: "Currencies", icon: DollarSign, group: "System" },
  { to: "/admin/api-providers", label: "API Providers", icon: Plug, group: "System" },
];

export function AdminLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading, hasRole, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    void navigate({ to: "/login" });
    return null;
  }

  if (!hasRole("admin")) {
    return (
      <div className="min-h-screen bg-secondary/30">
        <section className="mx-auto max-w-md px-4 py-20 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have admin privileges.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block rounded-md bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">
            Back to dashboard
          </Link>
        </section>
      </div>
    );
  }

  const groups = ["Overview", "People", "Commerce", "System"] as const;

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          <button onClick={() => setOpen((o) => !o)} className="rounded-md border border-border p-2 md:hidden">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-md">
              <Crown className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-sm font-extrabold">Admin Console</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">iSwitch Control</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/dashboard" className="hidden text-xs font-semibold text-muted-foreground hover:text-primary md:block">
              ← Back to user dashboard
            </Link>
            <span className="hidden truncate max-w-[180px] text-xs text-muted-foreground md:block">{user.email}</span>
            <button onClick={() => signOut()} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-bold hover:border-destructive hover:text-destructive">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px]">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-14 left-0 z-30 w-64 transform border-r border-border bg-card transition-transform md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="flex h-full flex-col overflow-y-auto p-3">
            {groups.map((g) => (
              <div key={g} className="mb-3">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{g}</div>
                {NAV.filter((n) => n.group === g).map((n) => {
                  const active =
                    n.to === "/admin"
                      ? location.pathname === "/admin"
                      : location.pathname.startsWith(n.to);
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-gradient-primary text-primary-foreground shadow-md"
                          : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <n.icon className="h-4 w-4" />
                      <span className="flex-1">{n.label}</span>
                      {active && <ChevronRight className="h-3.5 w-3.5 opacity-80" />}
                    </Link>
                  );
                })}
              </div>
            ))}
            <div className="mt-auto rounded-xl border border-border bg-gradient-to-br from-primary/5 to-accent/10 p-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" /> Audit mode
              </div>
              All destructive actions require explicit confirmation.
            </div>
          </nav>
        </aside>

        {/* Backdrop for mobile */}
        {open && <div onClick={() => setOpen(false)} className="fixed inset-0 top-14 z-20 bg-foreground/30 md:hidden" />}

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {children ?? <Outlet />}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export function AdminPageHeader({ icon: Icon, title, description, action }: { icon: typeof Users; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-md">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold leading-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
