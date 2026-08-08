"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";

const LeafletMap = dynamic(
  () => import("@/components/sections/LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-warm-white animate-pulse" />,
  }
);

export function MapSection() {
  return (
    <section className="py-24 md:py-32 bg-soft-black">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
            Your Journey
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
            Every Sanctuary,
            <br />
            <span className="italic text-cream/80">One Love Story</span>
          </h2>
          <p className="mt-5 text-cream/60 max-w-xl mx-auto text-sm leading-relaxed">
            The Heart. The Wild Soul. The Forever. Explore the seven properties that
            define the Kivara collection, and the arrival gateways that welcome you home.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[480px] md:h-[560px] overflow-hidden rounded-xl border border-cream/10 shadow-2xl"
        >
          <LeafletMap />
        </motion.div>
      </Container>
    </section>
  );
}
