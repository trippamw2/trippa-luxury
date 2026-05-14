"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Heart, Globe, Moon } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Curated for Romance",
    description:
      "Every journey is designed for two. From private beach dinners to couples spa rituals, every moment is crafted for connection.",
  },
  {
    icon: Globe,
    title: "Modern African Luxury",
    description:
      "We redefine African luxury through a contemporary lens — where authentic experiences meet world-class sophistication.",
  },
  {
    icon: Moon,
    title: "Emotional Storytelling",
    description:
      "Our escapes are stories waiting to be lived. Each destination, each experience, each moment becomes part of your love story.",
  },
];

export function BrandStatement() {
  return (
    <section className="py-24 md:py-32 bg-cream">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center mb-20"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            The Trippa Philosophy
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Africa&apos;s Most Romantic Escapes,
            <br />
            <span className="italic text-earth">Curated With Soul</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-earth leading-relaxed max-w-3xl mx-auto">
            Trippa is born from a belief that the most profound travel experiences are those 
            shared with the one you love. We hand-select every property, design every itinerary, 
            and curate every moment to create journeys that linger in your heart forever.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-gold/30 group-hover:bg-gold/5 transition-colors duration-500">
                <value.icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-heading font-medium text-soft-black mb-3">
                {value.title}
              </h3>
              <p className="text-sm text-earth leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
