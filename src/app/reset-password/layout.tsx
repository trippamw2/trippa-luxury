import type { Metadata } from "next";
import { NO_INDEX } from "@/lib/seo";

/** Staff password setup: reached from a one-time email link, never indexed. */
export const metadata: Metadata = {
  title: "Set a New Password | Kivara",
  ...NO_INDEX,
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
