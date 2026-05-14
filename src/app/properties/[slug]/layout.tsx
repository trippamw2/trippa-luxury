import type { Metadata } from "next";
import { PROPERTIES } from "@/lib/constants";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const property = PROPERTIES.find((p) => p.id === slug);

  if (!property) {
    return { title: "Property Not Found" };
  }

  return {
    title: property.name,
    description: property.tagline,
    openGraph: {
      title: `${property.name} | Trippa`,
      description: property.tagline,
    },
  };
}

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
