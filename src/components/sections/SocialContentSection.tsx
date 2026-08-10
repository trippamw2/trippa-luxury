"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Camera, Music, Play } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

const socialItems = [
  {
    type: "video",
    label: "@kivara",
    icon: Play,
    description: "Golden hour on the shores of Lake Malawi",
    image: "/images/kaya-mawa-madimba-evening-pool-view.jpg",
    alt: "Madimba House infinity pool at golden hour, Lake Malawi",
  },
  {
    type: "photo",
    label: "@kivara",
    icon: Camera,
    description: "Sundowner beneath a thousand year old baobab",
    image: "/images/cz-sundowner-baobab.jpg",
    alt: "Sundowner beneath a baobab tree at sunset in South Luangwa",
  },
  {
    type: "video",
    label: "@kivara",
    icon: Play,
    description: "Walking with wildlife in South Luangwa",
    image: "/images/south-luangwa-sunset.jpg",
    alt: "Sunset over the Luangwa floodplain",
  },
  {
    type: "photo",
    label: "@kivara",
    icon: Camera,
    description: "Private beach moments on Likoma Island",
    image: "/images/kaya-mawa-beach-swing.jpg",
    alt: "Private beach swing at Kaya Mawa, Likoma Island",
  },
];

export function SocialContentSection() {
  return (
    <section className="py-24 md:py-32 bg-cream">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Follow the Journey
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
            Cinematic Stories,
            <br />
            <span className="italic text-earth">Captured for You</span>
          </h2>
          <p className="mt-4 text-base text-earth leading-relaxed">
            Follow us on Instagram and TikTok for daily inspiration from Africa&apos;s most romantic destinations.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {socialItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden aspect-square bg-soft-black-light cursor-pointer"
            >
              {/* Background image */}
              <Image
                src={item.image}
                alt={item.alt}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />

              {/* Dark overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-soft-black/10 to-soft-black/20 group-hover:from-soft-black/70 group-hover:via-soft-black/20 transition-all duration-500" />

              {/* Icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                {item.type === "video" ? (
                  <div className="w-12 h-12 flex items-center justify-center rounded-full border border-cream/30 group-hover:border-gold/60 transition-all duration-500 backdrop-blur-sm bg-cream/5">
                    <Play className="w-5 h-5 text-cream/80 group-hover:text-gold-light transition-colors" fill="currentColor" />
                  </div>
                ) : (
                  <item.icon className="w-8 h-8 text-cream/50 group-hover:text-gold-light transition-colors duration-500" />
                )}
              </div>

              {/* Overlay at bottom: always visible with subtle treatment */}
              <div className="absolute inset-0 bg-gradient-to-t from-soft-black/70 via-transparent to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 text-cream/80">
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="text-xs">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-cream/60 mt-1 line-clamp-1">{item.description}</p>
                </div>
              </div>

              {/* Gold border on hover */}
              <div className="absolute inset-0 border border-gold/0 group-hover:border-gold/30 transition-all duration-500 pointer-events-none" />
            </motion.div>
          ))}
        </div>

        {/* Follow buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <a
            href={SITE_CONFIG.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-soft-black text-soft-black text-sm tracking-widest uppercase hover:bg-soft-black hover:text-cream transition-all duration-500"
          >
            <Camera className="w-4 h-4" />
            Follow on Instagram
          </a>
          <a
            href={SITE_CONFIG.social.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 border border-soft-black text-soft-black text-sm tracking-widest uppercase hover:bg-soft-black hover:text-cream transition-all duration-500"
          >
            <Music className="w-4 h-4" />
            Follow on TikTok
          </a>
        </motion.div>
      </Container>
    </section>
  );
}
