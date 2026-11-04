import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";

/**
 * The guest portal holds personal booking documents behind a login. It must
 * never be crawled, so the group layout declares that for every portal route.
 */
export const metadata: Metadata = {
  title: "Guest Portal | Kivara",
  ...NO_INDEX,
};

export default function GuestPortalGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
