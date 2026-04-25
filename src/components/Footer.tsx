import { Mail, MapPin, Apple, Smartphone } from "lucide-react";

const TRENDING = [
  ["Lagos to London", "$750"],
  ["New York to Paris", "$620"],
  ["Dubai to Tokyo", "$890"],
  ["Toronto to Miami", "$310"],
  ["Accra to Joburg", "$480"],
];
const HOTELS = [
  ["Soneva Jani", "$7,400"],
  ["Burj Al Arab", "$1,850"],
  ["Aman Tokyo", "$1,200"],
  ["The Plaza NY", "$950"],
  ["Ritz Paris", "$1,100"],
];

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary"><span className="font-display text-sm font-black text-primary-foreground">i</span></div>
              <span className="font-display text-lg font-extrabold">iSwitch</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The Next Big Unicorn in Global Mobility. Search flights, book luxury hotels, and secure visas automatically. Powered by advanced AI and unparalleled design.
            </p>
            <div className="mt-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Download Mobile App (Optional)</div>
            <div className="mt-2 flex gap-2">
              <a className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs hover:bg-card/70" href="#">
                <Apple className="h-5 w-5" />
                <div className="text-left leading-tight">
                  <div className="text-[8px] uppercase opacity-70">Download on the</div>
                  <div className="font-bold">App Store</div>
                </div>
              </a>
              <a className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-xs hover:bg-card/70" href="#">
                <Smartphone className="h-5 w-5 text-success" />
                <div className="text-left leading-tight">
                  <div className="text-[8px] uppercase opacity-70">Get it on</div>
                  <div className="font-bold">Google Play</div>
                </div>
              </a>
            </div>
          </div>

          <FooterList title="Trending Flights" rows={TRENDING} />
          <FooterList title="Amazing Hotels" rows={HOTELS} />

          <div>
            <h5 className="mb-3 text-sm font-bold">Consultations</h5>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {["Study Abroad Experts", "Immigration Support", "Business & Corp Setup", "The Visa Vault", "Client Login →"].map((l) => (
                <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="mb-3 text-sm font-bold">Partnerships</h5>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">B2B Agent Portal</a></li>
              <li><a href="#" className="hover:text-foreground">Affiliate Network</a></li>
              <li><a href="#" className="hover:text-foreground">Corporate Accounts</a></li>
              <li><a href="#" className="hover:text-foreground">API Documentation</a></li>
              <li><a href="#" className="text-primary hover:opacity-80">God Mode Control</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 grid gap-6 border-t border-border/60 pt-8 md:grid-cols-2">
          <div>
            <h5 className="mb-3 flex items-center gap-2 text-sm font-bold"><Mail className="h-4 w-4 text-primary" /> Contact Us</h5>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> contact@iswitchub.com</div>
              <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> info@iswitchub.com</div>
            </div>
          </div>
          <form className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <input placeholder="Your Address" className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <input placeholder="How can we assist?" className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <button className="rounded-lg bg-gradient-primary px-5 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-glow hover:opacity-90">Send Direct Message</button>
          </form>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <div>© 2026 iSwitch Global LLC. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground">Privacy Policy</a>
            <a href="#" className="hover:text-foreground">Terms of Service</a>
            <a href="#" className="hover:text-foreground">Cookie Preferences</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div>
      <h5 className="mb-3 text-sm font-bold">{title}</h5>
      <ul className="space-y-2">
        {rows.map(([label, price]) => (
          <li key={label} className="flex items-center justify-between text-sm">
            <a href="#" className="text-muted-foreground hover:text-foreground">{label}</a>
            <span className="font-semibold text-primary">{price}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
