import { useRouterState } from "@tanstack/react-router";
import { Loader2, Search, Lightbulb } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type TravelTipCategory =
  | "flights"
  | "stays"
  | "visas"
  | "car_rentals"
  | "tours"
  | "pickups"
  | "general";

interface SearchingOverlayProps {
  /** Path prefix this overlay belongs to, e.g. "/visas" */
  match: string;
  label?: string;
  sublabel?: string;
  /** Minimum time (ms) the overlay stays visible once shown. */
  minDurationMs?: number;
  /** Vertical-specific travel tips to rotate while searching. */
  category?: TravelTipCategory;
}

const TIPS: Record<TravelTipCategory, string[]> = {
  flights: [
    "Tuesdays and Wednesdays are usually the cheapest days to fly.",
    "Booking 4–6 weeks ahead often gets the best fare for international trips.",
    "Clear cookies or use incognito mode to avoid dynamic price hikes.",
    "Set price alerts — fares can swing by 20% within 48 hours.",
    "Flying out early morning (before 8am) usually means fewer delays.",
    "Carry-on bag? Confirm size limits — they vary by airline and route.",
    "Check visa transit rules even for short layovers in some countries.",
    "Choose seats over the wing for the smoothest ride during turbulence.",
    "Add your frequent flyer number — even one-off flights earn miles.",
    "Long-haul? Drink 250ml of water per flight hour to beat jet lag.",
  ],
  stays: [
    "Hotels often drop prices 2–3 weeks before check-in if rooms are unsold.",
    "Booking direct can unlock free upgrades or late checkout.",
    "Read the latest reviews — anything older than 6 months may be outdated.",
    "Check the cancellation policy before paying — flexible rates are worth it.",
    "Higher floors = quieter rooms, away from street noise and pool decks.",
    "Ask about resort or city fees before booking to avoid surprises.",
    "Loyalty programs are free and often unlock free Wi-Fi instantly.",
    "Photos shot with wide-angle lenses can make rooms look bigger than they are.",
    "Check the property’s exact location on a map — neighborhood matters.",
    "Breakfast included can save $15–25 per person per day.",
  ],
  visas: [
    "Apply for visas at least 4–6 weeks before travel for safety.",
    "Make sure your passport has 6+ months validity beyond your trip.",
    "Most countries require 2 blank passport pages for the visa stamp.",
    "Have proof of onward travel and accommodation ready — often required.",
    "Bank statements (last 3 months) strengthen most visa applications.",
    "Some visas are e-visas and can be approved within 24–72 hours.",
    "Avoid booking non-refundable flights until your visa is confirmed.",
    "Photo specs are strict — wrong size or background = rejection.",
    "Yellow fever vaccination cards are required for many African nations.",
    "Schengen visas let you visit 27 countries on a single permit.",
  ],
  car_rentals: [
    "Book early — rental rates climb sharply within 7 days of pick-up.",
    "Airport pick-ups are usually 10–15% pricier than city locations.",
    "Check the fuel policy: full-to-full beats prepaid for most trips.",
    "Inspect the car for scratches and photograph everything before driving off.",
    "Decline supplier insurance if your card already covers rental CDW.",
    "Automatic transmission costs more in Europe — book early if needed.",
    "Cross-border travel often requires written supplier permission.",
    "An International Driving Permit is required in 100+ countries.",
    "Unlimited mileage is standard in the US but rare in Europe.",
    "Return the car with the same fuel level to avoid steep refill fees.",
  ],
  tours: [
    "Book popular tours 2–4 weeks ahead in peak season — they sell out.",
    "Small-group tours (under 12 people) usually deliver a better experience.",
    "Free cancellation up to 24 hours is common — look for that badge.",
    "Tip your guide 10–15% of the tour price if service was great.",
    "Read the meeting point details carefully — some are tricky to find.",
    "Wear comfortable shoes — most city tours involve 3–5km of walking.",
    "Sunrise and sunset tours beat midday for photos and crowds.",
    "Bring water, sunscreen, and a light jacket even on warm days.",
    "Check what’s included — entrance fees aren’t always part of the price.",
    "Shoulder season tours are 20–30% cheaper and far less crowded.",
  ],
  pickups: [
    "Book your airport transfer at least 24 hours in advance.",
    "Share your flight number — drivers track delays automatically.",
    "Confirm the meeting point: arrivals hall, curbside, or parking.",
    "Private transfers cost more but skip taxi queues entirely.",
    "Always agree on the price upfront if booking on arrival.",
    "Save the driver’s number on WhatsApp before you land.",
    "Carry small local cash for tolls, tips, or last-minute change.",
    "Child seats often need to be requested at booking — not on arrival.",
    "Allow 90 minutes between landing and your transfer pickup time.",
    "Vehicles fit luggage tightly — declare extra bags when booking.",
  ],
  general: [
    "Always keep a digital copy of your passport in cloud storage.",
    "Notify your bank before travelling to avoid frozen card alerts.",
    "Pack one outfit in your carry-on in case checked bags are delayed.",
    "Download offline maps before you land — saves data and stress.",
    "Currency at airport ATMs usually beats exchange counters.",
    "A power bank under 100Wh is allowed in carry-on, not checked bags.",
  ],
};

