"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plane, Car, Ship } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useExperiences } from "@/lib/use-public-data";
import {
  buildExperienceStops,
  MOVEMENT_LABELS,
  DESTINATION_LABELS,
  type MovementMode,
} from "@/lib/journey-routes";
import { EXPERIENCES } from "@/lib/constants";

const MiniRouteMap = dynamic(
  () =>
    import("@/components/sections/JourneyRouteMap").then(
      (m) => m.JourneyRouteMap
    ),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-warm-white animate-pulse" />,
  }
);

const MOVEMENT_ICONS: Record<MovementMode, typeof Plane> = {
  fly: Plane,
  drive: Car,
  boat: Ship,
};

export function ExperiencesSection() {
  const experiences = useExperiences();
  return (
    <section className="py-24 md:py-32 bg-soft-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(201,169,110,0.5) 0%, transparent 50%)`,
        }} />
      </div>

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
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
            Moments That Take Your
            <br />
            <span className="italic text-gold-light">Breath Away</span>
          </h2>
          <p className="mt-4 text-base text-earth-light leading-relaxed">
            From dining under the stars to sleeping beside wild rivers: each experience is 
            designed to create memories that last a lifetime. Follow the map to see exactly
            where each moment happens — and how you will get there.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((experience, index) => {
            const stops = buildExperienceStops(experience);
            const constantExp = EXPERIENCES.find((e) => e.id === experience.id);
            const destinationLabel = constantExp?.destination
              ? DESTINATION_LABELS[constantExp.destination]
              : null;
            const movements = stops
              .map((s) => s.arrival)
              .filter((m): m is MovementMode => Boolean(m));
            const uniqueMovements = [...new Set(movements)];
            return (
              <motion.div
                key={experience.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group relative flex flex-col overflow-hidden bg-soft-black-light border border-cream/5 hover:border-gold/20 transition-all duration-500"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={experience.image}
                    alt={experience.title}
                    fill
                    loading="lazy"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-soft-black/70 via-soft-black/10 to-transparent" />
                  <div className="absolute top-4 right-4 text-6xl font-heading font-bold text-cream/[0.05] select-none">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <span className="absolute top-4 left-4 inline-block text-[10px] font-medium tracking-widest uppercase text-cream/80 bg-soft-black/40 backdrop-blur-sm px-3 py-1.5">
                    {experience.category}
                  </span>
                </div>

                <div className="flex-1 p-6 md:p-7">
                  <h3 className="text-xl md:text-2xl font-heading font-medium text-cream mb-2">
                    {experience.title}
                  </h3>
                  <p className="text-sm text-cream/60 leading-relaxed">
                    {experience.description}
                  </p>
                  {destinationLabel && (
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-gold-light">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                      {destinationLabel}
                    </span>
                  )}
                </div>

                {stops.length >= 2 && (
                  <div className="relative h-44 overflow-hidden border-t border-cream/10">
                    <MiniRouteMap stops={stops} />
                    {uniqueMovements.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-soft-black/90 via-soft-black/60 to-transparent px-4 pt-6 pb-3">
                        <div className="flex items-center gap-4">
                          {uniqueMovements.map((mode) => {
                            const Icon = MOVEMENT_ICONS[mode];
                            return (
                              <span key={mode} className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-cream/70">
                                <Icon className="w-3.5 h-3.5 text-gold-light" />
                                {MOVEMENT_LABELS[mode]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
