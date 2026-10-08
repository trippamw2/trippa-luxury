"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { readCookieConsent, onCookieConsentChange } from "@/lib/consent";

/**
 * Google Analytics, gated on cookie consent. The GA snippet used to ship
 * unconditionally in the root layout, which made every EU/UK visitor tracked
 * before they had answered the banner — a GDPR/ePrivacy violation. This
 * component renders nothing until consent is "all", and re-checks live when
 * the banner's Accept All is clicked, so no page reload is needed.
 */
export function ConsentAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const sync = () => setGranted(readCookieConsent() === "all");
    sync();
    return onCookieConsentChange(sync);
  }, []);

  if (!gaId || !granted) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