/**
 * Full-screen-ish animated overlay shown while a route loader is fetching
 * results for a search. Uses TanStack Router's pending state so it appears
 * the moment the user clicks "Search" and disappears when results arrive.
 *
 * We also enforce a minimum visible duration so very fast responses (or
 * fast failures) still produce visible feedback for the user.
 */
export function SearchingOverlay({
  match,
  label = "Searching…",
  sublabel,
  minDurationMs = 900,
  category = "general",
}: SearchingOverlayProps) {
  const routerPending = useRouterState({
    select: (s) => {
      const status = (s as any).status as string | undefined;
      const pendingMatches = ((s as any).pendingMatches ?? []) as Array<{ pathname?: string }>;
      const isLoading = (s as any).isLoading as boolean | undefined;
      const isTransitioning = (s as any).isTransitioning as boolean | undefined;
      const onMatch = s.location.pathname.startsWith(match);
      const hasPendingForMatch = pendingMatches.some((m) => m.pathname?.startsWith(match));
      return (
        (onMatch && (isLoading || isTransitioning || status === "pending")) ||
        hasPendingForMatch
      );
    },
  });

  const [visible, setVisible] = useState(false);
  const shownAtRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (routerPending) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (!visible) {
        shownAtRef.current = Date.now();
        setVisible(true);
      }
    } else if (visible) {
      const elapsed = Date.now() - (shownAtRef.current ?? Date.now());
      const remaining = Math.max(0, minDurationMs - elapsed);
      hideTimerRef.current = setTimeout(() => setVisible(false), remaining);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [routerPending, visible, minDurationMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in"
    >
      <div className="mx-4 flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border bg-card p-8 text-center shadow-elevated animate-scale-in">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
          <Search className="relative h-7 w-7 text-primary" strokeWidth={2.4} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-2 font-display text-base font-bold text-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {label}
          </div>
          {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-primary/10">
          <div className="h-full w-1/3 animate-[slide-in-right_1.2s_ease-in-out_infinite] rounded-full bg-gradient-primary" />
        </div>

        <TravelTip category={category} />
      </div>
    </div>
  );
}

/** Rotating travel tip card, swaps every ~4s while the overlay is visible. */
export function TravelTip({
  category = "general",
  intervalMs = 4000,
  className = "",
}: {
  category?: TravelTipCategory;
  intervalMs?: number;
  className?: string;
}) {
  // Shuffle tips on each mount so every search shows a new sequence and we
  // don't repeat the same opening tip the user just saw.
  const tips = useMemo(() => {
    const source = TIPS[category] ?? TIPS.general;
    const arr = [...source];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % tips.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [tips, intervalMs]);

  const label =
    category === "flights" ? "Flight tip" :
    category === "stays" ? "Hotel tip" :
    category === "visas" ? "Visa tip" :
    category === "car_rentals" ? "Car rental tip" :
    category === "tours" ? "Tour tip" :
    category === "pickups" ? "Transfer tip" :
    "Travel tip";

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-4 text-left ${className}`}
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
        <Lightbulb className="h-3 w-3" />
        {label}
      </div>
      <p
        key={idx}
        className="animate-fade-in text-sm leading-snug text-foreground"
      >
        {tips[idx]}
      </p>
    </div>
  );
}
