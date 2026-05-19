import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { BrandStatement } from "@/components/sections/BrandStatement";
import { ImpactSection } from "@/components/sections/ImpactSection";
import { FeaturedDestinations } from "@/components/sections/FeaturedDestinations";
import { PhilosophySection } from "@/components/sections/PhilosophySection";
import { CuratedJourneys } from "@/components/sections/CuratedJourneys";
import { FeaturedProperties } from "@/components/sections/FeaturedProperties";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { ExperiencesSection } from "@/components/sections/ExperiencesSection";
import { InspirationSection } from "@/components/sections/InspirationSection";
import { SocialContentSection } from "@/components/sections/SocialContentSection";
import { NewsletterSection } from "@/components/sections/NewsletterSection";

export const metadata: Metadata = {
  title: "Kivara — Africa's Ultimate Romance Sanctuary | Luxury Couples Travel",
  description:
    "Where your love story meets the wild. Handcrafted African romance escapes for couples who refuse to compromise — private island villas on Lake Malawi, award-winning safari camps, and Zanzibar beachfront hideaways.",
  alternates: { canonical: "https://kivara.luxury" },
  openGraph: {
    title: "Kivara — Africa's Ultimate Romance Sanctuary | Luxury Couples Travel",
    description:
      "Where your love story meets the wild. African romance escapes for couples who seek beauty, intimacy, and the extraordinary — Lake Malawi, South Luangwa, and Zanzibar.",
    url: "https://kivara.luxury",
    type: "website",
    locale: "en_US",
    siteName: "Kivara Luxury Travel",
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
      <TestimonialsSection />
      <ExperiencesSection />
      <InspirationSection />
      <SocialContentSection />
      <NewsletterSection />
    </>
  );
}
