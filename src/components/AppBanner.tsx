import { Apple, Smartphone, QrCode } from "lucide-react";

export function AppBanner() {
  return (
    <section className="bg-secondary/40 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="overflow-hidden rounded-3xl bg-gradient-primary p-8 md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                Mobile app
              </span>
              <h2 className="mt-3 font-display text-3xl font-extrabold text-primary-foreground md:text-4xl">
                Take iSwitch with you, everywhere.
              </h2>
              <p className="mt-2 max-w-md text-sm text-primary-foreground/85">
                Manage bookings, track flights, chat with consultants and access your travel vault — anywhere in the world.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="#" className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-background transition hover:opacity-90">
                  <Apple className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-[10px] uppercase">Download on</div>
                    <div className="text-sm font-bold">App Store</div>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-background transition hover:opacity-90">
                  <Smartphone className="h-5 w-5" />
                  <div className="text-left">
                    <div className="text-[10px] uppercase">Get it on</div>
                    <div className="text-sm font-bold">Google Play</div>
                  </div>
                </a>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="flex h-44 w-44 items-center justify-center rounded-3xl bg-card shadow-elevated md:h-56 md:w-56">
                <QrCode className="h-32 w-32 text-primary md:h-40 md:w-40" strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
