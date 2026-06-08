import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About: Our Story",
  description:
    "Where your love story meets the wild. Discover Kivara: curating intimate escapes for couples across Lake Malawi, South Luangwa, and Zanzibar.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
