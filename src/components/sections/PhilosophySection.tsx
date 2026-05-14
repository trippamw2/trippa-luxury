"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Waves, TreePine, Sparkles } from "lucide-react";

export function PhilosophySection() {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden bg-soft-black">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.05]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 40%, rgba(201,169,110,0.4) 0%, transparent 50%)`,
          }}
        />
      </div>

      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left - Philosophy Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
              Beach & Bush
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
              Two Worlds,
              <br />
              <span className="italic text-gold-light">One Extraordinary Journey</span>
            </h2>
            <p className="mt-6 text-base md:text-lg text-earth-light leading-relaxed">
              Africa offers two of the world&apos;s most profound experiences — the soul-stirring 
              vastness of the bush and the serene embrace of tropical shores. We believe the 
              greatest journeys weave both together.
            </p>
            <p className="mt-4 text-base text-earth leading-relaxed">
              Our Beach & Bush philosophy is simple: experience the raw, untamed beauty of an 
              African safari, then retreat to the gentle rhythm of pristine beaches. It&apos;s a 
              journey that touches every part of your soul.
            </p>

            {/* Philosophy pillars */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: TreePine,
                  title: "The Bush",
                  desc: "Intimate safaris in South Luangwa, where wildlife roams free and luxury meets wilderness.",
                },
                {
                  icon: Waves,
                  title: "The Beach",
                  desc: "Pristine shores on Lake Malawi and Zanzibar, where turquoise waters meet powder-soft sand.",
                },
                {
                  icon: Sparkles,
                  title: "The Connection",
                  desc: "Seamlessly woven together into a journey that tells your unique love story.",
                },
              ].map((pillar, i) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                >
                  <pillar.icon className="w-6 h-6 text-gold mb-3" />
                  <h4 className="text-sm font-medium text-cream tracking-widest uppercase mb-1.5">
                    {pillar.title}
                  </h4>
                  <p className="text-sm text-earth-light leading-relaxed">{pillar.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[3/4] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-earth/40 to-soft-black" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto border border-gold/30 rounded-full flex items-center justify-center mb-6">
                  <div className="w-16 h-16 border border-gold/20 rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-gold-light" />
                  </div>
                </div>
                <p className="text-cream/40 font-heading text-6xl md:text-7xl font-bold select-none">
                  &amp;
                </p>
              </div>
            </div>
            {/* Decorative lines */}
            <div className="absolute top-10 left-10 w-20 h-px bg-gold/20" />
            <div className="absolute bottom-10 right-10 w-20 h-px bg-gold/20" />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
