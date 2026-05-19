import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Our Story",
  description:
    "Luxury journeys designed for connection. Discover Kivara — curators of Africa's most beautiful romantic escapes for couples who seek beauty, intimacy, and emotional immersion.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
