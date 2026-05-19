import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <h1 className="text-8xl font-heading font-light text-gold mb-4">404</h1>
        <h2 className="text-2xl font-heading text-soft-black mb-3">The horizon you seek has drifted</h2>
        <p className="text-earth text-sm mb-8 leading-relaxed">
          This page has slipped beyond the edge of our curated world. Perhaps it never existed — or perhaps it awaits discovery elsewhere.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-soft-black text-cream text-sm tracking-widest uppercase hover:bg-soft-black-light transition-colors"
          >
            Return Home
          </Link>
          <Link
            href="/contact"
            className="inline-block px-8 py-3 border border-sand-dark text-soft-black text-sm tracking-widest uppercase hover:bg-warm-white transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
