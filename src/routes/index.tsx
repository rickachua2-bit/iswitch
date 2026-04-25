import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-iconic.jpg";
import { Header } from "@/components/Header";
import { SearchTabs } from "@/components/SearchTabs";
import { HeroShowcase } from "@/components/HeroShowcase";
import { ServicesGrid } from "@/components/ServicesGrid";
import { TrendingDeals } from "@/components/TrendingDeals";
import { HandpickedRoutes } from "@/components/HandpickedRoutes";
import { AviationLounge } from "@/components/AviationLounge";
import { WhyBook } from "@/components/WhyBook";
import { Testimonials } from "@/components/Testimonials";
import { Newsletter } from "@/components/Newsletter";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "iSwitch — Flights, Stays, Visas & Free Travel Consultations" },
      { name: "description", content: "Book flights, hotels, visas, insurance, tours and airport pickups. Plus free expert consultations on study abroad, immigration, work abroad and global business setup." },
      { property: "og:title", content: "iSwitch — Your Global Mobility Super App" },
      { property: "og:description", content: "Everything you need to travel, study, work and do business abroad — in one app." },
      { property: "og:image", content: heroImg },
      { name: "twitter:image", content: heroImg },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header transparent />
      {/* HERO — bold, prominent, trip.com-inspired */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={heroImg}
            alt="Tropical beach, world landmarks and airplane wing — your global mobility super app"
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
          />
          {/* Cinematic gradient — keeps image vivid on top, deepens to brand at bottom for legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.20_0.10_260/0.30)] via-[oklch(0.22_0.12_260/0.55)] to-[oklch(0.22_0.12_260/0.96)]" />
          {/* Side vignettes for focus */}
          <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[oklch(0.20_0.10_260/0.40)] to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-[oklch(0.20_0.10_260/0.40)] to-transparent" />
        </div>

        <div className="px-4 pt-20 pb-12 md:pt-32 md:pb-20">
          <div className="mx-auto mb-10 max-w-5xl text-center md:mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/95 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-foreground shadow-glow">
              <Sparkles className="h-3 w-3" /> The Global Mobility Super App
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-primary-foreground md:text-7xl lg:text-[5.5rem]">
              The world,
              <br />
              <span className="text-gradient-accent">in one tap.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-primary-foreground/90 md:text-lg">
              Flights · Stays · Visas · Insurance · Tours · Pickups · plus <span className="font-bold text-accent">free expert consultations</span> for study, work, immigration & business abroad.
            </p>
          </div>
          <SearchTabs />
          <HeroShowcase />
        </div>
      </section>

      <ServicesGrid />
      <TrendingDeals />
      <HandpickedRoutes />
      <AviationLounge />
      <WhyBook />
      <Testimonials />
      <Newsletter />
      <Footer />
    </div>
  );
}
