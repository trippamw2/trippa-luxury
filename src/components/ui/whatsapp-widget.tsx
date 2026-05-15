"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { SITE_CONFIG } from "@/lib/constants";

export function WhatsAppWidget() {
  // Hide on admin pages
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  const [open, setOpen] = useState(false);

  const message = encodeURIComponent(
    "Hi Trippa! I'm dreaming of an African romance escape and would love some personalized guidance."
  );

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Tooltip */}
      {open && (
        <div className="bg-cream border border-gold/20 shadow-xl rounded-lg p-4 max-w-[260px] animate-fade-in">
          <p className="text-sm text-soft-black font-heading mb-2">
            Let&apos;s craft your perfect escape
          </p>
          <p className="text-xs text-earth leading-relaxed mb-3">
            Our concierge team is ready to help design your dream African journey.
          </p>
          <a
            href={`https://wa.me/${SITE_CONFIG.whatsapp}?text=${message}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors w-full justify-center"
          >
            <MessageCircle className="w-4 h-4" />
            Start Chat
          </a>
        </div>
      )}

      {/* Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-all duration-300 flex items-center justify-center hover:scale-105 active:scale-95"
        aria-label="WhatsApp Concierge"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}
