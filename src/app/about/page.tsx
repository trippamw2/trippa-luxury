"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Heart, Globe, Leaf, Sparkles } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Romance First",
    description:
      "Romance is the heart of everything we do. Every journey is designed to deepen intimacy, create emotional moments, and elevate your shared love story.",
  },
  {
    icon: Globe,
    title: "African Nature",
    description:
      "Nature is the setting for your romance. Pristine beaches, untamed wilderness, and soul stirring landscapes that become the backdrop to your most treasured memories.",
  },
  {
    icon: Sparkles,
    title: "Wellness & Restoration",
    description:
      "Wellness restores you so romance can flourish. Slow mornings, spa rituals, healing environments: space to surrender to stillness together.",
  },
  {
    icon: Leaf,
    title: "Emotional Curation",
    description:
      "We are your romantic travel concierge. Every detail: every transfer, every experience, every surprise: designed so you feel nothing but connection.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[500px] w-full overflow-hidden bg-soft-black">
        <Image
          src="/images/kaya-mawa-beach-swing.jpg"
          alt="About Kivara"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black/80 via-soft-black/60 to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
              Our Story
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-heading font-medium text-cream leading-tight">
              The Kivara Story
            </h1>
            <p className="mt-4 text-base md:text-lg text-cream/60 max-w-2xl mx-auto">
              Founded by Liam &amp; Amara Kholo. A husband and wife team on a mission to deepen love through travel.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-20"
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                Our Philosophy
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight mb-6">
                Modern African Luxury,
                <br />
                <span className="italic text-earth">Curated with Soul</span>
              </h2>
              <p className="text-base md:text-lg text-earth leading-relaxed max-w-3xl mx-auto">
                The most luxurious travel touches your heart. 
                We are not a booking platform: we are architects of romance, curators of moments, 
                and storytellers of Africa&apos;s most beautiful places.
              </p>
            </motion.div>

            {/* Story */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src="/images/luangwa-river.jpg"
                  alt="South Luangwa river landscape"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-sand-light/20 to-cream/10" />
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-heading font-medium text-soft-black mb-4">
                  A Love Letter to Africa
                </h3>
                <p className="text-base text-earth leading-relaxed mb-4">
                  Africa gets under your skin. The warmth of its people, the vastness of its landscapes, 
                  the intimacy of its wildlife: nowhere makes you feel so alive.
                </p>
                <p className="text-base text-earth leading-relaxed mb-4">
                  Kivara exists for couples seeking something deeper than a vacation. A journey that 
                  becomes part of who you are. That changes how you see the world: and each other.
                </p>
                <p className="text-base text-earth leading-relaxed">
                  Every itinerary, every property, every experience answers one question: will this move you?
                </p>
              </div>
            </motion.div>

            {/* Founder Story */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24"
            >
              <div className="order-2 md:order-1">
                <h3 className="text-2xl md:text-3xl font-heading font-medium text-soft-black mb-4">
                  A Vision Born from Passion
                </h3>
                <p className="text-base text-earth leading-relaxed mb-4">
                  Kivara was founded by Liam and Amara Kholo, a husband and wife team who fell in love 
                  not only with each other but with Africa&apos;s ability to deepen human connection. 
                  After a decade curating bespoke journeys for Africa&apos;s premier safari lodges and 
                  boutique hotels, they recognized a gap in the market: there was no travel curator 
                  exclusively devoted to the romance traveler.
                </p>
                <p className="text-base text-earth leading-relaxed mb-4">
                  &ldquo;We found that couples weren&apos;t looking for another vacation. They were 
                  seeking a container for their connection: a space where the noise of daily life 
                  fell away and they could remember why they chose each other.&rdquo;
                </p>
                <p className="text-base text-earth leading-relaxed">
                  Based in Cape Town, the Kivara team personally visits every property, walks every 
                  trail, and tests every experience. Nothing is included in a Kivara itinerary that 
                  hasn&apos;t first moved its curator.
                </p>
              </div>
              <div className="relative aspect-[4/5] overflow-hidden order-1 md:order-2">
                <Image
                  src="/images/kaya-mawa-beach-swing.jpg"
                  alt="Kivara founders"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-sand-light/20 to-cream/10" />
              </div>
            </motion.div>

            {/* Conservation & Community */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8 }}
              className="mb-20"
            >
              <div className="text-center mb-12">
                <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3">
                  Impact
                </span>
                <h3 className="text-2xl md:text-3xl font-heading font-medium text-soft-black leading-tight">
                  Travel That Gives Back
                  <br />
                  <span className="italic text-earth">Conservation &amp; Community</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-warm-white border border-sand-light/30 group hover:border-gold/30 transition-all duration-500">
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 mb-4">
                    <span className="text-lg text-gold font-heading">01</span>
                  </div>
                  <h4 className="text-lg font-heading font-medium text-soft-black mb-3">Wildlife Conservation</h4>
                  <p className="text-sm text-earth leading-relaxed">
                    Every Kivara booking contributes directly to anti-poaching patrols and wildlife 
                    monitoring programs in South Luangwa National Park. We partner with Conservation 
                    South Luangwa to fund ranger units, tracker dogs, and community education programs 
                    that protect Zambia&apos;s wildlife for generations to come.
                  </p>
                </div>

                <div className="p-8 bg-warm-white border border-sand-light/30 group hover:border-gold/30 transition-all duration-500">
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 mb-4">
                    <span className="text-lg text-gold font-heading">02</span>
                  </div>
                  <h4 className="text-lg font-heading font-medium text-soft-black mb-3">Community Empowerment</h4>
                  <p className="text-sm text-earth leading-relaxed">
                    We champion lodges that employ locally, source regionally, and invest in their 
                    communities. Kaya Mawa&apos;s foundation funds schools on Likoma Island. Puku Ridge 
                    Camp trains guides from nearby villages. Each stay creates ripples that lift 
                    entire communities across Malawi, Zambia, and Zanzibar.
                  </p>
                </div>

                <div className="p-8 bg-warm-white border border-sand-light/30 group hover:border-gold/30 transition-all duration-500">
                  <div className="w-10 h-10 flex items-center justify-center border border-gold/30 mb-4">
                    <span className="text-lg text-gold font-heading">03</span>
                  </div>
                  <h4 className="text-lg font-heading font-medium text-soft-black mb-3">Sustainable Operations</h4>
                  <p className="text-sm text-earth leading-relaxed">
                    From solar-powered camps in Zambia to plastic-free initiatives on Lake Malawi and 
                    reef-safe marine policies in Zanzibar, every property in the Kivara collection meets 
                    our rigorous sustainability standards. We measure not just luxury, but legacy.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-8 bg-warm-white border border-sand-light/30 group hover:border-gold/30 transition-all duration-500"
                >
                  <value.icon className="w-6 h-6 text-gold mb-4" />
                  <h3 className="text-lg font-heading font-medium text-soft-black mb-2">{value.title}</h3>
                  <p className="text-sm text-earth leading-relaxed">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-24 bg-soft-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="w-full h-full" style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(201,169,110,0.5) 0%, transparent 50%)`,
          }} />
        </div>
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-heading font-medium text-cream mb-4">
              Let&apos;s Write Your Love Story
            </h2>
            <p className="text-earth-light text-sm mb-8">
              Ready to begin? Your personal concierge is waiting.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500"
            >
              Begin Your Love Story
            </a>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
