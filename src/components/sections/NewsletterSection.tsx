"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { Heart, Send, Check } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription failed");
      setStatus("success");
      setEmail("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  return (
    <section className="texture-noise py-24 md:py-32 bg-soft-black relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-[0.04]">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 70% 30%, rgba(201,169,110,0.5) 0%, transparent 50%)`,
          }}
        />
      </div>

      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto text-center"
        >
          <Heart className="w-8 h-8 text-gold/60 mx-auto mb-6" />
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold mb-4">
            Stay Inspired
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-medium text-cream leading-tight mb-4">
            Join the Inner Circle
          </h2>
          <p className="text-base text-earth-light leading-relaxed mb-8">
            Receive travel inspiration, curated offers, and love stories from Africa&apos;s 
            most romantic destinations: delivered to your inbox.
          </p>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="w-full px-5 py-3.5 bg-transparent border border-earth/40 text-cream text-sm placeholder:text-earth/50 focus:outline-none focus:border-gold transition-colors duration-300"
                />
              </div>
              <button
                type="submit"
                disabled={status === "success" || status === "loading"}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gold text-soft-black text-sm font-medium tracking-[0.15em] uppercase hover:bg-gold-dark transition-all duration-500 disabled:opacity-70"
              >
                {status === "loading" ? (
                  <span className="w-4 h-4 border-2 border-soft-black border-t-transparent rounded-full animate-spin" />
                ) : status === "success" ? (
                  <>
                    <Check className="w-4 h-4" />
                    Subscribed
                  </>
                ) : status === "error" ? (
                  <>
                    <span className="w-4 h-4">!</span>
                    Error
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Subscribe
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-4 text-xs text-earth/50">
            No spam. Just beauty. Unsubscribe anytime.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
