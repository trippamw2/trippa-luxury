import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About: Our Story",
  description:
    "Where your love story meets the wild. Discover Kivara: curating intimate escapes for couples across Lake Malawi, South Luangwa, and Zanzibar.",
  alternates: { canonical: canonicalUrl("/about") },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
