"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PACKAGES } from "@/lib/constants";

const highlights = PACKAGES.slice(0, 3);

export function CuratedJourneys() {
  return (
    <section className="py-24 md:py-32 bg-cream">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Curated Journeys
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Romantic Journeys,
            <br />
            <span className="italic text-earth">Designed for Two</span>
          </h2>
          <p className="mt-4 text-base text-earth leading-relaxed">
            Each itinerary is handcrafted by our concierge team to create the perfect rhythm of 
            adventure and relaxation, wilderness and luxury.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {highlights.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="group"
            >
              <Link href={`/packages#${pkg.id}`} className="block">
                <div className="relative overflow-hidden bg-warm-white-dark aspect-[16/10]">
                  <div className="absolute inset-0 bg-gradient-to-br from-sand-light to-earth/20" />
                  <div className="absolute inset-0 bg-gradient-to-t from-soft-black/50 via-transparent to-transparent" />
                  
                  {/* Number */}
                  <div className="absolute top-4 left-4 text-5xl font-heading font-bold text-cream/10 select-none">
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl md:text-2xl font-heading font-medium text-cream mb-1">
                      {pkg.title}
                    </h3>
                    <p className="text-sm text-cream/70 mb-3">{pkg.subtitle}</p>
                    <div className="flex items-center gap-4 text-xs text-cream/60">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {pkg.duration}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {pkg.destinations.length} destinations
                      </span>
                    </div>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-soft-black/0 group-hover:bg-soft-black/20 transition-all duration-700" />
                </div>

                <div className="mt-4">
                  <p className="text-sm text-earth/80 line-clamp-2 leading-relaxed">
                    {pkg.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gold font-medium">{pkg.price}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-soft-black tracking-widest uppercase group-hover:text-gold-dark transition-colors">
                      View Details
                      <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <Link
            href="/packages"
            className="inline-flex items-center gap-2 px-8 py-4 border border-soft-black text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-soft-black hover:text-cream transition-all duration-500"
          >
            View All Journeys
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </Container>
    </section>
  );
}
