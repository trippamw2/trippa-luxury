"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, ArrowRightIcon } from "@/components/ui/icons";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { KivaraLogo } from "@/components/ui/KivaraLogo";
import { JOURNEY_COLLECTIONS } from "@/lib/constants";

const COLLECTION_CHILDREN = JOURNEY_COLLECTIONS.map((collection) => ({
  label: collection.title,
  href: `/packages#${collection.id}`,
  description: collection.description,
  image: collection.image,
}));

const NAV_ITEMS = [
  {
    label: "Destinations",
    href: "#",
    children: [
      { label: "Lake Malawi", href: "/lake-malawi", description: "The Heart, the warmth of a people who greet you with kindness", image: "/images/gs--283.mainja-pool_1.jpg" },
      { label: "South Luangwa", href: "/south-luangwa", description: "The Wild Soul, where the wild brings two hearts closer", image: "/images/shawa-campfire.jpg" },
      { label: "Zanzibar", href: "/zanzibar", description: "The Forever, where turquoise waters hold your memories", image: "/images/baraza-beach.jpg" },
    ],
  },
  {
    label: "Journeys",
    href: "#",
    children: [
      ...COLLECTION_CHILDREN,
      {
        label: "All Journeys",
        href: "/packages",
        description: "Every curated journey across Africa, in one place",
        image: "/images/chinzombo-wildlife.jpg",
      },
    ],
  },
  { label: "Journal", href: "/journal" },
  { label: "Contact", href: "/contact" },
];

const EASE_LUXURY: [number, number, number, number] = [0.32, 0.72, 0, 1];
const STAGGER_OVERLAY = {
  hidden: { opacity: 0, transition: { duration: 0.3, ease: EASE_LUXURY } },
  show: {
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_LUXURY, staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { duration: 0.3, ease: EASE_LUXURY } },
};
const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_LUXURY } },
};

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  // Hide navbar on admin pages
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4">
      <nav
        className={cn(
          "mt-4 md:mt-6 flex w-full max-w-4xl items-center justify-between gap-6 rounded-full py-2.5 pl-5 pr-2.5 transition-all duration-700 will-change-transform",
          isScrolled
            ? "bg-cream/85 backdrop-blur-2xl ring-1 ring-black/5 shadow-[0_12px_40px_-12px_rgba(28,26,23,0.18)]"
            : "bg-white/10 backdrop-blur-xl ring-1 ring-white/15"
        )}
      >
        <div className="flex items-center justify-between h-12 md:h-14">
          {/* Logo */}
          <Link href="/" className="relative z-10 block shrink-0">
            {/* Dark logo : shown when scrolled (light background) */}
            <KivaraLogo
              variant="dark"
              className={cn(
              "h-8 sm:h-10 md:h-11 w-auto max-w-[150px] sm:max-w-[200px] md:max-w-[240px] transition-all duration-500",
              isScrolled ? "opacity-100" : "opacity-0 absolute"
              )}
            />
            {/* Light logo : shown on hero (dark background) */}
            <KivaraLogo
              variant="light"
              className={cn(
              "h-8 sm:h-10 md:h-11 w-auto max-w-[150px] sm:max-w-[200px] md:max-w-[240px] transition-all duration-500",
              isScrolled ? "opacity-0 absolute" : "opacity-100"
              )}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    className={cn(
                      "flex items-center gap-1 text-sm font-medium tracking-widest uppercase transition-colors duration-300",
                      isScrolled
                        ? "text-soft-black/80 hover:text-soft-black"
                        : "text-white/90 hover:text-white"
                    )}
                  >
                    {item.label}
                    <ChevronDownIcon className="w-3 h-3" />
                  </button>
