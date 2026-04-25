import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero-iconic.jpg";
import { Header } from "@/components/Header";
import { SearchTabs } from "@/components/SearchTabs";
import { ServicesGrid } from "@/components/ServicesGrid";
import { HandpickedRoutes } from "@/components/HandpickedRoutes";
import { AviationLounge } from "@/components/AviationLounge";
import { WhyBook } from "@/components/WhyBook";
import { AppBanner } from "@/components/AppBanner";
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
      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="Airplane wing soaring above world landmarks at golden hour" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.18_0.08_260/0.55)] via-[oklch(0.20_0.10_260/0.45)] to-[oklch(0.22_0.10_260/0.92)]" />
        </div>

        <div className="px-4 pt-16 pb-10 md:pt-24 md:pb-14">
          <div className="mx-auto mb-10 max-w-4xl text-center">
            <span className="inline-block rounded-full bg-accent/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent-foreground shadow-glow">
              The Global Mobility Super App
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-primary-foreground md:text-6xl">
              The world is yours.
              <br />
              <span className="text-accent">Book it all in one place.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/85 md:text-base">
              Flights, stays, visas, insurance, tours, pickups & free expert consultations.
            </p>
          </div>
          <SearchTabs />
        </div>
      </section>

      <ServicesGrid />
      <HandpickedRoutes />
      <AviationLounge />
      <WhyBook />
      <AppBanner />
      <Footer />
    </div>
  );
}
