"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Star, MapPin, Wifi, Waves, Car, Utensils, Sparkles, Heart, MessageCircle, Check, ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG, SITE_URL, DESTINATION_COORDINATES } from "@/lib/constants";
import { useProperties, useDestinations } from "@/lib/use-public-data";
import { MapEmbed } from "@/components/maps/MapEmbed";
import { cn } from "@/lib/utils";

const amenityIcons: Record<string, React.ReactNode> = {
  "Private infinity pool": <Waves className="w-4 h-4" />,
  "WiFi": <Wifi className="w-4 h-4" />,
  "Private pool": <Waves className="w-4 h-4" />,
  "Farm-to-table restaurant": <Utensils className="w-4 h-4" />,
  "Restaurant & bar": <Utensils className="w-4 h-4" />,
  "Restaurant": <Utensils className="w-4 h-4" />,
  "Helicopter pad": <Car className="w-4 h-4" />,
};

export default function PropertyDetailPage() {
  const params = useParams();
  const properties = useProperties();
  const destinations = useDestinations();
  const [inquiryForm, setInquiryForm] = useState({ fullName: "", email: "", phone: "", preferredDates: "", message: "" });
  const [inquiryStatus, setInquiryStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const property = properties.find((p) => p.id === params.slug);

  const regionCoords = property ? DESTINATION_COORDINATES[property.destination] : undefined;
  const mapCoords = property?.coordinates ?? regionCoords ?? { lat: -12.8, lng: 34.6 };

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <h1 className="text-2xl font-heading text-soft-black mb-4">Property Not Found</h1>
          <Button href="/">Return Home</Button>
        </div>
      </div>
    );
  }

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.fullName || !inquiryForm.email) return;
    setInquiryStatus("loading");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: inquiryForm.fullName,
          email: inquiryForm.email,
          phone: inquiryForm.phone,
          destination: property.destination,
          preferredDates: inquiryForm.preferredDates,
          guests: 2,
          message: `Interested in ${property.name}. ${inquiryForm.message}`,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setInquiryStatus("success");
      setInquiryForm({ fullName: "", email: "", phone: "", preferredDates: "", message: "" });
      setTimeout(() => setInquiryStatus("idle"), 5000);
    } catch {
      setInquiryStatus("error");
      setTimeout(() => setInquiryStatus("idle"), 5000);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: property.description || property.tagline,
    image: property.heroImage ? `${SITE_URL}${property.heroImage}` : undefined,
    url: `${SITE_URL}/properties/${property.id}`,
    address: { "@type": "PostalAddress", addressLocality: property.location },
    priceRange: property.priceRange,
    amenityFeature: property.amenities?.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="relative h-screen w-full overflow-hidden bg-soft-black">
        {property.heroImage && (
          <Image
            src={property.heroImage}
            alt={property.name}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br",
          property.destination === "lake-malawi" && "from-soft-black via-soft-black-light to-sand-dark/30",
          property.destination === "south-luangwa" && "from-soft-black via-soft-black-light to-earth/40",
          property.destination === "zanzibar" && "from-soft-black via-sand-dark/20 to-gold/20"
        )} />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/70 via-soft-black/20 to-transparent" />

        {/* Back button */}
        <Link
          href={property.destination === "lake-malawi" ? "/lake-malawi" : property.destination === "south-luangwa" ? "/south-luangwa" : "/zanzibar"}
          className="absolute top-28 left-6 md:left-10 z-20 inline-flex items-center gap-2 text-sm text-cream/60 hover:text-cream transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {property.destination === "lake-malawi" ? "Lake Malawi" : property.destination === "south-luangwa" ? "South Luangwa" : "Zanzibar"}
        </Link>

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="w-4 h-4 fill-gold text-gold" />
              <span className="text-sm text-cream/80">{property.rating.toFixed(1)}</span>
            </div>
            <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-3">
              {property.location}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-medium text-cream leading-tight">
              {property.name}
            </h1>
            <p className="mt-4 text-lg text-cream/60 max-w-xl mx-auto">
              {property.tagline}
            </p>
            <div className="mt-8">
              <Button href="#inquiry" variant="gold" size="lg">
                Enquire About This Property
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-3"
            >
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
                About
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black leading-tight mb-6">
                {property.tagline}
              </h2>
              <div className="text-base text-earth leading-relaxed space-y-4">
                {property.longDescription.split("\n").filter(Boolean).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              {/* Romantic highlights */}
              <div className="mt-10 p-6 bg-warm-white border border-sand-light/30">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="w-5 h-5 text-gold" />
                  <h4 className="text-sm font-medium tracking-widest uppercase text-soft-black">Romantic Highlights</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {property.romanticHighlights.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-earth">
                      <Sparkles className="w-4 h-4 text-gold shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <div className="bg-warm-white p-6 md:p-8 border border-sand-light/30 space-y-6 sticky top-28">
                {/* Price */}
                <div>
                  <span className="text-xs text-earth/60">Price Range</span>
                  <p className="text-lg font-heading text-gold-dark/70 font-medium">By Enquiry</p>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-earth/60">Location</span>
                    <p className="text-sm text-soft-black">{property.location}</p>
                  </div>
                </div>

                {/* Room Types */}
                <div>
                  <span className="text-xs text-earth/60">Room Types</span>
                  <ul className="mt-2 space-y-1">
                    {property.roomTypes.map((room) => (
                      <li key={room} className="text-sm text-soft-black flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                        {room}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-gold text-gold" />
                  <span className="text-sm text-soft-black font-medium">{property.rating.toFixed(1)}</span>
                  <span className="text-xs text-earth/60">({property.reviews.length} reviews)</span>
                </div>

                {/* Seasonal Availability */}
                {(() => {
                  const dest = destinations.find(d => d.id === property.destination);
                  if (!dest?.seasons) return null;
                  return (
                    <div className="pt-2">
                      <span className="text-xs text-earth/60 block mb-1">Best Time to Visit</span>
                      <p className="text-sm text-soft-black font-medium">{dest.seasons.bestTime}</p>
                      {dest.seasons.closed && (
                        <p className="text-xs text-earth/50 mt-1 italic">{dest.seasons.closed}</p>
                      )}
                    </div>
                  );
                })()}

                {/* CTAs */}
                <div className="pt-4 space-y-3">
                  <Button href="#inquiry" variant="primary" className="w-full">
                    Enquire Now
                  </Button>
                  <a
                    href={`https://wa.me/${SITE_CONFIG.whatsapp}?text=I'm interested in ${property.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-soft-black text-soft-black text-sm tracking-widest uppercase hover:bg-soft-black hover:text-cream transition-all duration-500"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp Inquiry
                  </a>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Location Map */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mt-16 md:mt-20"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-16 items-center">
              <div className="lg:col-span-2">
                <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
                  Find Us on the Map
                </span>
                <h3 className="text-2xl md:text-3xl font-heading font-medium text-soft-black leading-tight mb-4">
                  Where {property.name} Awaits
                </h3>
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                  <p className="text-sm text-soft-black">{property.location}</p>
                </div>
                <p className="text-sm text-earth/70 leading-relaxed mb-6">
                  Our concierge team will arrange every leg of your journey : private transfers, scenic flights and helicopter charters to bring you here with ease.
                </p>
                <Button href="/contact" variant="outline">Plan Your Journey</Button>
              </div>
              <div className="lg:col-span-3">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-sand-light/40 shadow-xl">
                  <MapEmbed
                    lat={mapCoords.lat}
                    lng={mapCoords.lng}
                    zoom={12}
                    title={`Map showing the location of ${property.name}`}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Gallery : 15 property-specific images */}
      <section className="py-24 bg-warm-white">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
              Gallery
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black">
              {property.name} in Pictures
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {(property.gallery || []).slice(0, 21).map((imgPath, item) => (
              <motion.div
                key={`${imgPath}-${item}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: item * 0.05 }}
                className={cn(
                  "relative overflow-hidden bg-gradient-to-br from-sand-light to-sand group",
                  item === 0 ? "aspect-square md:col-span-2 md:row-span-2" : "aspect-square"
                )}
              >
                <Image
                  src={imgPath}
                  alt={`${property.name} : ${item === 0 ? "hero view" : item <= 3 ? "suite interior" : item <= 6 ? "pool & grounds" : item <= 9 ? "bath & details" : "activities & dining"}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {/* Persistent cinematic darken */}
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/15 to-transparent" />
                {/* Hover reveal */}
                <div className="absolute inset-0 bg-gradient-to-t from-soft-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Rooms & Houses */}
      {"rooms" in property && property.rooms && (
        <section className="py-24 bg-cream">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto text-center mb-12"
            >
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
                Accommodation
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black">
                Houses & Rooms
              </h2>
              <p className="text-sm text-earth mt-3 max-w-xl mx-auto">
                Each sanctuary handcrafted from local stone and thatch, designed to bring you closer to the lake.
              </p>
            </motion.div>

            <div className="max-w-5xl mx-auto space-y-16">
              {property.rooms.map((room, index) => (
                <motion.div
                  key={room.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-heading font-medium text-soft-black">{room.name}</h3>
                    <span className="text-xs text-earth/60 border border-sand-light/50 px-2 py-0.5">
                      Sleeps {room.sleeps}
                    </span>
                  </div>
                  <p className="text-sm text-earth leading-relaxed mb-6 max-w-3xl">{room.description}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {room.images.map((imgPath, idx) => (
                      <div key={`${imgPath}-${idx}`} className="relative aspect-[4/3] overflow-hidden group">
                        <Image
                          src={imgPath}
                          alt={`${room.name} : image ${idx + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/40 via-transparent to-transparent" />
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Amenities */}
      <section className="py-24 bg-cream">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto text-center mb-12"
          >
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
              Amenities
            </span>
            <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black">
              Everything You Need
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
            {property.amenities.map((amenity) => (
              <motion.div
                key={amenity}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 p-4 bg-warm-white border border-sand-light/20"
              >
                <span className="text-gold shrink-0">
                  {amenityIcons[amenity] || <Check className="w-4 h-4" />}
                </span>
                <span className="text-sm text-soft-black">{amenity}</span>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* Reviews */}
      {property.reviews.length > 0 && (
        <section className="py-24 bg-warm-white">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="max-w-3xl mx-auto text-center mb-12"
            >
              <span className="text-xs font-medium tracking-[0.2em] uppercase text-gold mb-3 block">
                Guest Reviews
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black">
                What Our Guests Say
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {property.reviews.map((review, index) => (
                <motion.div
                  key={review.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 md:p-8 bg-cream border border-sand-light/30"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-sm text-earth/90 leading-relaxed mb-4 italic font-heading">
                    &ldquo;{review.text}&rdquo;
                  </p>
                  <p className="text-sm font-medium text-soft-black">{review.name}</p>
                  <p className="text-xs text-earth/60">{review.location}</p>
                </motion.div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Inquiry Section */}
      <section id="inquiry" className="py-24 md:py-32 bg-cream">
        <Container>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="max-w-2xl mx-auto text-center mb-12"
            >
              <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
                Enquire Now
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-medium text-soft-black leading-tight mb-4">
                Check Availability at {property.name}
              </h2>
              <p className="text-earth text-sm">
                Our concierge team will respond within 24 hours.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto"
              onSubmit={handleInquirySubmit}
            >
              <input
                type="text"
                placeholder="Full Name"
                required
                value={inquiryForm.fullName}
                onChange={(e) => setInquiryForm((f) => ({ ...f, fullName: e.target.value }))}
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={inquiryForm.email}
                onChange={(e) => setInquiryForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={inquiryForm.phone}
                onChange={(e) => setInquiryForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <input
                type="text"
                placeholder="Preferred Dates"
                value={inquiryForm.preferredDates}
                onChange={(e) => setInquiryForm((f) => ({ ...f, preferredDates: e.target.value }))}
                className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors"
              />
              <div className="md:col-span-2">
                <textarea
                  rows={4}
                  placeholder="Special requests or questions..."
                  value={inquiryForm.message}
                  onChange={(e) => setInquiryForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full px-5 py-3.5 bg-warm-white border border-sand-light/50 text-soft-black text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={inquiryStatus === "loading"}
                  className="w-full px-8 py-4 bg-soft-black text-cream text-sm font-medium tracking-[0.15em] uppercase hover:bg-soft-black-light transition-all duration-500 disabled:opacity-50"
                >
                  {inquiryStatus === "loading" ? "Sending..." : inquiryStatus === "success" ? "Sent ✓" : inquiryStatus === "error" ? "Failed : Try Again" : "Send Availability Request"}
                </button>
              </div>
            </motion.form>
          </div>
        </Container>
      </section>
    </>
  );
}
