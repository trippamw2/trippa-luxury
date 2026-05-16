"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Check, Heart, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/lib/constants";
import { usePackages } from "@/lib/use-public-data";
import { cn } from "@/lib/utils";

export default function PackagesPage() {
  const packages = usePackages();
  return (
    <>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden bg-soft-black">
        <Image
          src={packages[0]?.image}
          alt="Romantic Journeys"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black/80 via-soft-black/60 to-gold/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
              Curated Journeys
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-medium text-cream leading-tight">
              Romantic Journeys
            </h1>
            <p className="mt-4 text-base md:text-lg text-cream/60 max-w-2xl mx-auto">
              Handcrafted itineraries designed for couples seeking the extraordinary.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Packages */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="space-y-20">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                id={pkg.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="scroll-mt-28"
              >
                {/* Package image */}
                <div className="relative aspect-[21/9] overflow-hidden mb-10">
                  <Image
                    src={pkg.image}
                    alt={pkg.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 80vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-soft-black/20 to-transparent" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16">
                  {/* Left: Info */}
                  <div className="lg:col-span-3">
                    <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold">
                      Journey {String(index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black mt-2 mb-3">
                      {pkg.title}
                    </h2>
                    <p className="text-base text-earth mb-2">{pkg.subtitle}</p>
                    <p className="text-sm text-earth/70 leading-relaxed mb-6">
                      {pkg.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm text-earth">
                        <Clock className="w-4 h-4 text-gold" />
                        {pkg.duration}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-earth">
                        <MapPin className="w-4 h-4 text-gold" />
                        {pkg.destinations.length} {pkg.destinations.length === 1 ? "destination" : "destinations"}
                      </div>
                      <span className="text-lg font-heading text-gold-dark font-medium">{pkg.price}</span>
                    </div>

                    {/* Inclusions */}
                    <div className="mb-8">
                      <h4 className="text-sm font-medium tracking-widest uppercase text-soft-black mb-3">
                        Inclusions
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {pkg.inclusions.map((incl) => (
                          <div key={incl} className="flex items-start gap-2 text-sm text-earth">
                            <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                            <span>{incl}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-4">
                      <Button href={`/contact?package=${pkg.id}`} variant="primary">
                        Enquire About This Journey
                      </Button>
                      <a
                        href={`https://wa.me/${SITE_CONFIG.whatsapp}?text=I'm interested in the ${pkg.title} package`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3.5 border border-soft-black text-soft-black text-sm tracking-widest uppercase hover:bg-soft-black hover:text-cream transition-all duration-500"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp Inquiry
                      </a>
                    </div>
                  </div>

                  {/* Right: Itinerary */}
                  <div className="lg:col-span-2">
                    <div className="bg-warm-white p-6 md:p-8 border border-sand-light/30">
                      <h4 className="text-sm font-medium tracking-widest uppercase text-soft-black mb-6">
                        Itinerary
                      </h4>
                      <div className="space-y-0">
                        {pkg.itinerary.map((day, i) => (
                          <div key={day.day} className="flex gap-4 pb-4 last:pb-0 relative">
                            {/* Timeline line */}
                            {i < pkg.itinerary.length - 1 && (
                              <div className="absolute left-[15px] top-8 bottom-0 w-px bg-sand-light/50" />
                            )}
                            {/* Day circle */}
                            <div className="relative z-10 shrink-0 w-8 h-8 flex items-center justify-center border border-gold/30 bg-cream">
                              <span className="text-[10px] font-medium text-gold">{String(day.day).padStart(2, "0")}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-soft-black">{day.title}</h5>
                              <p className="text-xs text-earth/70 mt-0.5">{day.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Final CTA */}
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
            <Heart className="w-8 h-8 text-gold/60 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-heading font-medium text-cream mb-4">
              Let&apos;s Create Your Love Story
            </h2>
            <p className="text-earth-light text-sm mb-8 max-w-lg mx-auto">
              Every journey is unique. Tell us your dreams, and we&apos;ll craft an itinerary that&apos;s 
              perfectly yours.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="/contact" variant="gold">
                Begin Your Journey
              </Button>
              <a
                href={`https://wa.me/${SITE_CONFIG.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 border border-cream/20 text-cream text-sm tracking-widest uppercase hover:bg-cream/10 transition-all duration-500"
              >
                <MessageCircle className="w-4 h-4" />
                Chat with Concierge
              </a>
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
