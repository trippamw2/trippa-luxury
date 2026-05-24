"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { DestinationCard } from "@/components/ui/destination-card";
import { useDestinations } from "@/lib/use-public-data";

export function FeaturedDestinations() {
  const destinations = useDestinations();
  return (
    <section className="py-24 md:py-32 bg-warm-white">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Curated Destinations
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Three Iconic Destinations.
            <br />
            <span className="italic text-earth">Countless Love Stories.</span>
          </h2>
          <p className="mt-4 text-base text-earth leading-relaxed">
            From the pristine shores of Lake Malawi to the wild heart of South Luangwa and the 
            spice-scented breezes of Zanzibar — each destination is a world unto itself.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 lg:gap-6">
          {destinations.map((dest, index) => (
            <DestinationCard
              key={dest.id}
              title={dest.title}
              subtitle={dest.subtitle}
              tagline={dest.tagline}
              image={dest.heroImage}
              slug={dest.slug}
              index={index}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
