import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Begin Your Journey",
  description:
    "Reach out to Kivara's concierge team. Let us craft your perfect African romance escape — a bespoke itinerary designed around your love story.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
