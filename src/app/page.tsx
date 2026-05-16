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
