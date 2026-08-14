"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plane, PlaneLanding, PlaneTakeoff, Car, Ship, Sparkles, MapPin, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { useExperiences } from "@/lib/use-public-data";
import {
  buildExperienceStops,
  MOVEMENT_LABELS,
  DESTINATION_LABELS,
  type MovementMode,
  type RouteStop,
} from "@/lib/journey-routes";
import { EXPERIENCES } from "@/lib/constants";

const JourneyRouteMap = dynamic(
  () =>
    import("@/components/sections/JourneyRouteMap").then(
      (m) => m.JourneyRouteMap
    ),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-warm-white animate-pulse" />,
  }
);

const MODE_ICONS: Record<MovementMode, typeof Plane> = {
  fly: Plane,
  drive: Car,
  boat: Ship,
};

function StopIcon({ stop }: { stop: RouteStop }) {
  if (stop.kind === "departure") return <PlaneTakeoff className="w-4 h-4" />;
  if (stop.kind === "gateway") return <PlaneLanding className="w-4 h-4" />;
  if (stop.kind === "experience") return <Sparkles className="w-4 h-4" />;
  if (stop.arrival) {
    const Icon = MODE_ICONS[stop.arrival];
    return <Icon className="w-4 h-4" />;
  }
  return <MapPin className="w-4 h-4" />;
}

function stopEyebrow(stop: RouteStop): string {
  switch (stop.kind) {
    case "gateway":
      return "Arrival";
    case "departure":
      return "Departure";
    case "experience":
      return "Signature Experience";
    default:
      return "Stay";
  }
}

/** Vertical travel log : arrival gateway → every location → departure point. */
function ItineraryTimeline({ stops }: { stops: RouteStop[] }) {
  return (
    <ol className="relative mt-10">
      {stops.map((stop, index) => {
        const isLast = index === stops.length - 1;
        const isExperience = stop.kind === "experience";
        const isDeparture = stop.kind === "departure";
        return (
          <li key={stop.id} className="relative flex gap-5 pb-8 last:pb-0">
            {!isLast && (
              <span className="absolute left-[19px] top-11 bottom-0 w-px bg-gradient-to-b from-gold/40 to-gold/5" />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center w-10 h-10 shrink-0 rounded-full border",
                isExperience
                  ? "bg-soft-black border-gold text-gold"
                  : isDeparture
                    ? "bg-cream border-soft-black text-gold-dark"
                    : "bg-soft-black-light border-gold/30 text-gold-light"
              )}
            >
              <StopIcon stop={stop} />
            </span>
            <div className="pt-1.5 min-w-0">
              <span
                className={cn(
                  "block text-[10px] font-medium uppercase tracking-widest",
                  isExperience ? "text-gold" : "text-gold-light/70"
                )}
              >
                {stopEyebrow(stop)}
                {stop.kind === "stay" && ` ${String(index).padStart(2, "0")}`}
              </span>
              <span className="block font-heading text-lg font-medium text-cream mt-0.5 leading-snug">
                {stop.label}
              </span>
              {stop.sublabel && (
                <span className="block text-xs text-cream/50 mt-0.5">
                  {stop.sublabel}
                </span>
              )}
              {stop.arrival && (
                <span className="block text-xs text-gold-light/80 mt-1.5">
                  {isDeparture ? "Depart by " : "Arrive by "}
                  {MOVEMENT_LABELS[stop.arrival]}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

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
            Follow each experience step by step, from the point of arrival to the
            point of departure, and trace the journey on the map beside it.
          </p>
        </motion.div>

        <div className="space-y-28 md:space-y-36">
          {experiences.map((experience) => {
            const stops = buildExperienceStops(experience);
            if (stops.length < 2) return null;
            const constantExp = EXPERIENCES.find((e) => e.id === experience.id);
            const destinationLabel = constantExp?.destination
              ? DESTINATION_LABELS[constantExp.destination]
              : null;
            return (
              <motion.article
                key={experience.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
                  {/* Itinerary */}
                  <div>
                    {experience.image && (
                      <div className="relative aspect-[16/8] overflow-hidden rounded-xl border border-cream/10 mb-8">
                        <Image
                          src={experience.image}
                          alt={experience.title}
                          fill
                          loading="lazy"
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-transparent" />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-block text-[10px] font-medium tracking-widest uppercase text-cream/80 bg-cream/10 border border-cream/15 px-3 py-1.5">
                        {experience.category}
                      </span>
                      {destinationLabel && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium tracking-widest uppercase text-gold-light bg-gold/10 border border-gold/20 px-3 py-1.5">
                          <MapPin className="w-3 h-3" />
                          {destinationLabel}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-heading font-medium text-cream mt-4">
                      {experience.title}
                    </h3>
                    <p className="text-sm text-cream/60 leading-relaxed mt-3 max-w-xl">
                      {experience.description}
                    </p>
                    <ItineraryTimeline stops={stops} />
                  </div>

                  {/* Route map : how the visitor travels through the experience */}
                  <div className="lg:sticky lg:top-28">
                    <div className="relative h-[420px] lg:h-[500px] overflow-hidden rounded-xl border border-cream/10 shadow-2xl">
                      <JourneyRouteMap stops={stops} />
                    </div>
                    <p className="mt-4 text-center text-[11px] uppercase tracking-widest text-cream/40">
                      Arrival &rarr; every location &rarr; departure
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
          </div>

          {/* View All Link */}
          <div className="mt-16 text-center">
            <Link
              href="/experiences"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500"
            >
              Explore All Experiences
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Container>
      </section>
  );
}
