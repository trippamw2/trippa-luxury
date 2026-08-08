"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Waves, Sun, Ship, Camera } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { PropertyCard } from "@/components/ui/property-card";
import { Button } from "@/components/ui/button";
import { IMAGES } from "@/lib/constants";
import { useProperties, usePackages, useDestinations } from "@/lib/use-public-data";
import { getPropertyTransfer } from "@/lib/journey-routes";
import { TransferChain } from "@/components/sections/TransferTimeline";
import dynamic from "next/dynamic";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { cn } from "@/lib/utils";

const LeafletMap = dynamic(
  () => import("@/components/sections/LeafletMap").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-soft-black animate-pulse" />,
  }
);

const DESTINATION_SLUG = "lake-malawi";

const galleryItems = [
  { label: "Kaya Mawa's iconic beach swing at sunset", image: IMAGES.kayaMawa },
  { label: "Pumulani's lakeside villas overlooking the water", image: IMAGES.pumulani },
  { label: "The Lake of Stars at golden hour", image: IMAGES.lakeMalawiSunset },
  { label: "Snorkelling with tropical cichlids in crystal coves", image: IMAGES.kayaMawaSnorkel },
  { label: "The lake's hidden coves at golden hour", image: IMAGES.lakeMalawiAerial },
  { label: "Makokola Retreat's lakeside elegance", image: IMAGES.makokolaRetreat },
  { label: "Sailing and kayaking through untouched coves", image: IMAGES.lakeMalawiIsland },
  { label: "Scenic aerial views of Likoma's coastline", image: IMAGES.lakeMalawiAerial },
];

const experienceImages: Record<string, string> = {
  "Private beach dining beneath a canopy of stars": IMAGES.dining,
  "Sunset dhow cruises across the Lake of Stars": IMAGES.lakeMalawiSunset,
  "Snorkeling in crystalline freshwater coves": IMAGES.kayaMawaSnorkel,
  "Private picnics on deserted islands": IMAGES.kayaMawaPicnic,
  "Kayaking through golden hour light": IMAGES.lakeMalawiIsland,
  "Intimate cultural encounters with lakeside villages": IMAGES.makokolaRetreat,
};

