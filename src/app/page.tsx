import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { BrandStatement } from "@/components/sections/BrandStatement";
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
  title: "Kivara — Africa's Most Coveted Romance Sanctuary",
  description:
    "Luxury journeys designed for connection. A handcrafted collection of Africa's most exquisite romantic escapes for couples who refuse to compromise on beauty, intimacy, or refinement.",
  alternates: { canonical: "https://kivara.luxury" },
  openGraph: {
    title: "Kivara — Africa's Most Coveted Romance Sanctuary",
    description:
      "Luxury journeys designed for connection. Handcrafted African romance escapes for couples who seek beauty, intimacy, and emotional immersion.",
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
