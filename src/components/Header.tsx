import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, Globe, Menu, User, Briefcase, X, Search, LogOut, LayoutDashboard, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import iswitchLogo from "@/assets/iswitch-logo.jpeg";

export function Header({ transparent = false }: { transparent?: boolean }) {
  const { t, i18n } = useTranslation();
  const { user, hasRole, signOut } = useAuth();
  const { currency, currencies, setCurrency } = useCurrency();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [curOpen, setCurOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const [curQuery, setCurQuery] = useState("");
  const headerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!headerRef.current?.contains(e.target as Node)) {
        setLangOpen(false);
        setCurOpen(false);
        setUserOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const NAV = [
    { label: t("nav.flights"), to: "/flights" as const },
    { label: t("nav.hotels"), to: "/stays" as const },
    { label: t("nav.visas"), to: "/visas" as const },
    { label: t("nav.insurance"), to: "/insurance" as const },
    { label: t("nav.tours"), to: "/tours" as const },
    { label: t("nav.transfers"), to: "/pickups" as const },
  ];

  const activeLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];
  const filteredLangs = SUPPORTED_LANGUAGES.filter((l) => {
    const q = langQuery.toLowerCase();
    return !q || l.label.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.includes(q);
  });
  const filteredCurs = currencies.filter((c) => {
    const q = curQuery.toLowerCase();
    return !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  function handleSignOut() {
    void signOut().then(() => navigate({ to: "/" }));
    setUserOpen(false);
  }

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 w-full ${
        transparent ? "bg-[var(--header-bg)]/95 backdrop-blur" : "bg-[var(--header-bg)] shadow-card"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        {/* Logo + nav */}
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="flex items-center" aria-label="iSwitch home">
            <img
              src={iswitchLogo}
              alt="iSwitch"
              className="h-10 w-auto rounded-lg bg-white object-contain p-1 shadow-card md:h-11"
            />
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((item) => {
              const extra =
                item.to === "/stays"
                  ? { search: { destination: "Dubai", checkIn: "", checkOut: "", guests: "2 Guests, 1 Room" } }
                  : {};
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  {...(extra as any)}
                  className="rounded-md px-2.5 py-2 text-sm font-semibold text-primary-foreground/85 transition hover:bg-white/10 hover:text-primary-foreground"
                  activeProps={{ className: "rounded-md px-2.5 py-2 text-sm font-semibold bg-white/15 text-accent" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Currency */}
          <div className="relative">
            <button
              onClick={() => { setCurOpen((v) => !v); setLangOpen(false); setUserOpen(false); }}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-semibold text-primary-foreground/85 transition hover:bg-white/10 md:gap-1 md:px-2 md:py-1.5 md:text-xs"
              aria-label="Select currency"
            >
              {currency.code} <ChevronDown className="h-3 w-3" />
            </button>
            {curOpen && (
              <DropdownPanel onClose={() => setCurOpen(false)}>
                <SearchBox value={curQuery} onChange={setCurQuery} placeholder={t("common.currency")} />
                <ul className="max-h-72 overflow-auto py-1">
                  {filteredCurs.map((c) => (
                    <li key={c.code}>
                      <button
                        onClick={() => { setCurrency(c.code); setCurOpen(false); setCurQuery(""); }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-7 font-bold">{c.symbol}</span>
                          <span className="font-semibold">{c.code}</span>
                          <span className="text-xs text-muted-foreground">{c.name}</span>
                        </span>
                        {c.code === currency.code && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    </li>
                  ))}
                  {filteredCurs.length === 0 && <li className="px-3 py-4 text-center text-xs text-muted-foreground">No matches</li>}
                </ul>
              </DropdownPanel>
            )}
          </div>

          {/* Language */}
          <div className="relative">
            <button
              onClick={() => { setLangOpen((v) => !v); setCurOpen(false); setUserOpen(false); }}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-semibold text-primary-foreground/85 transition hover:bg-white/10 md:gap-1 md:px-2 md:py-1.5 md:text-xs"
              aria-label="Select language"
            >
              <Globe className="h-3.5 w-3.5" /> {activeLang.code.toUpperCase()}
            </button>
            {langOpen && (
              <DropdownPanel onClose={() => setLangOpen(false)}>
                <SearchBox value={langQuery} onChange={setLangQuery} placeholder={t("common.language")} />
                <ul className="max-h-72 overflow-auto py-1">
                  {filteredLangs.map((l) => (
                    <li key={l.code}>
                      <button
                        onClick={() => { void i18n.changeLanguage(l.code); setLangOpen(false); setLangQuery(""); }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground hover:bg-secondary"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-8 font-mono text-xs uppercase text-muted-foreground">{l.code}</span>
                          <span className="font-semibold">{l.native}</span>
                          <span className="text-xs text-muted-foreground">{l.label}</span>
                        </span>
                        {l.code === i18n.language && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    </li>
                  ))}
                  {filteredLangs.length === 0 && <li className="px-3 py-4 text-center text-xs text-muted-foreground">No matches</li>}
                </ul>
              </DropdownPanel>
            )}
          </div>

          {/* Partner with us (B2B) */}
          <Link
            to="/agents/apply"
            className="hidden items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-primary-foreground/90 transition hover:bg-white/10 md:flex"
          >
            <Briefcase className="h-3.5 w-3.5" /> B2B
          </Link>

          {/* Sign in / user menu */}
          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => { setUserOpen((v) => !v); setLangOpen(false); setCurOpen(false); }}
                className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-white/15"
              >
                <User className="h-4 w-4" /> {user.email?.split("@")[0]} <ChevronDown className="h-3 w-3" />
              </button>
              {userOpen && (
                <DropdownPanel onClose={() => setUserOpen(false)}>
                  <ul className="py-1">
                    <li>
                      <Link to="/dashboard" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                    </li>
                    {hasRole("admin") && (
                      <li>
                        <Link to="/admin" onClick={() => setUserOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary">
                          <Briefcase className="h-4 w-4" /> Admin
                        </Link>
                      </li>
                    )}
                    <li>
                      <button onClick={handleSignOut} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-secondary">
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </li>
                  </ul>
                </DropdownPanel>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-primary-foreground/90 transition hover:bg-white/10 md:flex"
            >
              <User className="h-4 w-4" /> {t("cta.signIn")}
            </Link>
          )}

          <Link
            to="/consultations"
            className="hidden rounded-md bg-gradient-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-accent-foreground shadow-glow transition hover:opacity-90 md:inline-block"
          >
            Consult
          </Link>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-md p-2 text-primary-foreground hover:bg-white/10 lg:hidden"
            aria-label="Open menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-[var(--header-bg)] lg:hidden">
          <nav className="flex flex-col p-3">
            {NAV.map((item) => {
              const extra =
                item.to === "/stays"
                  ? { search: { destination: "Dubai", checkIn: "", checkOut: "", guests: "2 Guests, 1 Room" } }
                  : {};
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  {...(extra as any)}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-semibold text-primary-foreground/85 hover:bg-white/10"
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              <Link to="/agents/apply" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-primary-foreground">
                <Briefcase className="h-4 w-4" /> B2B
              </Link>
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-primary-foreground">
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  {hasRole("admin") && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-primary-foreground">
                      <Briefcase className="h-4 w-4" /> Admin
                    </Link>
                  )}
                  <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-destructive">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-primary-foreground">
                  <User className="h-4 w-4" /> {t("cta.signIn")}
                </Link>
              )}
              <Link to="/consultations" onClick={() => setMobileOpen(false)} className="rounded-md bg-gradient-accent px-3 py-2 text-center text-sm font-bold uppercase text-accent-foreground shadow-glow">
                Consult
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function DropdownPanel({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  void onClose;
  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-card shadow-elevated">
      {children}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <Search className="h-3.5 w-3.5 text-muted-foreground" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  );
}
