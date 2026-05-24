"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { useExperiences } from "@/lib/use-public-data";

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
            From dining under the stars to sleeping beside wild rivers — each experience is 
            designed to create memories that last a lifetime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {experiences.map((experience, index) => (
            <motion.div
              key={experience.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden aspect-[4/5] bg-soft-black-light"
            >
              <Image
                src={experience.image}
                alt={experience.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-soft-black/80 via-soft-black/20 to-transparent" />
              <div className="absolute top-4 right-4 text-7xl font-heading font-bold text-cream/[0.03] select-none">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                <span className="inline-block text-xs font-medium tracking-widest uppercase text-gold-light mb-2">
                  {experience.category}
                </span>
                <h3 className="text-xl md:text-2xl font-heading font-medium text-cream mb-2">
                  {experience.title}
                </h3>
                <p className="text-sm text-cream/60 leading-relaxed">
                  {experience.description}
                </p>
              </div>
              <div className="absolute inset-0 border border-gold/0 group-hover:border-gold/20 transition-all duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}


