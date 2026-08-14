"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo } from "react";
import { useExperiences, useDestinations } from "@/lib/use-public-data";
import { EXPERIENCES } from "@/lib/constants";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

const EXPERIENCE_CATEGORIES = ["All", "Romance", "Safari", "Wellness", "Dining"] as const;
type Category = (typeof EXPERIENCE_CATEGORIES)[number];

export default function ExperiencesPage() {
  const { data: experiences = EXPERIENCES } = useExperiences();
  const { data: destinations } = useDestinations();
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filtered = useMemo(
    () =>
      activeCategory === "All"
        ? experiences
        : experiences.filter((e) => e.category === activeCategory),
    [experiences, activeCategory]
  );

  const getDestinationName = (slug: string) => {
    const dest = destinations.find((d) => d.slug === slug);
    return dest?.title ?? slug;
  };

  const getDestinationHref = (slug: string) => `/${slug}`;

  const categories = EXPERIENCE_CATEGORIES;

  return (
    <main>
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Experiences", url: "/experiences" }]} />
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[500px] flex items-center">
        <Image
          src={experiences[0]?.image ?? ""}
          alt="Private beach dining beneath the stars"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/80 via-soft-black/40 to-transparent" />
        <Container className="relative z-10 max-w-3xl">
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
            Crafted Experiences
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-medium text-cream mb-6">
            Experiences Composed for Two
          </h1>
          <p className="text-lg text-earth-light mb-8 max-w-2xl">
            Each experience is crafted around the rhythm of your journey, whether
            that is a private dinner beneath the African stars, a guided walking
            safari through ancient wilderness, or a sunset dhow cruise with
            champagne in hand.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500"
          >
            Begin Your Love Story
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Container>
      </section>

      {/* Category Filter */}
      <section className="border-t border-gold/10 bg-soft-black/5">
        <Container className="py-6">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-6 py-2 text-sm font-medium tracking-[0.1em] uppercase transition-all duration-300 border",
                    isActive
                      ? "bg-gold text-soft-black border-gold"
                      : "bg-transparent text-cream border-gold/30 hover:border-gold/60"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Experiences Grid */}
      <section className="py-16">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((exp) => (
              <Link key={exp.id} href={getDestinationHref(exp.destination)} className="block">
                <div className="group cursor-pointer">
                  <div className="relative aspect-[3/2] overflow-hidden mb-4">
                    <Image
                      src={exp.image}
                      alt={exp.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="inline-block px-3 py-1 text-xs font-medium tracking-[0.1em] uppercase bg-gold/90 text-soft-black">
                        {exp.category}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl font-heading font-medium text-cream mb-2 group-hover:text-gold transition-colors">
                    {exp.title}
                  </h3>
                  <p className="text-sm text-earth-light mb-3 leading-relaxed">
                    {exp.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-gold">
                    {getDestinationName(exp.destination)}
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
