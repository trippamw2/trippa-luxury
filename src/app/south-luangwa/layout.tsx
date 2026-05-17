import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "South Luangwa — The Soul of African Wilderness | Kivara",
  description:
    "Experience South Luangwa: the birthplace of the walking safari. Raw, intimate luxury in Zambia's most iconic wilderness for couples who seek to feel Africa.",
  openGraph: {
    title: "South Luangwa — The Soul of African Wilderness | Kivara",
    description:
      "Experience South Luangwa: the birthplace of the walking safari. Raw, intimate luxury in Zambia's most iconic wilderness for couples who seek to feel Africa.",
    images: [{ url: "/images/puku-ridge-1.jpg", width: 1200, height: 630, alt: "South Luangwa — Puku Ridge Camp" }],
    type: "website",
    locale: "en_US",
    siteName: "Kivara Luxury Travel",
  },
  twitter: {
    card: "summary_large_image",
    title: "South Luangwa — The Soul of African Wilderness | Kivara",
    description:
      "Experience South Luangwa: the birthplace of the walking safari. Raw, intimate luxury in Zambia's most iconic wilderness for couples who seek to feel Africa.",
    images: ["/images/puku-ridge-1.jpg"],
  },
};

export default function SouthLuangwaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
