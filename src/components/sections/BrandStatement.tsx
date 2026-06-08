"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { HeartIcon, ArrowRightIcon, GlobeIcon, MoonIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { BRAND_POSITIONING } from "@/lib/constants";

const values = [
  {
    icon: HeartIcon,
    title: "Curated for Romance",
    description:
      "Every journey is designed for two. From private beach dinners to couples spa rituals, every moment is crafted for connection.",
  },
  {
    icon: GlobeIcon,
    title: "Modern African Luxury",
    description:
      "African luxury reimagined through a contemporary lens: where authentic experiences meet world-class sophistication. For those who seek the remarkable.",
  },
  {
    icon: MoonIcon,
    title: "Emotional Storytelling",
    description:
      "Your escapes are stories waiting to be lived. Each destination, each experience, each moment becomes part of your love story.",
  },
];

export function BrandStatement() {
  const { storyBrand, betweenAmanAndBeyond } = BRAND_POSITIONING;

  return (
    <section className="py-24 md:py-32 bg-cream">
      <Container>
        {/* StoryBrand: Hero introduction */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center mb-20"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            The Kivara Philosophy
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            {storyBrand.hero.split(". ")[0]}.
            <br />
            <span className="italic text-earth">A Partnership That Deserves Celebrating</span>
          </h2>
          <p className="mt-6 text-base md:text-lg text-earth leading-relaxed max-w-3xl mx-auto">
            {storyBrand.problem}
          </p>
          <p className="mt-4 text-base md:text-lg text-soft-black/80 leading-relaxed max-w-3xl mx-auto font-heading italic">
            &ldquo;{storyBrand.guide}&rdquo;
          </p>
        </motion.div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 mb-20">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="text-center group"
            >
              <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-gold/30 group-hover:bg-gold/5 transition-colors duration-500">
                <value.icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="text-xl font-heading font-medium text-soft-black mb-3">
                {value.title}
              </h3>
              <p className="text-sm text-earth leading-relaxed">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Between Aman and &Beyond positioning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center p-10 md:p-14 bg-warm-white border border-gold/20"
        >
          <span className="inline-block text-[10px] font-medium tracking-[0.3em] uppercase text-gold mb-4">
            Our Place in the World
          </span>
          <p className="text-base md:text-lg text-earth leading-relaxed italic">
            &ldquo;{betweenAmanAndBeyond}&rdquo;
          </p>
          <div className="mt-8">
            <Button
              href="/about"
              variant="ghost"
              size="sm"
            >
              Discover Your Journey <ArrowRightIcon className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
