"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Star, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  name: string;
  tagline: string;
  location: string;
  image: string;
  priceRange: string;
  rating: number;
  slug: string;
  destination: string;
  index?: number;
}

export function PropertyCard({
  name,
  tagline,
  location,
  image,
  priceRange,
  rating,
  slug,
  destination,
  index = 0,
}: PropertyCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="group cursor-pointer"
    >
      <Link href={`/properties/${slug}`}>
        <div className="relative overflow-hidden bg-warm-white-dark aspect-[4/5]">
          {/* Image placeholder with gradient overlay */}
          <div
            className="absolute inset-0 bg-soft-black/10 group-hover:bg-soft-black/20 transition-all duration-700"
          />
          <div
            className="w-full h-full bg-gradient-to-br from-sand-light to-earth-light"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 fill-gold text-gold" />
              <span className="text-sm text-cream/90">{rating.toFixed(1)}</span>
            </div>
            <h3 className="text-xl md:text-2xl font-heading font-medium text-cream mb-1">
              {name}
            </h3>
            <p className="text-sm text-cream/70 mb-2">{location}</p>
            <div className="flex items-center gap-1 text-xs text-gold-light tracking-widest uppercase">
              <span>{priceRange}</span>
            </div>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-soft-black/0 group-hover:bg-soft-black/20 transition-all duration-700 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 text-cream text-sm tracking-widest uppercase border border-cream/50 px-6 py-3">
              Explore Property
            </span>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-sm text-earth/70 line-clamp-2 leading-relaxed">{tagline}</p>
        </div>
      </Link>
    </motion.div>
  );
}
