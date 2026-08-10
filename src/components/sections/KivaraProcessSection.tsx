"use client";

import { motion } from "framer-motion";
import {
  HeartIcon,
  CompassIcon,
  SparklesIcon,
  SunIcon,
  CameraIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { BRAND_POSITIONING } from "@/lib/constants";

const PROCESS_STEPS = [
  {
    number: "01",
    icon: HeartIcon,
    title: "Share Your Story",
    description:
      "Tell us about your love story, your dreams, your vision. Every journey begins with a conversation.",
  },
  {
    number: "02",
    icon: CompassIcon,
    title: "Discover Together",
    description:
      "We listen, we guide, and we explore the possibilities until the perfect journey reveals itself.",
  },
  {
    number: "03",
    icon: SparklesIcon,
    title: "Crafted Around You",
    description:
      "Every detail designed around your story, the destinations, the stays, the moments that matter.",
  },
  {
    number: "04",
    icon: SunIcon,
    title: "Experience Africa",
    description:
      "You arrive, and every moment unfolds seamlessly. Africa embraces you. Your story comes alive.",
  },
  {
    number: "05",
    icon: CameraIcon,
    title: "Keep the Memory",
    description:
      "Long after you return, the golden light, the silence, the love deepened by Africa stays with you.",
  },
];

export function KivaraProcessSection() {
  const { storyBrand } = BRAND_POSITIONING;

  return (
    <section className="py-24 md:py-32 bg-soft-black">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16 md:mb-20"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            The Kivara Process
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
            {storyBrand.plan.split("—")[0].trim()}.
            <br />
            <span className="italic text-gold-light">Then Let Us Craft the Rest.</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-cream/60 leading-relaxed max-w-2xl mx-auto">
            {storyBrand.plan}
          </p>
        </motion.div>

        {/* Process steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent" />

          <div className="space-y-10 md:space-y-12">
            {PROCESS_STEPS.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative flex gap-6 md:gap-8 pl-1 md:pl-2"
              >
                {/* Step icon circle */}
                <div className="relative z-10 shrink-0 w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-soft-black border border-gold/30 group">
                  <step.icon className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                </div>

                {/* Content */}
                <div className="pt-1 md:pt-3">
                  <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-gold/60">
                    Step {step.number}
                  </span>
                  <h3 className="text-xl md:text-2xl font-heading font-medium text-cream mt-1">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm md:text-base text-cream/50 leading-relaxed max-w-lg">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
