"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plane, Car, Ship } from "lucide-react";
import { Container } from "@/components/ui/container";
import {
  MOVEMENT_LABELS,
  type MovementMode,
  type RouteStop,
} from "@/lib/journey-routes";

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

const MOVEMENT_ICONS: Record<MovementMode, typeof Plane> = {
  fly: Plane,
  drive: Car,
  boat: Ship,
};

/** Compact "how you move" legend rendered under the map. */
function MovementLegend({ stops }: { stops: RouteStop[] }) {
  const movements = stops
    .map((s) => s.arrival)
    .filter((m): m is MovementMode => Boolean(m));
  const unique = [...new Set(movements)];
  if (unique.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-5">
      {unique.map((mode) => {
        const Icon = MOVEMENT_ICONS[mode];
        return (
          <span
            key={mode}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-cream/60"
          >
            <Icon className="w-4 h-4 text-gold-light" />
            {MOVEMENT_LABELS[mode]}
          </span>
        );
      })}
    </div>
  );
}

interface JourneyMapSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  stops: RouteStop[];
  /** Dark band is the default (matches the site's cinematic map treatment). */
  variant?: "dark" | "light";
  heightClass?: string;
}

export function JourneyMapSection({
  eyebrow = "The Route",
  title,
  description,
  stops,
  variant = "dark",
  heightClass = "h-[440px] md:h-[520px]",
}: JourneyMapSectionProps) {
  const dark = variant === "dark";
  if (stops.length < 2) return null;

  return (
    <section className={dark ? "py-24 md:py-32 bg-soft-black" : "py-24 md:py-32 bg-warm-white"}>
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-14"
        >
          <span
            className={`inline-block text-xs font-medium tracking-[0.2em] uppercase mb-4 ${
              dark ? "text-gold-light" : "text-gold"
            }`}
          >
            {eyebrow}
          </span>
          <h2
            className={`text-3xl md:text-4xl lg:text-5xl font-heading font-medium leading-tight ${
              dark ? "text-cream" : "text-soft-black"
            }`}
          >
            {title}
          </h2>
          {description && (
            <p
              className={`mt-5 max-w-xl mx-auto text-sm leading-relaxed ${
                dark ? "text-cream/60" : "text-earth/70"
              }`}
            >
              {description}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={`relative overflow-hidden rounded-xl border shadow-2xl ${heightClass} ${
            dark ? "border-cream/10" : "border-sand-light/30"
          }`}
        >
          <JourneyRouteMap stops={stops} />
        </motion.div>

        <MovementLegend stops={stops} />
      </Container>
    </section>
  );
}
