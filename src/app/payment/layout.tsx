import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";

/**
 * Checkout/payment screens are per-booking, transactional and never useful in
 * a search index. A shared layout keeps every payment route out of it.
 */
export const metadata: Metadata = {
  title: "Secure Payment | Kivara",
  ...NO_INDEX,
};

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
