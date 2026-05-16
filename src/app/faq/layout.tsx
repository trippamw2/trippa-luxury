import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | Kivara",
  description: "Frequently asked questions about booking your Kivara luxury African journey. Find answers about bookings, destinations, cancellations, and more.",
  robots: { index: true, follow: true },
};

export default function FAQLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
