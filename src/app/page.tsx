import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { HeroSection } from "@/components/sections/HeroSection";
import { BrandStatement } from "@/components/sections/BrandStatement";
import { ImpactSection } from "@/components/sections/ImpactSection";
import { FeaturedDestinations } from "@/components/sections/FeaturedDestinations";
import { PhilosophySection } from "@/components/sections/PhilosophySection";
import { CuratedJourneys } from "@/components/sections/CuratedJourneys";
import { FeaturedProperties } from "@/components/sections/FeaturedProperties";
import { MapSection } from "@/components/sections/MapSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { ExperiencesSection } from "@/components/sections/ExperiencesSection";
import { InspirationSection } from "@/components/sections/InspirationSection";
import { SocialContentSection } from "@/components/sections/SocialContentSection";
import { NewsletterSection } from "@/components/sections/NewsletterSection";

export const metadata: Metadata = {
  title: "Kivara: Africa's Ultimate Romance Sanctuary | Luxury Couples Travel",
  description:
    "Where your love story meets the wild. Handcrafted African romance escapes for couples who refuse to compromise: private island villas on Lake Malawi, award winning safari camps, and Zanzibar beachfront hideaways.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Kivara: Africa's Ultimate Romance Sanctuary | Luxury Couples Travel",
    description:
      "Where your love story meets the wild. African romance escapes for couples who seek beauty, intimacy, and wonder: Lake Malawi, South Luangwa, and Zanzibar.",
    url: SITE_URL,
    type: "website",
    locale: "en_US",
    siteName: "Kivara Luxury Travel",
    images: [{ url: "/images/hero-poster.jpg", width: 1200, height: 630, alt: "Kivara Luxury Travel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kivara: Africa's Ultimate Romance Sanctuary | Luxury Couples Travel",
    description:
      "Where your love story meets the wild. African romance escapes for couples who seek beauty, intimacy, and wonder: Lake Malawi, South Luangwa, and Zanzibar.",
    images: ["/images/hero-poster.jpg"],
  },
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <BrandStatement />
      <ImpactSection />
      <FeaturedDestinations />
      <PhilosophySection />
      <CuratedJourneys />
      <FeaturedProperties />
      <MapSection />
      <TestimonialsSection />
      <ExperiencesSection />
      <InspirationSection />
      <SocialContentSection />
      <NewsletterSection />
    </>
  );
}
