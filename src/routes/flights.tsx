import { createFileRoute, Outlet, useChildMatches, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { UnifiedSearchBar } from "@/components/UnifiedSearchBar";
import { z } from "zod";
import { TrendingDeals } from "@/components/TrendingDeals";
import { HandpickedRoutes } from "@/components/HandpickedRoutes";
import {
  QuickRouteChips,
  CabinClasses,
  FlightValueProps,
  FlightFAQ,
} from "@/components/flights/FlightLandingExtras";

const searchSchema = z.object({
  origin: z.coerce.string().optional(),
  destination: z.coerce.string().optional(),
  departure: z.coerce.string().optional(),
  returnDate: z.coerce.string().optional(),
  travelers: z.coerce.string().optional(),
  trip: z.coerce.string().optional(),
  cabin: z.coerce.string().optional(),
  adults: z.coerce.string().optional(),
  children: z.coerce.string().optional(),
  infants: z.coerce.string().optional(),
  segments: z.coerce.string().optional(),
});

export const Route = createFileRoute("/flights")({
  head: () => ({
    meta: [
      { title: "Cheap Flights — Compare 500+ airlines | iSwitch" },
      { name: "description", content: "Compare and book real-time flights worldwide on iSwitch. Best price guarantee on 500+ airlines." },
      { property: "og:title", content: "Cheap Flights | iSwitch" },
      { property: "og:description", content: "Search and book the cheapest flights worldwide." },
    ],
  }),
  validateSearch: (s) => searchSchema.parse(s),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-destructive">Failed to load: {error.message}</div>
  ),
  component: FlightsPage,
});

function FlightsPage() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;
  return <FlightsLandingPage />;
}

function FlightsLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header />
      <UnifiedSearchBar
        active="flights"
        title="Compare cheap flights worldwide"
        subtitle="Live NDC + GDS inventory · 500+ airlines · Real-time confirmation"
      />

      <QuickRouteChips
        onPick={(o, d) =>
          navigate({
            to: "/flights",
            search: (prev: any) => ({ ...prev, origin: o, destination: d }),
          })
        }
      />
      <HandpickedRoutes />
      <CabinClasses />
      <TrendingDeals />
      <FlightValueProps />
      <FlightFAQ />

      <Footer />
    </div>
  );
}
