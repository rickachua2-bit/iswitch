import { ShieldCheck, Lock, BadgeCheck, Award } from "lucide-react";

const PARTNERS = [
  "IATA", "ATOL", "Visa", "Mastercard", "PayPal", "Stripe", "Trustpilot", "Booking.com",
];

const BADGES = [
  { icon: ShieldCheck, text: "PCI-DSS Certified" },
  { icon: Lock, text: "SSL Encrypted" },
  { icon: BadgeCheck, text: "IATA Accredited" },
  { icon: Award, text: "Trustpilot Excellent" },
];

export function TrustBadges() {
  return (
    <section className="border-y border-border bg-card py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-6 text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Trusted & accredited by
          </div>
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
          {PARTNERS.map((p) => (
            <div key={p} className="font-display text-lg font-bold tracking-tight text-foreground/60 grayscale">
              {p}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-6 md:grid-cols-4">
          {BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.text} className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
                <Icon className="h-4 w-4 text-success" />
                {b.text}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
