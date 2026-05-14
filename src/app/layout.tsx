import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppWidget } from "@/components/ui/whatsapp-widget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trippa — Luxury African Beach & Bush Escapes",
    template: "%s | Trippa",
  },
  description:
    "Curated luxury African romance travel. Exquisite beach and bush escapes for couples seeking exclusivity, emotion, and modern African luxury across Lake Malawi, South Luangwa, and Zanzibar.",
  keywords: [
    "luxury African travel",
    "romantic safari",
    "Lake Malawi luxury",
    "Zanzibar romantic vacations",
    "South Luangwa safari",
    "African honeymoon",
    "luxury beach and bush",
    "Trippa",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Trippa",
    title: "Trippa — Luxury African Beach & Bush Escapes",
    description:
      "Curated luxury African romance travel. Exquisite beach and bush escapes for couples.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trippa — Luxury African Beach & Bush Escapes",
    description:
      "Curated luxury African romance travel for couples.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-cream text-soft-black font-body antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppWidget />
      </body>
    </html>
  );
}
