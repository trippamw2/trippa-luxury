import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy | Kivara",
  description: "Details of cookies used on kivara.africa, their purposes, and your choices.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CookiePage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-heading font-medium text-soft-black mb-4">
            Cookie Policy
          </h1>
          <p className="text-earth text-lg">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="space-y-8 text-earth leading-relaxed">
          <section>
            <h2 className="text-2xl font-heading font-medium text-soft-black mb-4">
              Overview
            </h2>
            <p>
              This Cookie Policy explains how Kivara uses cookies and similar technologies on kivara.africa. Essential
              cookies are required for core functionality. Analytics cookies are only loaded if you explicitly consent to
              them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-medium text-soft-black mb-4">
              Consent
            </h2>
              <p>
                We store your consent preference in your browser under the key{" "}
                <code className="text-sm">kivara-cookie-consent</code>: either{" "}
                <code className="text-sm">&ldquo;essential&rdquo;</code> or{" "}
                <code className="text-sm">&ldquo;all&rdquo;</code>. You can change your
                preference at any time via the cookie banner.
              </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-medium text-soft-black mb-4">
              Cookies We Use
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-earth/30">
                    <th className="py-2 pr-4 font-medium text-soft-black">Name</th>
                    <th className="py-2 pr-4 font-medium text-soft-black">Category</th>
                    <th className="py-2 pr-4 font-medium text-soft-black">Purpose</th>
                    <th className="py-2 pr-4 font-medium text-soft-black">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-earth/20">
                    <td className="py-2 pr-4">kivara-cookie-consent</td>
                    <td className="py-2 pr-4">Essential</td>
                    <td className="py-2 pr-4">Remembers your cookie consent choice</td>
                    <td className="py-2 pr-4">Persistent (localStorage)</td>
                  </tr>
                  <tr className="border-b border-earth/20">
                    <td className="py-2 pr-4">sb-* (Supabase)</td>
                    <td className="py-2 pr-4">Essential</td>
                    <td className="py-2 pr-4">Authentication and session management for admin/portal</td>
                    <td className="py-2 pr-4">Session-based</td>
                  </tr>
                  <tr className="border-b border-earth/20">
                    <td className="py-2 pr-4">_ga, _ga_*</td>
                    <td className="py-2 pr-4">Analytics</td>
                    <td className="py-2 pr-4">Google Analytics 4 (only when consent=&ldquo;all&rdquo;)</td>
                    <td className="py-2 pr-4">2 years / per Google policy</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">
              Analytics cookies are not set until you grant consent. If you choose &ldquo;Essential Only&rdquo;, no
              analytics scripts are loaded.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-medium text-soft-black mb-4">
              Managing Cookies
            </h2>
            <p>
              Most browsers allow you to block or delete cookies. Refer to your browser&apos;s help documentation. Note
              that disabling essential cookies may affect site functionality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-heading font-medium text-soft-black mb-4">
              Contact
            </h2>
            <p>
              For questions about this Cookie Policy, email{" "}
              <a href="mailto:concierge@kivara.africa" className="text-gold-dark hover:text-gold underline">
                concierge@kivara.africa
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
