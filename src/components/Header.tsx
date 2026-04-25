import { ChevronDown, Globe } from "lucide-react";

export function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-10">
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <span className="font-display text-lg font-black text-primary-foreground">i</span>
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight">iSwitch</span>
          </a>
          <nav className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/40 px-2 py-1.5 backdrop-blur md:flex">
            <a className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground" href="#">Search Engine</a>
            <a className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground" href="#">Inside the Vault</a>
            <a className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground" href="#">
              Consultations <ChevronDown className="h-3.5 w-3.5" />
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <button className="hidden items-center gap-1.5 text-muted-foreground transition hover:text-foreground md:flex">USD</button>
          <button className="hidden items-center gap-1.5 text-muted-foreground transition hover:text-foreground md:flex">
            <Globe className="h-4 w-4 text-success" /> EN
          </button>
          <a className="hidden text-muted-foreground transition hover:text-foreground md:block" href="#">Partners</a>
          <a className="text-foreground/90 transition hover:text-foreground" href="#">Sign In</a>
          <button className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90">
            Premium Setup
          </button>
        </div>
      </div>
    </header>
  );
}
