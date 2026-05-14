"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-soft-black">
      {/* Video background placeholder - cinematic gradient animation */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-earth/40" />
        {/* Animated gradient overlay for cinematic feel */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(201, 169, 110, 0.15) 0%, transparent 70%)",
          }}
        />
        {/* Animated light particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[800px] h-[800px] rounded-full opacity-[0.03]"
              style={{
                background: `radial-gradient(circle, rgba(201,169,110,0.3) 0%, transparent 70%)`,
                top: `${20 + i * 30}%`,
                left: `${10 + i * 25}%`,
                animation: `pulse ${8 + i * 3}s ease-in-out infinite`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-soft-black/40 via-transparent to-soft-black/60" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl"
        >
          {/* Tagline */}
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="inline-block text-xs md:text-sm font-medium tracking-[0.25em] uppercase text-gold-light mb-6 md:mb-8"
          >
            Curated African Romance Travel
          </motion.span>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-medium text-cream leading-tight text-balance"
          >
            Luxury Beach & Bush
            <br />
            <span className="text-gold-light">Escapes Across Africa</span>
            <br />
            Most Unforgettable Destinations
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-6 md:mt-8 text-base md:text-lg text-cream/70 max-w-2xl mx-auto leading-relaxed"
          >
            Three iconic destinations. One singular vision — to create the world&apos;s most 
            romantic African escapes for couples who seek the extraordinary.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/packages"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500"
            >
              Begin Your Journey
              <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/destinations"
              className="inline-flex items-center gap-2 px-8 py-4 border border-cream/30 text-cream text-sm font-medium tracking-[0.15em] uppercase hover:bg-cream/10 transition-all duration-500"
            >
              Explore Destinations
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-16 bg-gradient-to-b from-cream/50 to-transparent"
        />
      </motion.div>
    </section>
  );
}
