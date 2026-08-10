"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { TreePine, GraduationCap, Sun, ArrowRight } from "lucide-react";
import Link from "next/link";

const pillars = [
  {
    number: "01",
    icon: TreePine,
    title: "Wildlife Conservation",
    description:
      "Every Kivara booking contributes directly to anti poaching patrols and wildlife monitoring programs in South Luangwa National Park. We partner with Conservation South Luangwa to fund ranger units, tracker dogs, and community education programs that protect Zambia's wildlife for generations to come.",
    stat: "100%",
    statLabel: "Of bookings fund conservation",
  },
  {
    number: "02",
    icon: GraduationCap,
    title: "Community Empowerment",
    description:
      "We champion lodges that employ locally, source regionally, and invest in their communities. Kaya Mawa's foundation funds schools on Likoma Island. Puku Ridge Camp trains guides from nearby villages. Each stay creates ripples that lift entire communities across Malawi, Zambia, and Zanzibar.",
    stat: "3",
    statLabel: "Countries with community impact",
  },
  {
    number: "03",
    icon: Sun,
    title: "Sustainable Operations",
    description:
      "From solar powered camps in Zambia to plastic free initiatives on Lake Malawi and reef safe marine policies in Zanzibar, every property in the Kivara collection meets our rigorous sustainability standards. We measure not just luxury, but legacy.",
    stat: "100%",
    statLabel: "Solar powered camps in Zambia",
  },
];

export function ImpactSection() {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden bg-soft-black">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 70% 30%, rgba(201,169,110,0.5) 0%, transparent 50%)`,
          }}
        />
      </div>

      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Impact
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
            Travel That Gives Back
            <br />
            <span className="italic text-gold-light">Conservation &amp; Community</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-earth-light leading-relaxed max-w-3xl mx-auto">
            Every romance fuels conservation. Your journey to Lake Malawi, South Luangwa, 
            or Zanzibar directly protects wildlife, empowers communities, and preserves the 
            wild places that made you fall in love.
          </p>
        </motion.div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-16">
          {pillars.map((pillar, index) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="group relative p-8 md:p-10 bg-warm-white/5 border border-white/10 hover:border-gold/30 transition-all duration-500"
            >
              {/* Number */}
              <div className="w-12 h-12 flex items-center justify-center border border-gold/30 mb-5 group-hover:bg-gold/10 transition-colors duration-500">
                <span className="text-base text-gold font-heading font-medium">{pillar.number}</span>
              </div>

              {/* Icon */}
              <pillar.icon className="w-5 h-5 text-gold-light mb-4" />

              {/* Title */}
              <h3 className="text-xl font-heading font-medium text-cream mb-3">
                {pillar.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-earth-light leading-relaxed mb-6">
                {pillar.description}
              </p>

              {/* Stat */}
              <div className="pt-5 border-t border-white/10">
                <span className="block text-2xl font-heading font-medium text-gold-light">
                  {pillar.stat}
                </span>
                <span className="block text-xs text-earth tracking-wide mt-0.5">
                  {pillar.statLabel}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-gold border-b border-gold/30 pb-1 hover:border-gold transition-all duration-500"
          >
            Discover Our Full Impact <ArrowRight className="w-3 h-3" />
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}
