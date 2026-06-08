"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface DestinationCardProps {
  title: string;
  subtitle: string;
  tagline: string;
  image: string;
  slug: string;
  index?: number;
}

export function DestinationCard({
  title,
  subtitle,
  tagline,
  image,
  slug,
  index = 0,
}: DestinationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, delay: index * 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="card-hover-luxury group relative overflow-hidden bg-warm-white-dark aspect-[3/4] md:aspect-[4/5]"
    >
      {/* Background image */}
      <Image
        src={image}
        alt={title}
        fill
        loading="lazy"
        className="object-cover transition-transform duration-1000 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-soft-black/70 via-soft-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
        <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-3">
          {subtitle}
        </span>
        <h3 className="text-2xl md:text-3xl lg:text-4xl font-heading font-medium text-cream mb-2">
          {title}
        </h3>
        <p className="text-sm text-cream/70 mb-6 max-w-xs leading-relaxed">
          {tagline}
        </p>
        <Link
          href={`/${slug}`}
          className="inline-flex items-center gap-2 text-sm tracking-widest uppercase text-cream border-b border-cream/30 pb-1 group-hover:border-cream transition-all duration-500"
        >
          Explore Destination
          <ArrowRightIcon className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Hover overlay with number */}
      <div className="absolute top-8 right-8 text-6xl md:text-8xl font-heading font-bold text-cream/10 select-none">
        {String(index + 1).padStart(2, '0')}
      </div>
    </motion.div>
  );
}
