"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { ArrowRightIcon } from "@/components/ui/icons";
import { IMAGES } from "@/lib/constants";

const LOVE_STORIES = [
  {
    eyebrow: "Proposal Journeys",
    headline: "Ask Forever Beneath African Skies",
    description:
      "A private beach at sunset. The golden light over Lake Malawi. The moment you&apos;ve been dreaming of, perfected by Kivara.",
    image: IMAGES.dining,
    href: "/contact",
  },
  {
    eyebrow: "Honeymoon Journeys",
    headline: "Begin Your Forever in Africa",
    description:
      "From starlit safari camps to turquoise island shores — the first chapter of your life together, written by Africa.",
    image: IMAGES.kayaMawaPicnic,
    href: "/packages#romance",
  },
  {
    eyebrow: "Anniversary Journeys",
    headline: "Celebrate The Story You Continue To Write",
    description:
      "Return to where it all began, or discover somewhere new together. Every love story deserves its next chapter.",
    image: IMAGES.chinzomboCampfire,
    href: "/packages#romance",
  },
  {
    eyebrow: "Private Escapes",
    headline: "Moments Designed For Just The Two of You",
    description:
      "Intimate villas, hidden beaches, and world-class seclusion — crafted so you can focus on what matters most.",
    image: IMAGES.spa,
    href: "/packages#bespoke",
  },
];

export function LoveStoriesSection() {
  return (
    <section className="py-24 md:py-32 bg-warm-white">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Choose Your Story
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Every Love Story Has a Beginning
            <br />
            <span className="italic text-earth">Yours Starts Here</span>
          </h2>
        </motion.div>

        {/* Story cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {LOVE_STORIES.map((story, index) => (
            <motion.div
              key={story.eyebrow}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.7,
                delay: index * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link
                href={story.href}
                className="group relative block aspect-[4/3] overflow-hidden"
              >
                <Image
                  src={story.image}
                  alt={story.headline}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/80 via-soft-black/30 to-transparent" />

                {/* Content overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
                  <span className="text-[10px] font-medium tracking-[0.25em] uppercase text-gold-light mb-2">
                    {story.eyebrow}
                  </span>
                  <h3 className="text-xl md:text-2xl font-heading font-medium text-cream leading-snug max-w-sm">
                    {story.headline}
                  </h3>
                  <p className="mt-2 text-sm text-cream/70 leading-relaxed max-w-sm">
                    {story.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-cream/80 group-hover:text-cream transition-colors">
                    Begin Your Love Story
                    <ArrowRightIcon className="w-3 h-3 transition-transform duration-500 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
