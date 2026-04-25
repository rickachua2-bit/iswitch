import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/hero-travel.jpg";
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
          <img src={heroImg} alt="Crystal blue tropical beach" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.30_0.16_260/0.85)] via-[oklch(0.30_0.16_260/0.65)] to-[oklch(0.30_0.16_260/0.95)]" />
        </div>

        <div className="px-4 pt-12 pb-8 md:pt-16 md:pb-12">
          <div className="mx-auto mb-8 max-w-4xl text-center">
            <h1 className="font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-primary-foreground md:text-5xl">
              Where will you go next?
              <br />
              <span className="text-accent">Book it all in one place.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-primary-foreground/80 md:text-base">
              Flights · Stays · Visas · Insurance · Tours · Pickups · Free expert consultations.
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
