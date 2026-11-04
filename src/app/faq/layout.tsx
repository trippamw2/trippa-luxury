import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ | Kivara",
  description: "Frequently asked questions about booking your Kivara African journey. Find answers about bookings, destinations, cancellations, and more.",
  alternates: { canonical: canonicalUrl("/faq") },
  robots: { index: true, follow: true },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
