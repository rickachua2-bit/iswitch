import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import heroSky from "@/assets/hero-sky.jpg";
import { Header } from "@/components/Header";
import { SearchTabs } from "@/components/SearchTabs";
import { HandpickedRoutes } from "@/components/HandpickedRoutes";
import { AviationLounge } from "@/components/AviationLounge";
import { WhyBook } from "@/components/WhyBook";
import { Footer } from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroSky} alt="Sky at dusk with airplane wing" className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        </div>

        <Header />

        <div className="relative px-6 pt-32 pb-12 md:pt-40">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              ✦ The Future of Mobility
            </div>
            <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              Limitless Travel.
              <br />
              <span className="text-gradient-orange">Zero Friction.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">
              Connect flights, stays, and visas in one intelligent vault.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="mt-10"
          >
            <SearchTabs />
          </motion.div>
        </div>
      </section>

      <HandpickedRoutes />
      <AviationLounge />
      <WhyBook />
      <Footer />
    </main>
  );
}
