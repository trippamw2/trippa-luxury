"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/lib/constants";

const HERO_VIDEOS = [
  { src: "/videos/kivara-safari-aerial.mp4", label: "safari" },
  { src: "/videos/kivara-zanzibar-aerial.mp4", label: "zanzibar" },
];

const VIDEO_INTERVAL = 10000; // 10 seconds per video

export function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const videoOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.3]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  // Cycle between videos
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_VIDEOS.length);
    }, VIDEO_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-soft-black">
      {/* Dual-video carousel background */}
      <motion.div
        className="absolute inset-0"
        style={{ scale: videoScale, opacity: videoOpacity }}
      >
        {/* Video layers with crossfade */}
        {HERO_VIDEOS.map((video, index) => (
          <motion.div
            key={video.label}
            className="absolute inset-0"
            animate={{ opacity: index === activeIndex ? 1 : 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              poster={IMAGES.heroPoster}
              className="absolute inset-0 w-full h-full object-cover"
              preload="auto"
            >
              <source src={video.src} type="video/mp4" />
            </video>
          </motion.div>
        ))}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black/60 via-soft-black/30 to-soft-black/70" />
        {/* Cinematic gold glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(201, 169, 110, 0.15) 0%, transparent 70%)",
          }}
        />
      </motion.div>

      {/* Parallax still image fallback (shows while video loads or if video fails) */}
      <div className="absolute inset-0 opacity-0 pointer-events-none">
        <Image
          src={IMAGES.heroPoster}
          alt="" /* decorative fallback: hidden while video loads */
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-soft-black/40 via-transparent to-soft-black/60" />

      {/* Content */}
      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6"
        style={{ y: contentY }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl"
        >
          {/* Tagline: brand positioning */}
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="inline-block text-xs md:text-sm font-medium tracking-[0.25em] uppercase text-gold-light mb-6 md:mb-8"
          >
            Where Your Love Story Meets the Wild
          </motion.span>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-medium text-cream leading-tight text-balance"
          >
            Create Your African
            <br />
            <span className="text-gold-light">Love Story</span>
          </motion.h1>

          {/* Destination bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="mt-4"
          >
            <span className="inline-block text-[11px] md:text-xs tracking-[0.3em] uppercase text-cream/40 font-light">
              The Heart  ·  The Wild Soul  ·  The Forever
            </span>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-6 md:mt-8 text-base md:text-lg text-cream/70 max-w-2xl mx-auto leading-relaxed font-light"
          >
            Kivara crafts private romantic journeys across Africa, combining breathtaking
            destinations, authentic culture and unforgettable moments designed around your story.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              href="/contact"
              variant="gold"
              size="lg"
            >
              Begin Your Love Story
              <ArrowRightIcon className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Button>
            <Button
              href="/packages"
              variant="outlineLight"
              size="lg"
            >
              Explore Romantic Journeys
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Video carousel indicator dots */}
      <div className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {HERO_VIDEOS.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`min-w-0 min-h-0 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-700 ${
              index === activeIndex
                ? "bg-cream w-4 md:w-5"
                : "bg-cream/30 hover:bg-cream/50"
            }`}
            aria-label={`Show ${index === 0 ? "safari" : "beach"} video`}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-16 bg-gradient-to-b from-cream/50 to-transparent"
        />
      </motion.div>
    </section>
  );
}
