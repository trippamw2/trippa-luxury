"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, TreePine, Moon, Compass, Camera } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { PropertyCard } from "@/components/ui/property-card";
import { Button } from "@/components/ui/button";
import { IMAGES, DESTINATION_COORDINATES } from "@/lib/constants";
import { useProperties, usePackages, useDestinations } from "@/lib/use-public-data";
import { getPropertyTransfer } from "@/lib/journey-routes";
import { TransferChain } from "@/components/sections/TransferTimeline";
import { MapEmbed } from "@/components/maps/MapEmbed";
import { FaqJsonLd } from "@/components/seo/FaqJsonLd";
import { cn } from "@/lib/utils";

const DESTINATION_SLUG = "south-luangwa";

const galleryItems = [
  { label: "Chinzombo's award-winning riverfront villas", image: IMAGES.chinzomboMain },
  { label: "Golden hour on the Kakumbi floodplain", image: IMAGES.pukuRidgeSunset },
  { label: "Chinzombo's plunge pool villas at dusk", image: IMAGES.chinzombo },
  { label: "Walking safaris at dawn with expert guides", image: IMAGES.chinzomboWildlife },
  { label: "Puku Ridge's suites above the floodplain", image: IMAGES.pukuRidgeCamp },
  { label: "Stargazing from Puku Ridge's star bed tower", image: IMAGES.pukuRidgeStars },
];

const experienceImages: Record<string, string> = {
  "Guided walking safaris following ancient elephant paths": IMAGES.chinzomboMain,
  "Night drives revealing the bush after dark": IMAGES.chinzomboWildlife,
  "Sundowners on the riverbank as Africa paints the sky": IMAGES.chinzombo,
  "Bush breakfasts where zebras are your dining companions": IMAGES.chinzomboCampfire,
  "Exclusive photography hides for intimate wildlife encounters": IMAGES.chinzomboMain,
  "Stargazing from raised platforms above the floodplain": IMAGES.pukuRidgeStars,
};

