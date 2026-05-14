import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lake Malawi — Africa's Hidden Luxury Beach Escape",
  description:
    "Discover Lake Malawi: crystalline waters, private islands, and barefoot luxury. Africa's most serene romance sanctuary for couples seeking transcendence.",
};

export default function LakeMalawiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