export default function LakeMalawiPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const destinations = useDestinations();
  const destination = destinations.find((d) => d.id === DESTINATION_SLUG) || destinations[0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("name") as string,
          email: form.get("email") as string,
          phone: form.get("phone") as string || null,
          destination: "lake-malawi",
          preferredDates: form.get("dates") as string || null,
          guests: 2,
          message: form.get("message") as string,
        }),
      });
      if (!res.ok) throw new Error("Failed to send inquiry");
      setSubmitted(true);
    } catch {
      setError("Failed to send inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const properties = useProperties().filter((p) => p.destination === "lake-malawi");
  const packages = usePackages().filter((p) => p.destinations.includes("lake-malawi"));
  const faqs = [
    { question: "What is the best time to visit Lake Malawi?", answer: "The best time to visit Lake Malawi is from May to October during the dry season when you'll enjoy warm, sunny days and calm lake conditions. June through August offers the clearest skies for stargazing — the 'Lake of Stars' effect is at its most magical. The green season (November to April) brings lush landscapes, fewer crowds, and excellent value for couples seeking solitude." },
    { question: "How do I get to Lake Malawi?", answer: "International visitors fly into Kamuzu International Airport in Lilongwe (LLW) — or Bakili Muluzi International in Blantyre (BLZ) — via Johannesburg, Nairobi, or Addis Ababa. From Lilongwe, it's a scenic 35-minute light aircraft charter to Club Makokola Airstrip (CMK) for The Makokola Retreat and Pumulani, or a 45-minute charter to Likoma Island (LIX) for Kaya Mawa, followed by short road transfers to your suite. Kivara handles every leg — private charters, road transfers, and connections from your international flight — ensuring a seamless journey from arrival to your suite." },
    { question: "What makes Lake Malawi a romantic destination for couples?", answer: "Lake Malawi offers an intimacy that no beach destination can match. With private island escapes, deserted beaches where the only footsteps are your own, candlelit dinners on the shore under the Lake of Stars, and suites that open directly onto the freshwater lake, it is Africa's most understated romantic sanctuary. The complete absence of crowds, combined with warm year-round weather and the natural beauty of the lake, creates an atmosphere where couples can truly disconnect and reconnect." },
    { question: "Which luxury lodges are on Lake Malawi?", answer: "Kivara curates three peerless Lake Malawi properties: Kaya Mawa on Likoma Island (the iconic barefoot luxury beach resort), Pumulani (colonial-chic lakeside villas), and The Makokola Retreat (intimate lakehouse elegance). Each offers a distinct expression of Lake Malawi luxury, from adventure-focused escapes to pure relaxation." },
    { question: "What activities can couples enjoy on Lake Malawi?", answer: "Lake Malawi offers an extraordinary range of couples' experiences: snorkeling with tropical cichlids in crystal-clear coves, sunset dhow cruises, kayaking through golden hour light, private picnics on deserted islands, scuba diving, paddleboarding, village cultural visits, and simply lounging on pristine beaches. The lake's calm, crystal-clear waters make it one of Africa's safest and most accessible water playgrounds." },
    { question: "How many days should we spend on Lake Malawi?", answer: "We recommend 5-7 nights at a single property to fully immerse in the Lake Malawi rhythm, or 7-10 nights to combine two lodges (e.g., Kaya Mawa on Likoma Island followed by Pumulani on the mainland shore). Most couples find that a week allows the perfect balance of adventure, relaxation, and romance." },
  ];

  return (
    <>
      <FaqJsonLd items={faqs} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Lake Malawi", url: "/lake-malawi" },
        ]}
      />
      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden bg-soft-black">
        {/* Cinematic Ken Burns zoom (cinematic effect when video unavailable) */}
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.0 }}
          animate={{ scale: 1.08 }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
        >
          <Image
            src={IMAGES.lakeMalawiRomanceHero}
            alt="Lake Malawi"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black/80 via-soft-black/60 to-sand-dark/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        
        {/* Animated light */}
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full opacity-[0.08]" 
          style={{ background: "radial-gradient(circle, rgba(212,197,169,0.4) 0%, transparent 70%)" }} />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-16 h-px bg-accent-teal mx-auto mb-4"></div>
            <span className="inline-block text-xs md:text-sm font-medium tracking-[0.25em] uppercase text-accent-teal mb-4 md:mb-6">
              {destination.chapter ?? destination.subtitle}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-heading font-medium text-cream leading-tight">
              {destination.title}
            </h1>
            <p className="mt-4 text-base md:text-lg text-cream/60 max-w-xl mx-auto">
              {destination.tagline}
            </p>
            <p className="mt-6 max-w-2xl mx-auto text-sm md:text-base text-cream/50 leading-relaxed">
              {destination.positioning}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button href="#properties" variant="gold" size="lg">
                Explore Properties
              </Button>
              <Button href="/contact" variant="outline" size="lg" className="border-cream/30 text-cream hover:bg-cream/10">
                Begin Your Love Story
              </Button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-px h-16 bg-gradient-to-b from-cream/30 to-transparent"
          />
        </motion.div>
      </section>

      {/* Storytelling Section */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                The Lake Malawi Story
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight mb-6">
                Africa&apos;s Hidden Gem,
                <br />
                <span className="italic text-earth">Where Freshwater Meets Paradise</span>
              </h2>
              <p className="text-base text-earth leading-relaxed mb-4">
                Lake Malawi is not merely a destination: it is a feeling. Known as the Lake of Stars, 
                this ancient freshwater sea has cradled lovers for centuries. You wake to the gentle 
                lap of water against the shore, spend your days exploring deserted islands hand in hand, 
                and dine beneath constellations on a private beach where the only footsteps in the sand 
                are your own.
              </p>
              <p className="text-base text-earth leading-relaxed">
                This is Africa at its most intimate. Where the world falls away and all that remains 
                is you, your beloved, and the quiet rhythm of the lake. Every moment designed not for 
                sightseeing, but for rediscovering each other.
              </p>
              <div className="mt-8 flex flex-wrap gap-6">
                {[
                  { icon: Waves, label: "Crystal-clear waters" },
                  { icon: Sun, label: "Year-round sunshine" },
                  { icon: Ship, label: "Private island escapes" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm text-earth">
                    <item.icon className="w-4 h-4 text-gold" />
                    {item.label}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative aspect-[4/5] overflow-hidden"
            >
              <Image
                src={IMAGES.kayaMawa}
                alt="Kaya Mawa beach swing at sunset on Lake Malawi"
                fill
                className="object-cover storytelling-image"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Cinematic dark vignette */}
              <div className="absolute inset-0 bg-gradient-to-br from-soft-black/30 via-transparent to-soft-black/50" />
              {/* Bottom fade for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-soft-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <p className="text-cream/90 font-heading text-lg italic">&ldquo;The Lake of Stars&rdquo;</p>
                <p className="text-cream/60 text-sm mt-1">: David Livingstone</p>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Properties Section */}
      <section id="properties" className="py-24 md:py-32 bg-warm-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
              Curated Properties
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
              Where to Stay on
              <br />
              <span className="italic text-earth">Lake Malawi</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {properties.map((property, index) => (
              <PropertyCard
                key={property.id}
                name={property.name}
                tagline={property.tagline}
                location={property.location}
                image={property.heroImage}
                rating={property.rating}
                slug={property.id}
                index={index}
              />
            ))}
          </div>
        </Container>
      </section>

      {/* Getting There Section */}
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
              Getting There
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
              How You Arrive on
              <br />
              <span className="italic text-earth">Lake Malawi</span>
            </h2>
            <p className="mt-5 text-earth/70 max-w-xl mx-auto text-sm leading-relaxed">
              Every flight, charter and road transfer arranged by your Kivara Journey Concierge — from your international arrival to your suite.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {properties.map((property, index) => {
              const transfer = getPropertyTransfer(property.id);
              if (!transfer) return null;
              return (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-warm-white border border-sand-light/30 p-6 md:p-8"
                >
                  <h3 className="font-heading text-lg text-soft-black mb-4">{property.name}</h3>
                  <TransferChain steps={transfer.steps} />
                  {transfer.alternateGateway?.note && (
                    <p className="mt-4 text-xs text-earth/70 leading-relaxed border-t border-sand-light/30 pt-4">
                      {transfer.alternateGateway.note}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Region Map Section */}
      <section className="py-24 md:py-32 bg-soft-black">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
              Explore the Region
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
              The Lake of Stars,
              <br />
              <span className="italic text-cream/80">on the Map</span>
            </h2>
            <p className="mt-5 text-cream/60 max-w-xl mx-auto text-sm leading-relaxed">
              Lake Malawi stretches over 580 kilometres through the Great Rift Valley. Our curated properties line its shores, from the island sanctuary of Likoma to the private peninsulas of the south.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/3] md:aspect-[21/10] overflow-hidden rounded-xl border border-cream/10 shadow-2xl"
          >
            <LeafletMap destinationId="lake-malawi" showAll={false} />
          </motion.div>
        </Container>
      </section>

      {/* Experiences Section */}
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
              Signature Experiences
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
              Things to Do on
              <br />
              <span className="italic text-earth">Lake Malawi</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {destination.experiences.map((exp, index) => (
              <motion.div
                key={exp}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group relative overflow-hidden aspect-[4/3]"
              >
                <Image
                  src={experienceImages[exp] || IMAGES.lakeMalawiBeach}
                  alt={exp}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-cream font-heading text-lg">{exp}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Seasons Section */}
      {destination.seasons && (
        <section className="py-24 md:py-32 bg-warm-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl mx-auto text-center mb-16"
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                Best Time to Visit
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
                When to Experience
                <br />
                <span className="italic text-earth">Lake Malawi</span>
              </h2>
            </motion.div>

            <div className="max-w-4xl mx-auto mb-12">
              <div className="bg-cream border border-sand-light rounded-lg p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-sm text-earth uppercase tracking-wider mb-1">Best Time</p>
                    <p className="text-xl font-heading text-soft-black">{destination.seasons.bestTime}</p>
                  </div>
                  <div className="h-px md:h-12 md:w-px bg-sand-light" />
                  <div className="flex-1">
                    <p className="text-sm text-earth uppercase tracking-wider mb-1">Seasonal Note</p>
                    <p className="text-soft-black">{destination.seasons.closed}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {destination.seasons.months.map((month, index) => (
                <motion.div
                  key={month.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.03 }}
                  className={cn(
                    "text-center p-3 rounded-lg border transition-all",
                    month.open === true
                      ? "bg-soft-black border-soft-black text-cream"
                      : month.open === "partial"
                      ? "bg-sand-light border-sand-light text-soft-black"
                      : "bg-red-50 border-red-100 text-red-800 opacity-60"
                  )}
                >
                  <p className="text-xs font-medium uppercase tracking-wider mb-1">{month.name}</p>
                  <p className="text-sm font-heading">{month.temp}</p>
                  <p className="text-[10px] mt-1 opacity-70">{month.weather}</p>
                  {month.open === false && (
                    <p className="text-[10px] mt-1 font-medium text-red-600">Closed</p>
                  )}
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Gallery Section */}
      <section className="py-24 md:py-32 bg-soft-black">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
              Gallery
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight">
              A Visual Journey Through
              <br />
              <span className="italic text-gold-light">Lake Malawi</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {galleryItems.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className={cn(
                  "relative overflow-hidden group cursor-pointer aspect-square",
                  index === 0 && "md:col-span-2 md:row-span-2"
                )}
              >
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {/* Persistent cinematic darken */}
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/20 to-transparent" />
                {/* Hover reveal */}
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Camera className="absolute top-4 right-4 w-5 h-5 text-cream/30 group-hover:text-cream/60 transition-colors" />
                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                  <p className="text-xs text-cream/80">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Packages Section */}
      {packages.length > 0 && (
        <section className="py-24 md:py-32 bg-warm-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-3xl mx-auto text-center mb-16"
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                Curated Journeys
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
                Romantic Lake Malawi
                <br />
                <span className="italic text-earth">Journeys</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-8 bg-cream border border-sand-light/30 group hover:border-gold/30 transition-all duration-500"
                >
                  <h3 className="text-2xl font-heading font-medium text-soft-black mb-2">{pkg.title}</h3>
                  <p className="text-sm text-earth mb-4">{pkg.subtitle}</p>
                  <p className="text-sm text-earth/80 mb-4 line-clamp-2">{pkg.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-earth/60">{pkg.duration}</span>
                      <span className="text-xs text-gold/70 font-medium ml-4">Begin This Story</span>
                    </div>
                    <Link
                      href={`/packages#${pkg.id}`}
                      className="inline-flex items-center gap-1 text-xs text-soft-black tracking-widest uppercase group-hover:text-gold-dark transition-colors"
                    >
                      Read the Story <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* FAQ Section */}
      <section className="py-24 md:py-32 bg-warm-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
              Frequently Asked Questions
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
              Planning Your
              <br />
              <span className="italic text-earth">Lake Malawi Escape</span>
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="bg-cream border border-sand-light/30 p-6 md:p-8"
              >
                <h3 className="text-base font-heading font-medium text-soft-black mb-3">{faq.question}</h3>
                <p className="text-sm text-earth leading-relaxed">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Inquiry Section */}
      <section id="inquiry" className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-2xl mx-auto text-center mb-12"
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                Begin Your Love Story
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black leading-tight mb-4">
                Enquire About Lake Malawi
              </h2>
              <p className="text-earth text-sm">
                Our concierge team will craft your perfect Lake Malawi escape.
              </p>
            </motion.div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-lg mx-auto text-center p-8 bg-warm-white border border-sand-light/30"
              >
                <p className="text-soft-black font-heading text-lg mb-2">Thank You</p>
                <p className="text-sm text-earth">Your inquiry has been received. Our concierge team will respond within 24 hours.</p>
              </motion.div>
            ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto"
              onSubmit={handleSubmit}
            >
              <input type="text" name="name" placeholder="Full Name" required
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <input type="email" name="email" placeholder="Email Address" required
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <input type="tel" name="phone" placeholder="Phone Number"
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <input type="text" name="dates" placeholder="Preferred Dates"
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <div className="md:col-span-2">
                <textarea name="message" rows={4} placeholder="Tell us about your dream escape..."
                  className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors resize-none" />
              </div>
              {error && <p className="md:col-span-2 text-sm text-red-500 text-center">{error}</p>}
              <div className="md:col-span-2">
                <button type="submit" disabled={submitting}
                  className="w-full px-8 py-4 bg-soft-black text-cream text-sm font-medium tracking-[0.15em] uppercase hover:bg-soft-black-light transition-all duration-500 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Inquiry"}
                </button>
              </div>
            </motion.form>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}


