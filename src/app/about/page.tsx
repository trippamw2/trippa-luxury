"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Heart, Globe, Leaf, Sparkles } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Curated for Romance",
    description:
      "Every detail chosen with you in mind. Connection is the north star of every journey.",
  },
  {
    icon: Globe,
    title: "Modern African Luxury",
    description:
      "Contemporary, authentic, sustainable. Luxury rooted in the places you'll discover.",
  },
  {
    icon: Leaf,
    title: "Sustainable Tourism",
    description:
      "Travel with purpose. Every partnership protects wilderness and uplifts communities.",
  },
  {
    icon: Sparkles,
    title: "Emotional Storytelling",
    description:
      "Your escapes are stories waiting to unfold. Every moment becomes part of your narrative.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-medium text-cream leading-tight">
              The Kivara Story
            </h1>
            <p className="mt-4 text-base md:text-lg text-cream/60 max-w-2xl mx-auto">
              Born from a love for Africa and a belief that travel should move the soul.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-20"
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                Our Philosophy
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight mb-6">
                Modern African Luxury,
                <br />
                <span className="italic text-earth">Curated with Soul</span>
              </h2>
              <p className="text-base md:text-lg text-earth leading-relaxed max-w-3xl mx-auto">
                The most luxurious travel touches your heart. 
                We are not a booking platform — we are architects of romance, curators of moments, 
                and storytellers of Africa&apos;s most beautiful places.
              </p>
            </motion.div>

            {/* Story */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-sand-light to-cream" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-heading font-medium text-soft-black mb-4">
                  A Love Letter to Africa
                </h3>
                <p className="text-base text-earth leading-relaxed mb-4">
                  Africa gets under your skin. The warmth of its people, the vastness of its landscapes, 
                  the intimacy of its wildlife — nowhere makes you feel so alive.
                </p>
                <p className="text-base text-earth leading-relaxed mb-4">
                  Kivara exists for couples seeking something deeper than a vacation. A journey that 
                  becomes part of who you are. That changes how you see the world — and each other.
                </p>
                <p className="text-base text-earth leading-relaxed">
                  Every itinerary, every property, every experience answers one question: will this move you?
                </p>
              </div>
            </motion.div>

            {/* Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-8 bg-warm-white border border-sand-light/30 group hover:border-gold/30 transition-all duration-500"
                >
                  <value.icon className="w-6 h-6 text-gold mb-4" />
                  <h3 className="text-lg font-heading font-medium text-soft-black mb-2">{value.title}</h3>
                  <p className="text-sm text-earth leading-relaxed">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 bg-soft-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(201,169,110,0.5) 0%, transparent 50%)`,
          }} />
        </div>
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-medium text-cream mb-4">
              Let&apos;s Write Your Love Story
            </h2>
            <p className="text-earth-light text-sm mb-8">
              Ready to begin? Your personal concierge is waiting.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500"
            >
              Begin Your Journey
            </a>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
