import { Link } from "@tanstack/react-router";
import { Shield, Headphones, Globe, Heart } from "lucide-react";

export function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-10 border-t border-primary/15 bg-gradient-to-b from-transparent to-primary/5">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-2">
            <div className="font-display text-lg font-extrabold text-primary">iSwitch</div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your all-in-one travel companion — flights, stays, visas, insurance and expert consultations in one place.
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-primary">
              <Shield className="h-3.5 w-3.5" /> PCI-DSS secure payments
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Explore</h4>
            <ul className="space-y-1.5 text-sm">
              <li><Link to="/dashboard/book" className="text-muted-foreground hover:text-primary">Search & book</Link></li>
              <li><Link to="/dashboard/bookings" className="text-muted-foreground hover:text-primary">My bookings</Link></li>
              <li><Link to="/dashboard/wallet" className="text-muted-foreground hover:text-primary">Wallet & loyalty</Link></li>
              <li><Link to="/dashboard/consultations" className="text-muted-foreground hover:text-primary">Consultations</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Company</h4>
            <ul className="space-y-1.5 text-sm">
              <li><a href="/about" className="text-muted-foreground hover:text-primary">About us</a></li>
              <li><a href="/contact" className="text-muted-foreground hover:text-primary">Contact</a></li>
              <li><Link to="/agents/apply" className="text-muted-foreground hover:text-primary">Become an agent</Link></li>
              <li><a href="/blog" className="text-muted-foreground hover:text-primary">Blog</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Support</h4>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("iswitch:open-support"))}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow hover:bg-primary-dark transition-colors"
            >
              <Headphones className="h-3.5 w-3.5" /> Live chat 24/7
            </button>
            <ul className="space-y-1.5 pt-1 text-sm">
              <li><a href="/help" className="text-muted-foreground hover:text-primary">Help center</a></li>
              <li><a href="/terms" className="text-muted-foreground hover:text-primary">Terms of service</a></li>
              <li><a href="/privacy" className="text-muted-foreground hover:text-primary">Privacy policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-primary/10 pt-5 text-xs text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-primary" />
            <span>© {year} iSwitch Travel. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Crafted with</span>
            <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
            <span>for global travelers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
