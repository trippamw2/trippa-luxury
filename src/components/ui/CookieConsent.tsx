"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { XIcon } from "@/components/ui/icons";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("kivara-cookie-consent");
    if (!consent) {
      // Delay appearance so it doesn't show immediately on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function acceptAll() {
    localStorage.setItem("kivara-cookie-consent", "all");
    setVisible(false);
    setDismissed(true);
  }

  function acceptEssential() {
    localStorage.setItem("kivara-cookie-consent", "essential");
    setVisible(false);
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="max-w-5xl mx-auto bg-soft-black/95 backdrop-blur-md border border-white/10 p-4 md:p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-cream/80 leading-relaxed">
                  We use cookies to enhance your browsing experience, analyze site traffic, and personalize your journey.
                  By clicking &ldquo;Accept All,&rdquo; you consent to our use of cookies. Read our{" "}
                  <Link href="/privacy" className="text-gold-light underline hover:text-gold transition-colors">
                    Privacy Policy
                  </Link>{" "}
                  for more information.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={acceptEssential}
                  className="px-4 py-2.5 text-xs tracking-widest uppercase text-cream/70 border border-white/20 hover:border-white/40 hover:text-cream transition-all duration-300"
                >
                  Essential Only
                </button>
                <button
                  onClick={acceptAll}
                  className="px-5 py-2.5 text-xs tracking-widest uppercase bg-gold text-soft-black hover:bg-gold-dark transition-all duration-300"
                >
                  Accept All
                </button>
                <button
                  onClick={acceptEssential}
                  className="p-2 text-cream/40 hover:text-cream transition-colors"
                  aria-label="Dismiss"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
