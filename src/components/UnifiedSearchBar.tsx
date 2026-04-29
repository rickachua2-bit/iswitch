import { Link, useNavigate } from "@tanstack/react-router";
import { Plane, Hotel, FileCheck, Shield, Map as MapIcon, Car } from "lucide-react";
import { FlightForm } from "@/components/FlightForm";
import {
  StayInlineForm,
  VisaInlineForm,
  InsuranceInlineForm,
  ToursInlineForm,
  PickupInlineForm,
} from "@/components/SearchTabsForms";

type TabId = "flights" | "stays" | "visas" | "insurance" | "tours" | "pickups";

const TABS: { id: TabId; label: string; icon: typeof Plane; route: any }[] = [
  { id: "flights", label: "Flights", icon: Plane, route: "/flights" },
  { id: "stays", label: "Hotels", icon: Hotel, route: "/stays" },
  { id: "visas", label: "Visas", icon: FileCheck, route: "/visas" },
  { id: "insurance", label: "Insurance", icon: Shield, route: "/insurance" },
  { id: "tours", label: "Tours", icon: MapIcon, route: "/tours" },
  { id: "pickups", label: "Car Transfers", icon: Car, route: "/pickups" },
];

export function UnifiedSearchBar({
  active,
  title,
  subtitle,
  initial,
  pending = false,
}: {
  active: TabId;
  title?: string;
  subtitle?: string;
  initial?: Record<string, any>;
  pending?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <section className="bg-gradient-hero pb-8 pt-6 md:pb-10">
      {(title || subtitle) && (
        <div className="mx-auto mb-5 max-w-4xl px-4 text-center">
          {title && (
            <h1 className="font-display text-2xl font-extrabold text-primary-foreground md:text-4xl">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-2 text-sm text-primary-foreground/80">{subtitle}</p>
          )}
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl px-4">
        {/* Tabs — 3 cols × 2 rows on mobile, single 6-col row on md+ */}
        <div className="grid grid-cols-3 gap-1 md:flex md:gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <Link
                key={t.id}
                to={t.route}
                className={`flex items-center justify-center gap-1.5 rounded-t-xl px-2 py-3 text-[11px] font-bold transition md:min-w-fit md:gap-2 md:px-5 md:text-sm ${
                  isActive
                    ? "bg-card text-primary shadow-card"
                    : "bg-white/15 text-primary-foreground hover:bg-white/25"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2.4} />
                <span className="truncate md:whitespace-nowrap">{t.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Form panel */}
        <div className="rounded-b-2xl rounded-tr-2xl bg-card p-4 shadow-elevated md:p-5">
          {active === "flights" && (
            <FlightForm
              pending={pending}
              onSearch={(q) =>
                navigate({ to: "/flights", search: { ...q } as never })
              }
            />
          )}
          {active === "stays" && (
            <StayInlineForm
              initial={initial}
              onSearch={(q) => navigate({ to: "/stays", search: q as never })}
            />
          )}
          {active === "visas" && (
            <VisaInlineForm
              initial={initial}
              onSearch={(q) => navigate({ to: "/visas", search: { ...q, submitted: "1" } as never })}
            />
          )}
          {active === "insurance" && (
            <InsuranceInlineForm
              initial={initial}
              onSearch={(q) =>
                navigate({ to: "/insurance", search: q as never })
              }
            />
          )}
          {active === "tours" && (
            <ToursInlineForm
              initial={initial}
              onSearch={(q) => navigate({ to: "/tours", search: q as never })}
            />
          )}
          {active === "pickups" && (
            <PickupInlineForm
              initial={initial}
              onSearch={(q) => navigate({ to: "/pickups", search: q as never })}
            />
          )}
        </div>
      </div>
    </section>
  );
}