export default function SouthLuangwaPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const destinations = useDestinations();
  const destination = destinations.find((d) => d.id === DESTINATION_SLUG) || destinations[1];

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
          destination: "south-luangwa",
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

  const properties = useProperties().filter((p) => p.destination === "south-luangwa");
  const packages = usePackages().filter((p) => p.destinations.includes("south-luangwa"));
  const faqs = [
    { question: "What is the best time to visit South Luangwa?", answer: "The dry season from May to October is the prime time for wildlife viewing in South Luangwa, as animals concentrate around the Luangwa River and vegetation thins. June through August offers exceptional game viewing with cool mornings and mild days. The emerald season (November to April) transforms the valley into a lush paradise, ideal for photographers and couples seeking solitude, though some camps close during the peak wet months of January and February." },
    { question: "What makes South Luangwa special for couples?", answer: "South Luangwa is the birthplace of the walking safari, offering couples an intimacy with the African wilderness that no vehicle-based safari can match. With a maximum of 6-12 suites per camp and vast private concessions, you often have the bush entirely to yourselves. The combination of expert guides, exceptional wildlife concentrations, and ultra-luxury camps creates a safari experience that is both thrilling and deeply romantic." },
    { question: "What is a walking safari?", answer: "A walking safari is the original form of safari — exploring the bush on foot with an expert armed guide and tracker. South Luangwa pioneered this experience, and it remains the most intimate way to encounter Africa's wildlife. You track animals, learn about tracks and plants, and feel the raw energy of the bush. It is safe, profoundly moving, and arguably the most romantic way to experience the African wilderness together." },
    { question: "Which luxury camps are in South Luangwa?", answer: "Kivara curates two peerless South Luangwa properties: Time+Tide Chinzombo (six avant-garde riverfront villas with private plunge pools) and Puku Ridge Camp (six hilltop suites with star bed towers overlooking the floodplain). Each offers a distinct window into the Valley of the Leopard." },
    { question: "How do I get to South Luangwa?", answer: "International visitors fly into Kenneth Kaunda International Airport in Lusaka (LUN) via Johannesburg, Nairobi, or Addis Ababa. From Lusaka, it's a 1.5-hour light aircraft flight to Mfuwe Airport (MFU), followed by a 30-60 minute game-drive transfer to your camp — your safari begins before you arrive. Kivara arranges all internal flights and transfers for a seamless journey." },
    { question: "What wildlife can we see in South Luangwa?", answer: "South Luangwa is renowned for its extraordinary concentration of wildlife, including large herds of elephants, Thornicroft's giraffe (endemic to the region), leopards, lions, wild dogs, hippos, crocodiles, and over 400 bird species. The park is particularly famous for its leopard sightings — many consider it the best place in Africa to see these elusive cats. Night drives reveal a completely different world of nocturnal wildlife." },
  ];

  return (
    <>
      <FaqJsonLd items={faqs} />
      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden bg-soft-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster={IMAGES.southLuangwaRomanceHero}
          className="absolute inset-0 w-full h-full object-cover"
          preload="auto"
        >
          <source src="/videos/kivara-safari-aerial.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black/80 via-soft-black/60 to-earth/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/70 via-transparent to-soft-black/20" />
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{ background: "radial-gradient(circle, rgba(139,125,107,0.4) 0%, transparent 70%)" }} />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-16 h-px bg-accent-amber mx-auto mb-4"></div>
            <span className="inline-block text-xs md:text-sm font-medium tracking-[0.25em] uppercase text-accent-amber mb-4 md:mb-6">
              {destination.subtitle}
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
              <Button href="#inquiry" variant="outline" size="lg" className="border-cream/30 text-cream hover:bg-cream/10">
                Plan Your Safari
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
                The South Luangwa Story
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight mb-6">
                The Soul of African
                <br />
                <span className="italic text-earth">Wilderness</span>
              </h2>
              <p className="text-base text-earth leading-relaxed mb-4">
                South Luangwa is the birthplace of the walking safari, but to experience it as a 
                couple is to understand something far deeper. Here, the roar of a lion at dawn 
                becomes your shared call to adventure, and elephants wander through camp at dusk 
                as if welcoming you into their world.
              </p>
              <p className="text-base text-earth leading-relaxed">
                This is not a theme park: it is the real Africa. Untamed, intimate, and deeply 
                moving. You walk ancient paths together, with nothing but the sounds of the bush 
                around you. You fall asleep to the rumble of lions and wake to the call of fish 
                eagles, knowing you are among a fortunate few who will ever know this silence. 
                Here, your love story finds its wildest, most beautiful chapter.
              </p>
              <p className="text-base text-earth leading-relaxed">
                Our collection of two hand-selected properties spans the full spectrum of South 
                Luangwa luxury. From the award-winning architectural marvel of Time+Tide Chinzombo 
                with its private plunge pools overlooking the river, to the hilltop grandeur of 
                Puku Ridge Camp with its star bed towers. Each offers a distinct 
                window into the Valley of the Leopard.
              </p>
              <div className="mt-8 flex flex-wrap gap-6">
                {[
                  { icon: TreePine, label: "Birthplace of walking safaris" },
                  { icon: Moon, label: "Unforgettable night drives" },
                  { icon: Compass, label: "Expert guides & trackers" },
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
                src={IMAGES.pukuRidgeSunset}
                alt="Golden sunset over South Luangwa floodplain from Puku Ridge"
                fill
                className="object-cover storytelling-image"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Cinematic dark vignette */}
              <div className="absolute inset-0 bg-gradient-to-br from-soft-black/40 via-transparent to-soft-black/60" />
              {/* Bottom fade for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-soft-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <p className="text-cream/90 font-heading text-lg italic">&ldquo;The Valley of the Leopard&rdquo;</p>
                <p className="text-cream/60 text-sm mt-1">: Norman Carr</p>
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
              Where to Stay in
              <br />
              <span className="italic text-earth">South Luangwa</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-5">
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
              How You Arrive in
              <br />
              <span className="italic text-earth">South Luangwa</span>
            </h2>
            <p className="mt-5 text-earth/70 max-w-xl mx-auto text-sm leading-relaxed">
              Every flight and road transfer arranged by your Kivara Journey Concierge — from your international arrival to camp.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
              The Luangwa Valley,
              <br />
              <span className="italic text-cream/80">on the Map</span>
            </h2>
            <p className="mt-5 text-cream/60 max-w-xl mx-auto text-sm leading-relaxed">
              South Luangwa is one of Africa&apos;s greatest wildlife sanctuaries, its meandering Luangwa River drawing elephant, leopard and wild dog to the floodplain. Our camps perch on the river&apos;s edge, where the wilderness begins at your door.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/3] md:aspect-[21/10] overflow-hidden rounded-xl border border-cream/10 shadow-2xl"
          >
            <MapEmbed
              lat={DESTINATION_COORDINATES["south-luangwa"].lat}
              lng={DESTINATION_COORDINATES["south-luangwa"].lng}
              zoom={DESTINATION_COORDINATES["south-luangwa"].zoom}
              title="Map of South Luangwa properties"
              className="h-full"
            />
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
              Safari Experiences
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-soft-black leading-tight">
              Adventures in
              <br />
              <span className="italic text-earth">South Luangwa</span>
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
                  src={experienceImages[exp] || IMAGES.southLuangwaSafari}
                  alt={exp}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 to-transparent" />
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
                <span className="italic text-earth">South Luangwa</span>
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
              The Wild Beauty of
              <br />
              <span className="italic text-gold-light">South Luangwa</span>
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
                South Luangwa Safari
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
                      <span className="text-xs text-gold/70 font-medium ml-4">Enquire Within</span>
                    </div>
                    <Link
                      href={`/packages#${pkg.id}`}
                      className="inline-flex items-center gap-1 text-xs text-soft-black tracking-widest uppercase group-hover:text-gold-dark transition-colors"
                    >
                      View Details <ArrowRight className="w-3 h-3" />
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
              <span className="italic text-earth">South Luangwa Safari</span>
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
                Begin Your Safari
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black leading-tight mb-4">
                Enquire About South Luangwa
              </h2>
              <p className="text-earth text-sm">
                Let us craft your perfect safari experience.
              </p>
            </motion.div>

            {submitted ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center p-8 bg-warm-white border border-sand-light/30">
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
              <input type="text" name="name" placeholder="Full Name" required className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <input type="email" name="email" placeholder="Email Address" required className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <input type="tel" name="phone" placeholder="Phone Number" className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <input type="text" name="dates" placeholder="Preferred Dates" className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors" />
              <div className="md:col-span-2">
                <textarea name="message" rows={4} placeholder="Tell us about your dream safari..." className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors resize-none" />
              </div>
              {error && <p className="md:col-span-2 text-sm text-red-500 text-center">{error}</p>}
              <div className="md:col-span-2">
                <button type="submit" disabled={submitting} className="w-full px-8 py-4 bg-soft-black text-cream text-sm font-medium tracking-[0.15em] uppercase hover:bg-soft-black-light transition-all duration-500 disabled:opacity-50">
                  {submitting ? "Sending..." : "Send Enquiry"}
                </button>
              </div>
              <p className="md:col-span-2 text-xs text-earth/50 text-center -mt-2">
                We&apos;ll respond within 24 hours with a personalized itinerary.
              </p>
            </motion.form>
            )}
          </div>
        </Container>
      </section>
    </>
  );
}
