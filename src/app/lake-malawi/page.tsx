"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Waves, Sun, Ship, Camera } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PropertyCard } from "@/components/ui/property-card";
import { Button } from "@/components/ui/button";
import { DESTINATIONS, PROPERTIES, PACKAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const destination = DESTINATIONS[0];
const properties = PROPERTIES.filter((p) => p.destination === "lake-malawi");
const packages = PACKAGES.filter((p) => p.destinations.includes("lake-malawi"));

const galleryItems = [
  { label: "Lake views at golden hour", gradient: "from-sand-light to-sand" },
  { label: "Private beach access", gradient: "from-gold-light to-sand-light" },
  { label: "Luxury lakeside suites", gradient: "from-earth-light to-sand" },
  { label: "Water activities & dhow cruises", gradient: "from-warm-white-dark to-sand-light" },
  { label: "Island exploration", gradient: "from-sand to-earth-light" },
  { label: "Sunset over the lake", gradient: "from-gold/30 to-sand-dark" },
];

export default function LakeMalawiPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-sand-dark/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        
        {/* Animated light */}
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.08]" 
          style={{ background: "radial-gradient(circle, rgba(212,197,169,0.4) 0%, transparent 70%)" }} />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs md:text-sm font-medium tracking-[0.25em] uppercase text-gold-light mb-4 md:mb-6">
              {destination.subtitle}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-medium text-cream leading-tight">
              {destination.title}
            </h1>
            <p className="mt-4 text-base md:text-lg text-cream/60 max-w-xl mx-auto">
              {destination.tagline}
            </p>
            <p className="mt-6 max-w-2xl mx-auto text-sm md:text-base text-cream/50 leading-relaxed">
              {destination.positioning}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="#properties" variant="gold" size="lg">
                Explore Properties
              </Button>
              <Button href="#inquiry" variant="outline" size="lg" className="border-cream/30 text-cream hover:bg-cream/10">
                Plan Your Escape
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-16 bg-gradient-to-b from-cream/30 to-transparent"
          />
        </motion.div>
      </section>

      {/* Storytelling Section */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                The Lake Malawi Story
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight mb-6">
                Africa&apos;s Hidden Gem,
                <br />
                <span className="italic text-earth">Where Freshwater Meets Paradise</span>
              </h2>
              <p className="text-base text-earth leading-relaxed mb-4">
                Lake Malawi is not merely a destination — it is a feeling. Known as the Lake of Stars, 
                its crystalline waters have drawn travelers for centuries. Today, it remains one of 
                Africa&apos;s best-kept secrets, a sanctuary of serenity and natural beauty.
              </p>
              <p className="text-base text-earth leading-relaxed">
                Here, luxury means waking to the sound of lapping water, spending your days exploring 
                deserted islands, and dining under a canopy of stars. This is Africa at its most 
                tranquil, its most romantic, its most unforgettable.
              </p>
              <div className="mt-8 flex flex-wrap gap-6">
                {[
                  { icon: Waves, label: "Crystal-clear waters" },
                  { icon: Sun, label: "Year-round sunshine" },
                  { icon: Ship, label: "Private island escapes" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-earth">
                    <item.icon className="w-4 h-4 text-gold" />
                    {item.label}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-[4/5] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-sand via-sand-light to-earth/30" />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-soft-black/40 to-transparent">
                <p className="text-cream/80 font-heading text-lg italic">&ldquo;The Lake of Stars&rdquo;</p>
                <p className="text-cream/50 text-sm mt-1">— David Livingstone</p>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Properties Section */}
      <section id="properties" className="py-24 md:py-32 bg-warm-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
              Curated Properties
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
              Where to Stay on
              <br />
              <span className="italic text-earth">Lake Malawi</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {properties.map((property, index) => (
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
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Experiences Section */}
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
              Signature Experiences
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
              Things to Do on
              <br />
              <span className="italic text-earth">Lake Malawi</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {destination.experiences.map((exp, index) => (
              <motion.div
                key={exp}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group relative overflow-hidden aspect-[4/3]"
              >
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-transform duration-700 group-hover:scale-105",
                  index % 3 === 0 && "from-sand-light to-sand-dark",
                  index % 3 === 1 && "from-earth-light to-earth",
                  index % 3 === 2 && "from-gold-light to-sand"
                )} />
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-cream font-heading text-lg">{exp}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Gallery Section */}
      <section className="py-24 md:py-32 bg-soft-black">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
              Gallery
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
              A Visual Journey Through
              <br />
              <span className="italic text-gold-light">Lake Malawi</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {galleryItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className={cn(
                  "relative overflow-hidden group cursor-pointer aspect-square",
                  index === 0 && "md:col-span-2 md:row-span-2"
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br", item.gradient)} />
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Camera className="absolute top-4 right-4 w-5 h-5 text-cream/30 group-hover:text-cream/60 transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <p className="text-xs text-cream/80">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Packages Section */}
      {packages.length > 0 && (
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
                Curated Journeys
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
                Romantic Lake Malawi
                <br />
                <span className="italic text-earth">Journeys</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-8 bg-cream border border-sand-light/30 group hover:border-gold/30 transition-all duration-500"
                >
                  <h3 className="text-2xl font-heading font-medium text-soft-black mb-2">{pkg.title}</h3>
                  <p className="text-sm text-earth mb-4">{pkg.subtitle}</p>
                  <p className="text-sm text-earth/80 mb-4 line-clamp-2">{pkg.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-earth/60">{pkg.duration}</span>
                      <span className="text-xs text-gold font-medium ml-4">{pkg.price}</span>
                    </div>
                    <Link
                      href={`/packages#${pkg.id}`}
                      className="inline-flex items-center gap-1 text-xs text-soft-black tracking-widest uppercase group-hover:text-gold-dark transition-colors"
                    >
                      View Details <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Inquiry Section */}
      <section id="inquiry" className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl mx-auto text-center mb-12"
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                Begin Your Journey
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black leading-tight mb-4">
                Enquire About Lake Malawi
              </h2>
              <p className="text-earth text-sm">
                Our concierge team will craft your perfect Lake Malawi escape.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="text"
                placeholder="Full Name"
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="text"
                placeholder="Preferred Dates"
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <div className="md:col-span-2">
                <textarea
                  rows={4}
                  placeholder="Tell us about your dream escape..."
                  className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-soft-black text-cream text-sm font-medium tracking-[0.15em] uppercase hover:bg-soft-black-light transition-all duration-500"
                >
                  Send Enquiry
                </button>
              </div>
              <p className="md:col-span-2 text-xs text-earth/50 text-center -mt-2">
                We&apos;ll respond within 24 hours with a personalized itinerary.
              </p>
            </motion.form>
          </div>
        </Container>
      </section>
    </>
  );
}


