import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppWidget } from "@/components/ui/whatsapp-widget";
import { CookieConsent } from "@/components/ui/CookieConsent";

export const metadata: Metadata = {
  title: {
    default: "Kivara — Africa's Most Coveted Romance Sanctuary",
    template: "%s | Kivara",
  },
  description:
    "A handcrafted collection of Africa's most exquisite beach and bush escapes. Curated exclusively for couples who refuse to compromise on beauty, intimacy, or refinement.",
  keywords: [
    "luxury African travel",
    "romantic safari",
    "Lake Malawi luxury",
    "Zanzibar romantic vacations",
    "South Luangwa safari",
    "African honeymoon",
    "luxury beach and bush",
    "Kivara",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Kivara",
    title: "Kivara — Africa's Most Coveted Romance Sanctuary",
    description:
      "A handcrafted collection of Africa's most exquisite beach and bush escapes for couples.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kivara — Africa's Most Coveted Romance Sanctuary",
    description:
      "A handcrafted collection of Africa's most exquisite escapes for couples.",
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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/kivara-icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/images/kivara-icon.svg" type="image/svg+xml" />
        <link rel="canonical" href="https://kivara.com" />
        <Script id="jsonld-structured-data" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TravelAgency",
            name: "Kivara Luxury Travel",
            url: "https://kivara.com",
            image: "https://kivara.com/images/kivara-icon.svg",
            description: "A handcrafted collection of Africa's most exquisite beach and bush escapes. Curated exclusively for couples who refuse to compromise on beauty, intimacy, or refinement.",
            address: { "@type": "PostalAddress", addressLocality: "Cape Town", addressCountry: "ZA" },
            sameAs: [
              "https://instagram.com/kivara",
              "https://facebook.com/kivara",
              "https://pinterest.com/kivara",
              "https://tiktok.com/@kivara",
            ],
          })}
        </Script>
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </head>
      <body className="min-h-screen flex flex-col bg-cream text-soft-black font-body antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <WhatsAppWidget />
        <CookieConsent />
      </body>
    </html>
  );
}