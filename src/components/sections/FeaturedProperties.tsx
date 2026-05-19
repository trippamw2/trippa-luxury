"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { PropertyCard } from "@/components/ui/property-card";
import { useProperties } from "@/lib/use-public-data";

const PROPERTY_BADGES: Record<string, string> = {
  "kaya-mawa": "Only 6 Villas",
  "pumulani-lodge": "10 Award-Winning Villas",
  chinzombo: "Award-Winning Design",
};

export function FeaturedProperties() {
  const featured = useProperties().slice(0, 3);
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
            Featured Properties
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Exceptional Stays,
            <br />
            <span className="italic text-earth">Extraordinary Memories</span>
          </h2>
          <p className="mt-4 text-base text-earth leading-relaxed">
            Each property in our collection is hand-selected for its architectural beauty, 
            exceptional service, and ability to inspire romance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-6">
          {featured.map((property, index) => (
            <PropertyCard
              key={property.id}
              name={property.name}
              tagline={property.tagline}
              location={property.location}
              image={property.heroImage}
              priceRange={property.priceRange}
              rating={property.rating}
              slug={property.id}
              destination={property.destination}
              index={index}
              badge={PROPERTY_BADGES[property.id]}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
