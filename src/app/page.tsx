import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { HeroSection } from "@/components/sections/HeroSection";
import { BrandStatement } from "@/components/sections/BrandStatement";
import { LoveStoriesSection } from "@/components/sections/LoveStoriesSection";
import { FeaturedDestinations } from "@/components/sections/FeaturedDestinations";
import { KivaraProcessSection } from "@/components/sections/KivaraProcessSection";
import { PhilosophySection } from "@/components/sections/PhilosophySection";
import { ImpactSection } from "@/components/sections/ImpactSection";
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
    "Create your African love story with Kivara — private romantic journeys across Lake Malawi, South Luangwa and Zanzibar, crafted around your story from arrival to departure.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "Kivara: Africa's Ultimate Romance Sanctuary | Luxury Couples Travel",
    description:
      "Create your African love story with Kivara — private romantic journeys across Lake Malawi, South Luangwa and Zanzibar, crafted around your story.",
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
      "Create your African love story with Kivara — private romantic journeys across Lake Malawi, South Luangwa and Zanzibar, crafted around your story.",
    images: ["/images/hero-poster.jpg"],
  },
};

export default function HomePage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }]} />
      <HeroSection />
      <BrandStatement />
      <LoveStoriesSection />
      <FeaturedDestinations />
      <KivaraProcessSection />
      <PhilosophySection />
      <ImpactSection />
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
