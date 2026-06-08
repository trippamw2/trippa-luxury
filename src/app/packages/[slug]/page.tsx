"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, Clock, MapPin, Heart, MessageCircle, ChevronLeft, Star } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/lib/constants";
import { usePackages, useProperties } from "@/lib/use-public-data";
import { cn } from "@/lib/utils";

export default function PackageDetailPage() {
  const params = useParams();
  const packages = usePackages();
  const properties = useProperties();
  const pkg = packages.find((p) => p.id === params.slug);

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <h1 className="text-2xl font-heading text-soft-black mb-4">Journey Not Found</h1>
          <Button href="/packages">View All Journeys</Button>
        </div>
      </div>
    );
  }

  const packageProperties = properties.filter((p) => pkg.properties.includes(p.id));

  return (
    <>
      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] w-full overflow-hidden bg-soft-black">
        {pkg.image && (
          <Image
            src={pkg.image}
            alt={pkg.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black/80 via-soft-black/60 to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/70 via-soft-black/20 to-transparent" />

        <Link
          href="/packages"
          className="absolute top-28 left-6 md:left-10 z-20 inline-flex items-center gap-2 text-sm text-cream/60 hover:text-cream transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          All Journeys
        </Link>

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
              {pkg.duration} &middot; Enquire Within
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-medium text-cream leading-tight">
              {pkg.title}
            </h1>
            <p className="mt-4 text-lg text-cream/60 max-w-xl mx-auto">
              {pkg.subtitle}
            </p>
            <div className="mt-8">
              <Button href="/contact" variant="gold" size="lg">
                Enquire About This Journey
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-3"
            >
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
                Overview
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black leading-tight mb-6">
                {pkg.title}
              </h2>
              <p className="text-base text-earth leading-relaxed mb-8">
                {pkg.description}
              </p>

              {/* Inclusions */}
              <div className="p-6 bg-warm-white border border-sand-light/30">
                <h4 className="text-sm font-medium tracking-widest uppercase text-soft-black mb-4 flex items-center gap-2">
                  <Check className="w-4 h-4 text-gold" />
                  What&apos;s Included
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pkg.inclusions.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-earth">
                      <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-warm-white p-6 md:p-8 border border-sand-light/30 space-y-6 sticky top-28">
                <div>
                  <span className="text-xs text-earth/60">Duration</span>
                  <p className="text-lg font-heading text-soft-black font-medium flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-gold" />
                    {pkg.duration}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-earth/60">Price</span>
                  <p className="text-lg font-heading text-gold-dark/70 font-medium mt-1">Enquire Within</p>
                </div>

                <div>
                  <span className="text-xs text-earth/60">Destinations</span>
                  <div className="mt-2 space-y-2">
                    {pkg.destinations.map((dest) => (
                      <Link
                        key={dest}
                        href={`/${dest}`}
                        className="flex items-center gap-2 text-sm text-soft-black hover:text-gold-dark transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-gold shrink-0" />
                        {dest === "lake-malawi" ? "Lake Malawi" : dest === "south-luangwa" ? "South Luangwa" : "Zanzibar"}
                      </Link>
                    ))}
                  </div>
                </div>

                {packageProperties.length > 0 && (
                  <div>
                    <span className="text-xs text-earth/60">Properties</span>
                    <div className="mt-2 space-y-2">
                      {packageProperties.map((prop) => (
                        <Link
                          key={prop.id}
                          href={`/properties/${prop.id}`}
                          className="flex items-center gap-2 text-sm text-soft-black hover:text-gold-dark transition-colors"
                        >
                          <Star className="w-3 h-3 text-gold shrink-0" />
                          {prop.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-3">
                  <Button href="/contact" variant="primary" className="w-full">
                    Enquire Now
                  </Button>
                  <a
                    href={`https://wa.me/${SITE_CONFIG.whatsapp}?text=I'm interested in the ${pkg.title}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-soft-black text-soft-black text-sm tracking-widest uppercase hover:bg-soft-black hover:text-cream transition-all duration-500"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Inquiry
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Itinerary */}
      <section className="py-24 bg-warm-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
              Itinerary
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black">
              Your Journey Day by Day
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            {pkg.itinerary.map((day, index) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex gap-6 pb-8 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "w-10 h-10 flex items-center justify-center text-sm font-heading font-medium border",
                    "border-gold/30 bg-warm-white text-gold-dark"
                  )}>
                    {day.day}
                  </div>
                  {index < pkg.itinerary.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-gold/30 to-transparent mt-2" />
                  )}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-heading font-medium text-soft-black mb-1">{day.title}</h3>
                  <p className="text-sm text-earth leading-relaxed">{day.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
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
            <h2 className="text-3xl md:text-4xl font-heading font-medium text-cream mb-4">
              Ready to Begin?
            </h2>
            <p className="text-earth-light text-sm mb-8">
              Your personal concierge is waiting to craft this journey for you.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500"
            >
              Begin Your Journey
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
