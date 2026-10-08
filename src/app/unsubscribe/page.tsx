import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/sections/UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribe | Kivara",
  description: "Unsubscribe from the Kivara newsletter.",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[320px] w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
            Newsletter
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-cream leading-tight">
            Unsubscribe
          </h1>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-xl mx-auto px-6 text-center">
          <p className="text-base text-earth leading-relaxed mb-8">
            We are sorry to see you go. Enter the email address you subscribed with and
            we will stop sending newsletters right away — no login required.
          </p>
          <UnsubscribeForm />
        </div>
      </section>
    </>
  );
}
