"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Award, Newspaper, Star } from "lucide-react";

const pressLogos = [
  { name: "Condé Nast Traveler", award: "Best Africa Safari Specialist" },
  { name: "Travel + Leisure", award: "World's Best Awards Finalist" },
  { name: "Vogue", award: "Most Romantic Honeymoons Feature" },
  { name: "National Geographic", award: "Unique Lodges of the World" },
  { name: "Forbes", award: "Ultimate Luxury Travel List" },
  { name: "Harper's Bazaar", award: "Best Romantic Getaways" },
];

const accolades = [
  { icon: Award, text: "World Travel Awards — Africa's Leading Luxury Tour Operator", year: "2026" },
  { icon: Award, text: "Condé Nast Traveler — Readers' Choice Top 10 Safari Specialists", year: "2025" },
  { icon: Star, text: "Travel + Leisure — World's Best Award, Africa Category", year: "2025" },
  { icon: Newspaper, text: "Featured in Vogue's Ultimate Honeymoon Collection", year: "2026" },
];

export function PressSection() {
  return (
    <section className="py-24 md:py-32 bg-cream">
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
            Recognition
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            As Featured In
            <br />
            <span className="italic text-earth">&amp; Awarded By</span>
          </h2>
        </motion.div>

        {/* Press Logo Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-8 mb-20">
          {pressLogos.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group flex flex-col items-center justify-center p-6 border border-sand-light/30 bg-warm-white hover:border-gold/30 hover:shadow-lg transition-all duration-500"
            >
              <div className="w-full h-12 flex items-center justify-center mb-3">
                <span className="text-xs font-heading font-medium text-earth/40 text-center leading-tight select-none uppercase tracking-widest">
                  {item.name}
                </span>
              </div>
              <span className="text-[10px] text-earth/60 text-center leading-snug uppercase tracking-wider">
                {item.award}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Accolades List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="max-w-3xl mx-auto">
            <span className="block text-xs font-medium tracking-[0.2em] uppercase text-earth/50 text-center mb-8">
              Awards &amp; Accolades
            </span>
            <div className="space-y-4">
              {accolades.map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-5 bg-warm-white border border-sand-light/20 group hover:border-gold/30 transition-all duration-500"
                >
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 shrink-0">
                    <item.icon className="w-4 h-4 text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-earth leading-relaxed">{item.text}</p>
                  </div>
                  <span className="text-xs text-gold font-medium tracking-wider whitespace-nowrap">
                    {item.year}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
