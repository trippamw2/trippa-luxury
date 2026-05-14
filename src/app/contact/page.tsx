"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SITE_CONFIG } from "@/lib/constants";

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
              Get in Touch
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-medium text-cream leading-tight">
              Begin Your Journey
            </h1>
            <p className="mt-4 text-base md:text-lg text-cream/60 max-w-xl mx-auto">
              Your personal luxury concierge is ready to craft the perfect escape.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 lg:gap-20 max-w-6xl mx-auto">
            {/* Left: Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2"
            >
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
                Contact Us
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black leading-tight mb-6">
                Let&apos;s Create
                <br />
                <span className="italic text-earth">Something Beautiful</span>
              </h2>
              <p className="text-sm text-earth leading-relaxed mb-10">
                Whether you&apos;re dreaming of a specific journey or need guidance discovering 
                the perfect escape, our concierge team is here to bring your vision to life.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 shrink-0">
                    <Mail className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-earth/60 uppercase tracking-widest">Email</p>
                    <a href={`mailto:${SITE_CONFIG.email}`} className="text-sm text-soft-black hover:text-gold-dark transition-colors">
                      {SITE_CONFIG.email}
                    </a>
                    <p className="text-xs text-earth/50">We reply within 24 hours</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 shrink-0">
                    <Phone className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-earth/60 uppercase tracking-widest">Phone</p>
                    <a href={`tel:${SITE_CONFIG.phone}`} className="text-sm text-soft-black hover:text-gold-dark transition-colors">
                      {SITE_CONFIG.phone}
                    </a>
                    <p className="text-xs text-earth/50">Mon-Fri, 9am-6pm SAST</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 shrink-0">
                    <MapPin className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-earth/60 uppercase tracking-widest">Location</p>
                    <p className="text-sm text-soft-black">Cape Town, South Africa</p>
                    <p className="text-xs text-earth/50">Serving Africa&apos;s Finest Destinations</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 shrink-0">
                    <Clock className="w-4 h-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-earth/60 uppercase tracking-widest">Response Time</p>
                    <p className="text-sm text-soft-black">Within 24 hours</p>
                    <p className="text-xs text-earth/50">Weekend inquiries responded to on Monday</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="mt-10 p-6 bg-warm-white border border-sand-light/30">
                <div className="flex items-center gap-3 mb-3">
                  <MessageCircle className="w-5 h-5 text-gold" />
                  <h4 className="text-sm font-medium tracking-widest uppercase text-soft-black">
                    WhatsApp Concierge
                  </h4>
                </div>
                <p className="text-xs text-earth mb-4">
                  Prefer instant messaging? Our concierge team is available on WhatsApp.
                </p>
                <a
                  href={`https://wa.me/${SITE_CONFIG.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-soft-black text-cream text-xs tracking-widest uppercase hover:bg-soft-black-light transition-all duration-500"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat on WhatsApp
                </a>
              </div>
            </motion.div>

            {/* Right: Inquiry Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="bg-warm-white p-8 md:p-10 border border-sand-light/30">
                <h3 className="text-xl font-heading font-medium text-soft-black mb-2">
                  Send an Inquiry
                </h3>
                <p className="text-sm text-earth mb-8">
                  Tell us about your dream escape and we&apos;ll craft a personalized itinerary.
                </p>

                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium tracking-widest uppercase text-earth mb-1.5">Full Name *</label>
                      <input type="text" required className="w-full px-4 py-3 bg-cream border border-sand-light/50 text-soft-black text-sm focus:outline-none focus:border-gold transition-colors" placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-widest uppercase text-earth mb-1.5">Email Address *</label>
                      <input type="email" required className="w-full px-4 py-3 bg-cream border border-sand-light/50 text-soft-black text-sm focus:outline-none focus:border-gold transition-colors" placeholder="your@email.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-widest uppercase text-earth mb-1.5">Phone Number</label>
                      <input type="tel" className="w-full px-4 py-3 bg-cream border border-sand-light/50 text-soft-black text-sm focus:outline-none focus:border-gold transition-colors" placeholder="+1 234 567 890" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-widest uppercase text-earth mb-1.5">Preferred Destination</label>
                      <select className="w-full px-4 py-3 bg-cream border border-sand-light/50 text-soft-black text-sm focus:outline-none focus:border-gold transition-colors">
                        <option value="">Select destination</option>
                        <option value="lake-malawi">Lake Malawi</option>
                        <option value="south-luangwa">South Luangwa</option>
                        <option value="zanzibar">Zanzibar</option>
                        <option value="multi">Multi-destination</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-widest uppercase text-earth mb-1.5">Preferred Dates</label>
                      <input type="text" className="w-full px-4 py-3 bg-cream border border-sand-light/50 text-soft-black text-sm focus:outline-none focus:border-gold transition-colors" placeholder="e.g. October 2026" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium tracking-widest uppercase text-earth mb-1.5">Number of Guests</label>
                      <select className="w-full px-4 py-3 bg-cream border border-sand-light/50 text-soft-black text-sm focus:outline-none focus:border-gold transition-colors">
                        <option value="2">2 (Couple)</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5+</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium tracking-widest uppercase text-earth mb-1.5">Your Message *</label>
                    <textarea rows={5} required className="w-full px-4 py-3 bg-cream border border-sand-light/50 text-soft-black text-sm focus:outline-none focus:border-gold transition-colors resize-none" placeholder="Tell us about your dream escape — what experiences, properties, and style of travel appeal to you..." />
                  </div>

                  <button
                    type="submit"
                    className="w-full px-8 py-4 bg-soft-black text-cream text-sm font-medium tracking-[0.15em] uppercase hover:bg-soft-black-light transition-all duration-500 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Inquiry
                  </button>

                  <p className="text-xs text-earth/50 text-center">
                    By submitting, you agree to our Privacy Policy. We&apos;ll never share your information.
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>
    </>
  );
}
