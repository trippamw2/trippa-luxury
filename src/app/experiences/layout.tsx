import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata(
  "/experiences",
  "Experiences: Romance, Safari, Wellness & Dining | Kivara",
  "Hand-picked romantic experiences across Lake Malawi, South Luangwa and Zanzibar: private dining, safari, spa and island escapes for couples."
);

export default function ExperiencesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
