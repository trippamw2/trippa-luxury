import Link from "next/link";
import { SITE_CONFIG } from "@/lib/constants";
import { Camera, Play, Globe, Image as ImageIcon, Heart, Mail, Phone, MapPin } from "lucide-react";

const footerLinks = {
  destinations: [
    { label: "Lake Malawi", href: "/lake-malawi" },
    { label: "South Luangwa", href: "/south-luangwa" },
    { label: "Zanzibar", href: "/zanzibar" },
  ],
  journeys: [
    { label: "Honeymoon Escape", href: "/packages#honeymoon-escape" },
    { label: "Beach & Bush Escape", href: "/packages#beach-bush-escape" },
    { label: "Romantic Safari Journey", href: "/packages#romantic-safari-journey" },
    { label: "Anniversary Escape", href: "/packages#anniversary-escape" },
    { label: "Luxury Island Retreat", href: "/packages#luxury-island-retreat" },
  ],
  explore: [
    { label: "About Kivara", href: "/about" },
    { label: "Journal", href: "/journal" },
    { label: "Contact", href: "/contact" },
  ],
};

export function Footer() {
  // Hide footer on admin pages
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="bg-soft-black text-cream">
      {/* Main Footer */}
      <div className="container-luxury py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block">
              <img
                src="/images/kivara-logo.png"
                alt="Kivara"
                className="h-12 md:h-14 w-auto max-w-[240px] md:max-w-[300px] object-contain brightness-0 invert opacity-90"
              />
            </Link>
            <p className="mt-4 text-earth-light text-sm leading-relaxed max-w-sm">
              Curating the world&apos;s most exquisite African romance escapes. 
              Every journey is a love story waiting to unfold.
            </p>
            <div className="mt-6 space-y-3">
              <a
                href={`mailto:${SITE_CONFIG.email}`}
                className="flex items-center gap-3 text-sm text-earth-light hover:text-gold-light transition-colors"
              >
                <Mail className="w-4 h-4" />
                {SITE_CONFIG.email}
              </a>
              <a
                href={`tel:${SITE_CONFIG.phone}`}
                className="flex items-center gap-3 text-sm text-earth-light hover:text-gold-light transition-colors"
              >
                <Phone className="w-4 h-4" />
                {SITE_CONFIG.phone}
              </a>
              <div className="flex items-start gap-3 text-sm text-earth-light">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Cape Town, South Africa<br />Serving Africa&apos;s Finest Destinations</span>
              </div>
            </div>
            {/* Social Links */}
            <div className="mt-8 flex items-center gap-4">
              <a
                href={SITE_CONFIG.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-earth/40 text-earth-light hover:border-gold hover:text-gold transition-all duration-300"
                aria-label="Instagram"
              >
                <Camera className="w-4 h-4" />
              </a>
              <a
                href={SITE_CONFIG.social.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-earth/40 text-earth-light hover:border-gold hover:text-gold transition-all duration-300"
                aria-label="TikTok"
              >
                <Play className="w-4 h-4" />
              </a>
              <a
                href={SITE_CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-earth/40 text-earth-light hover:border-gold hover:text-gold transition-all duration-300"
                aria-label="Facebook"
              >
                <Globe className="w-4 h-4" />
              </a>
              <a
                href={SITE_CONFIG.social.pinterest}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center border border-earth/40 text-earth-light hover:border-gold hover:text-gold transition-all duration-300"
                aria-label="Pinterest"
              >
                <ImageIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Destinations */}
          <div>
            <h4 className="text-sm font-medium tracking-widest uppercase text-gold mb-6">
              Destinations
            </h4>
            <ul className="space-y-4">
              {footerLinks.destinations.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-earth-light hover:text-cream transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Journeys */}
          <div>
            <h4 className="text-sm font-medium tracking-widest uppercase text-gold mb-6">
              Journeys
            </h4>
            <ul className="space-y-4">
              {footerLinks.journeys.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-earth-light hover:text-cream transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-sm font-medium tracking-widest uppercase text-gold mb-6">
              Explore
            </h4>
            <ul className="space-y-4">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-earth-light hover:text-cream transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${SITE_CONFIG.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 px-5 py-3 border border-gold/50 text-gold-light text-sm tracking-widest uppercase hover:bg-gold/10 transition-all duration-300"
            >
              <Heart className="w-4 h-4" />
              Chat with Concierge
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="container-luxury py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-earth/60">
            &copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights reserved. Crafted with love for Africa.
          </p>
          <div className="flex items-center gap-6 text-xs text-earth/60">
            <span className="flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-gold" /> in Africa
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
