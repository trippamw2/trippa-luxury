import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "South Luangwa — The Soul of African Wilderness",
  description:
    "Experience South Luangwa: the birthplace of the walking safari. Raw, intimate luxury in Zambia's most iconic wilderness for couples who seek to feel Africa.",
};

export default function SouthLuangwaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
