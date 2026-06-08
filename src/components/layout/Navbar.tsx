"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MenuIcon, XIcon, ChevronDownIcon } from "@/components/ui/icons";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";
import { KivaraLogo } from "@/components/ui/KivaraLogo";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  {
    label: "Destinations",
    href: "#",
    children: [
      { label: "Lake Malawi", href: "/lake-malawi", description: "Africa's hidden luxury beach escape", image: "/images/pl-camporlodge-pumulani-lodge-58.jpg" },
      { label: "South Luangwa", href: "/south-luangwa", description: "Raw intimate safari luxury", image: "/images/puku-ridge-3.jpg" },
      { label: "Zanzibar", href: "/zanzibar", description: "Tropical romantic elegance", image: "/images/zanzibar-beach.jpg" },
    ],
  },
  { label: "Journeys", href: "/packages" },
  { label: "About", href: "/about" },
  { label: "Journal", href: "/journal" },
  { label: "Contact", href: "/contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);

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
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-700",
        isScrolled
          ? "bg-cream/95 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="container-luxury">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link href="/" className="relative z-10 block shrink-0">
            {/* Dark logo : shown when scrolled (light background) */}
            <KivaraLogo
              variant="dark"
              className={cn(
                "h-10 sm:h-12 md:h-14 w-auto max-w-[200px] sm:max-w-[260px] md:max-w-[320px] transition-all duration-500",
                isScrolled ? "opacity-100" : "opacity-0 absolute"
              )}
            />
            {/* Light logo : shown on hero (dark background) */}
            <KivaraLogo
              variant="light"
              className={cn(
                "h-10 sm:h-12 md:h-14 w-auto max-w-[200px] sm:max-w-[260px] md:max-w-[320px] transition-all duration-500",
                isScrolled ? "opacity-0 absolute" : "opacity-100"
              )}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10">
            {NAV_ITEMS.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
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
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[580px] bg-cream shadow-xl border border-sand-light/30 p-5"
                      >
                        <div className="grid grid-cols-3 gap-4">
                          {item.children.map((child: { label: string; href: string; description: string; image?: string }) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className="group block"
                            >
                              <div className="relative aspect-[4/3] overflow-hidden mb-3">
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

            {/* CTA Button */}
            <Link
              href="/contact"
              className={cn(
                "px-6 py-2.5 text-sm font-medium tracking-widest uppercase border transition-all duration-500",
                isScrolled
                  ? "border-soft-black text-soft-black hover:bg-soft-black hover:text-cream"
                  : "border-white text-white hover:bg-white hover:text-soft-black"
              )}
            >
              Begin Your Journey
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={cn(
              "lg:hidden relative z-10 p-2 transition-colors",
              isScrolled || isMobileOpen ? "text-soft-black" : "text-white"
            )}
            aria-label="Toggle menu"
          >
            {isMobileOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100dvh" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden fixed inset-0 top-0 bg-cream z-[5] overflow-y-auto"
          >
            <div className="flex flex-col justify-center min-h-screen px-8 py-24">
              {NAV_ITEMS.map((item) =>
                item.children ? (
                  <div key={item.label} className="border-b border-sand-light/30">
                    <button
                      onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                      className="flex items-center justify-between w-full py-5 text-2xl font-heading text-soft-black"
                    >
                      {item.label}
                      <ChevronDown
                        className={cn(
                          "w-5 h-5 transition-transform duration-300",
                          mobileDropdownOpen && "rotate-180"
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {mobileDropdownOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4 space-y-3">
                            {item.children.map((child: { label: string; href: string; description: string; image?: string }) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setIsMobileOpen(false)}
                                className="flex items-center gap-4 py-3 pl-4 pr-2 text-earth hover:text-soft-black transition-colors group"
                              >
                                <div className="relative w-16 h-12 shrink-0 overflow-hidden">
                                  {child.image && (
                                    <Image
                                      src={child.image}
                                      alt={child.label}
                                      fill
                                      className="object-cover"
                                      sizes="64px"
                                    />
                                  )}
                                </div>
                                <div>
                                  <span className="block text-lg font-medium">{child.label}</span>
                                  <span className="block text-sm text-earth/70">{child.description}</span>
                                </div>
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
                    onClick={() => setIsMobileOpen(false)}
                    className="py-5 text-2xl font-heading text-soft-black border-b border-sand-light/30 hover:text-gold-dark transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              )}

              {/* Mobile CTA */}
              <Link
                href="/contact"
                onClick={() => setIsMobileOpen(false)}
                className="mt-8 w-full text-center px-8 py-4 bg-soft-black text-cream text-sm font-medium tracking-widest uppercase hover:bg-soft-black-light transition-colors"
              >
                Begin Your Journey
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
