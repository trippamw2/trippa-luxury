import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Trippa's Journal — inspiration for discerning travelers. Destination guides, romantic itineraries, and stories from Africa's most extraordinary escapes.",
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