<AnimatePresence>
                  {openDropdown === item.label && (
                    <motion.div
                      initial={{ opacity: 0, y: 12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 12, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: EASE_LUXURY }}
                      className={cn(
                        "absolute top-full left-1/2 -translate-x-1/2 mt-4 bg-cream/95 backdrop-blur-xl rounded-2xl shadow-[0_24px_60px_-12px_rgba(28,26,23,0.25)] ring-1 ring-black/5 p-5",
                        item.children.length >= 4 ? "w-[820px]" : "w-[580px]"
                      )}
                    >
                        <div
                          className={cn(
                            "grid gap-4",
                            item.children.length >= 4 ? "grid-cols-4" : "grid-cols-3"
                          )}
                        >
                          {item.children.map((child: { label: string; href: string; description: string; image?: string }) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="group block"
                            >
                              <div className="relative aspect-[4/3] overflow-hidden rounded-xl mb-3">
                                {child.image && (
                                  <Image
                                    src={child.image}
                                    alt={child.label}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    sizes="180px"
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/40 to-transparent" />
                              </div>
                              <span className="block text-sm font-medium text-soft-black group-hover:text-gold-dark transition-colors">
                                {child.label}
                              </span>
                              <span className="block text-xs text-earth mt-0.5 leading-relaxed">
                                {child.description}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium tracking-widest uppercase transition-colors duration-300",
                    isScrolled
                      ? "text-soft-black/80 hover:text-soft-black"
                      : "text-white/90 hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              )
            )}

            {/* CTA — island button */}
            <Link
              href="/contact"
              className={cn(
                "group flex items-center gap-0.5 rounded-full py-1.5 pl-6 pr-1.5 text-[13px] font-medium tracking-widest uppercase transition-all duration-500",
                isScrolled
                  ? "bg-soft-black text-cream hover:bg-soft-black-light"
                  : "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm hover:bg-white/25"
              )}
            >
              Begin Your Love Story
              <span
                className={cn(
                  "ml-3 flex items-center justify-center w-8 h-8 rounded-full transition-transform duration-500 ease-out",
                  isScrolled ? "bg-cream text-soft-black" : "bg-white text-soft-black",
                  "group-hover:translate-x-0.5"
                )}
              >
                <ArrowRightIcon className="w-4 h-4" />
              </span>
            </Link>
          </div>

          {/* Mobile Menu Toggle — two bars morph into an X */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={cn(
              "lg:hidden relative z-10 flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-300",
              isScrolled || isMobileOpen ? "text-soft-black" : "text-white"
            )}
            aria-label={isMobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileOpen}
          >
            <motion.span
              animate={isMobileOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -3.5 }}
              transition={{ duration: 0.4, ease: EASE_LUXURY }}
              className="absolute block w-6 h-[1.5px] rounded-full bg-current"
            />
            <motion.span
              animate={isMobileOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 3.5 }}
              transition={{ duration: 0.4, ease: EASE_LUXURY }}
              className="absolute block w-6 h-[1.5px] rounded-full bg-current"
            />
          </button>
        </div>
      </nav>

      {/* Mobile Navigation — full-screen with staggered items */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            variants={STAGGER_OVERLAY}
            initial="hidden"
            animate="show"
            exit="exit"
            className="lg:hidden fixed inset-0 top-0 bg-cream z-[60] h-screen overflow-y-auto overscroll-contain texture-noise"
          >
            <div className="flex flex-col px-6 pt-24 pb-20 min-h-full">
              <div className="space-y-2 flex-1">
                {NAV_ITEMS.map((item) =>
                  item.children ? (
                    <motion.div key={item.label} variants={STAGGER_ITEM} className="border-b border-sand-light/40">
                      <button
                        onClick={() => setOpenMobileDropdown(openMobileDropdown === item.label ? null : item.label)}
                        className="flex items-center justify-between w-full py-4 text-xl font-heading text-soft-black"
                      >
                        <span>{item.label}</span>
                        <ChevronDownIcon
                          className={cn(
                            "w-4 h-4 transition-transform duration-300",
                            openMobileDropdown === item.label && "rotate-180"
                          )}
                        />
                      </button>
                      <AnimatePresence>
                        {openMobileDropdown === item.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pb-4 space-y-2.5">
                              {item.children.map((child: { label: string; href: string; description: string; image?: string }) => (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  onClick={() => setIsMobileOpen(false)}
                                  className="flex items-center gap-3.5 py-2.5 pl-3 pr-2 rounded-xl bg-white/60 hover:bg-white text-earth hover:text-soft-black transition-all group shadow-xs"
                                >
                                  <div className="relative w-14 h-10 shrink-0 overflow-hidden rounded-lg">
                                    {child.image && (
                                      <Image
                                        src={child.image}
                                        alt={child.label}
                                        fill
                                        className="object-cover"
                                        sizes="56px"
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="block text-sm font-medium text-soft-black truncate">{child.label}</span>
                                    <span className="block text-xs text-earth/70 truncate">{child.description}</span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div key={item.label} variants={STAGGER_ITEM} className="border-b border-sand-light/40">
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className="block py-4 text-xl font-heading text-soft-black hover:text-gold-dark transition-colors"
                      >
                        {item.label}
                      </Link>
                    </motion.div>
                  )
                )}
              </div>

              {/* Mobile CTA — compact refined island button */}
              <motion.div variants={STAGGER_ITEM} className="mt-8 pt-4 border-t border-sand-light/40 shrink-0">
                <Link
                  href="/contact"
                  onClick={() => setIsMobileOpen(false)}
                  className="group flex items-center justify-between w-full px-5 py-3.5 bg-soft-black text-cream text-xs font-medium tracking-widest uppercase rounded-full transition-colors hover:bg-soft-black/90 shadow-sm"
                >
                  <span>Begin Your Love Story</span>
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-cream text-soft-black transition-transform duration-500 ease-out group-hover:translate-x-0.5">
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
