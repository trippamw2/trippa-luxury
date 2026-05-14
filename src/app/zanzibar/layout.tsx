import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zanzibar — The Spice Island Romance",
  description:
    "Discover Zanzibar: turquoise waters, ancient Stone Town, and spice-scented luxury. The apex of tropical romance for couples seeking paradise.",
};

export default function ZanzibarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
