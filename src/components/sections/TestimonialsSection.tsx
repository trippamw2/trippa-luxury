"use client";

import { motion } from "framer-motion";
import { StarIcon, QuoteIcon } from "@/components/ui/icons";
import { Container } from "@/components/ui/container";
import { TESTIMONIALS } from "@/lib/constants";

export function TestimonialsSection() {
  return (
    <section className="py-24 md:py-32 bg-cream overflow-hidden">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Love Stories
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Stories Our Couples Tell Forever
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="relative p-8 md:p-10 bg-warm-white border border-sand-light/30 group hover:border-gold/20 transition-colors duration-500"
            >
              <QuoteIcon className="absolute top-6 right-6 w-8 h-8 text-gold/10" />
              
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <StarIcon key={i} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>

              {/* Text */}
              <p className="text-base md:text-lg text-soft-black/80 leading-relaxed font-heading italic mb-6">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-soft-black">{testimonial.name}</p>
                  <p className="text-xs text-earth">{testimonial.location}</p>
                </div>
                <span className="text-xs text-earth/60">{testimonial.destination}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Third-party validation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 pt-12 border-t border-sand-light/40"
        >
          <p className="text-[10px] text-earth/50 tracking-[0.2em] uppercase text-center mb-8">
            Recognised by
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            <span className="text-sm text-earth/40 font-medium tracking-wider uppercase">
              Condé Nast Traveller
            </span>
            <span className="w-px h-6 bg-sand-light/50 hidden md:block" />
            <span className="text-sm text-earth/40 font-medium tracking-wider uppercase">
              Travel + Leisure
            </span>
            <span className="w-px h-6 bg-sand-light/50 hidden md:block" />
            <span className="text-sm text-earth/40 font-medium tracking-wider uppercase">
              National Geographic
            </span>
            <span className="w-px h-6 bg-sand-light/50 hidden md:block" />
            <span className="text-sm text-earth/40 font-medium tracking-wider uppercase">
              The Safari Awards
            </span>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
