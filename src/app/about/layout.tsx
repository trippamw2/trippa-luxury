import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Our Story",
  description:
    "Discover the story behind Trippa. We curate Africa's most coveted romance sanctuaries for couples who refuse to compromise on beauty, intimacy, or refinement.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
