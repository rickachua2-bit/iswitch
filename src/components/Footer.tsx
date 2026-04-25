import { Link } from "@tanstack/react-router";
import { Globe, Send, Camera, Briefcase, Mail, Phone, MapPin } from "lucide-react";
import iswitchLogo from "@/assets/iswitch-logo.jpeg";

export function Footer() {
  return (
    <footer className="bg-[var(--header-bg)] text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent">
                <span className="font-display text-lg font-black text-accent-foreground">i</span>
              </div>
              <span className="font-display text-xl font-extrabold">iSwitch</span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-primary-foreground/75">
              The global mobility super app. Flights, stays, visas, insurance, tours, pickups and expert paid consultations — all in one place.
            </p>
            <div className="mt-4 flex gap-2">
              {[Globe, Send, Camera, Briefcase].map((Icon, i) => (
                <a key={i} href="#" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-accent hover:text-accent-foreground">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Services" links={[
            ["Flights", "/flights"], ["Stays", "/stays"], ["Visas", "/visas"], ["Insurance", "/insurance"],
            ["Tours", "/tours"], ["Pickups", "/pickups"],
          ]} />

          <FooterCol title="Consultations" links={[
            ["Study Abroad", "/consultations"], ["Immigration", "/consultations"],
            ["Work Abroad", "/consultations"], ["Business Setup", "/consultations"],
          ]} />

          <div>
            <div className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-accent">Contact</div>
            <ul className="space-y-2 text-sm text-primary-foreground/75">
              <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>hello@iswitch.com</span></li>
              <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><span>+234 800 ISWITCH</span></li>
              <li className="flex items-start gap-2"><MapPin className="h-3.5 w-3.5 mt-0.5" /><span>Lagos · London · Dubai · Toronto</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-primary-foreground/60 md:flex-row">
          <div>© {new Date().getFullYear()} iSwitch Global. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary-foreground">Privacy</a>
            <a href="#" className="hover:text-primary-foreground">Terms</a>
            <a href="#" className="hover:text-primary-foreground">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-accent">{title}</div>
      <ul className="space-y-2 text-sm text-primary-foreground/75">
        {links.map(([label, to]) => (
          <li key={label}><Link to={to} className="transition hover:text-primary-foreground">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
