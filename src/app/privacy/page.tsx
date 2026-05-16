import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Kivara",
  description: "Kivara Luxury Travel Privacy Policy. How we collect, use, and protect your personal information.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[320px] w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
            Legal
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-cream leading-tight">
            Privacy Policy
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-3xl mx-auto px-6">
          <div className="prose prose-sm md:prose-base max-w-none text-earth leading-relaxed space-y-8">
            <p className="text-sm text-earth/60">
              Last updated: May 15, 2026
            </p>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">1. Introduction</h2>
              <p>
                Kivara Luxury Travel (&ldquo;Kivara,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at kivara.luxury.
              </p>
              <p className="mt-3">
                We are a South African luxury travel company. By using our website and services, you consent to the practices described in this policy.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">2. Information We Collect</h2>
              <p>We may collect the following categories of personal information:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1.5 text-earth">
                <li><strong>Identity Data:</strong> name, title, and other identifiers you provide via our contact or booking forms.</li>
                <li><strong>Contact Data:</strong> email address, phone number, and mailing address.</li>
                <li><strong>Booking Data:</strong> travel preferences, passport details, dietary requirements, special occasions, and any other information you share with us to curate your journey.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, and browsing behavior through cookies and similar technologies.</li>
                <li><strong>Communication Data:</strong> records of your correspondence with our concierge team, including WhatsApp messages and emails.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">3. How We Use Your Information</h2>
              <p>We use your personal information for the following purposes:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1.5 text-earth">
                <li>To respond to your inquiries and provide personalized travel curation</li>
                <li>To process bookings, payments, and travel arrangements</li>
                <li>To communicate with you about your journey, including pre-travel and post-travel correspondence</li>
                <li>To send you marketing communications (with your consent) about our destinations, packages, and special offers</li>
                <li>To improve our website, services, and customer experience</li>
                <li>To comply with legal obligations and protect our rights</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">4. Legal Basis for Processing (GDPR)</h2>
              <p>
                If you are in the European Economic Area (EEA), United Kingdom, or Switzerland, our processing of your personal data is based on the following lawful grounds:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1.5 text-earth">
                <li><strong>Consent:</strong> Where you have given explicit consent for marketing communications.</li>
                <li><strong>Contractual Necessity:</strong> To fulfill our obligations under a booking or service agreement.</li>
                <li><strong>Legitimate Interests:</strong> To improve our services, maintain website security, and respond to inquiries.</li>
                <li><strong>Legal Obligation:</strong> To comply with applicable laws and regulations.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">5. Data Sharing & Third Parties</h2>
              <p>
                We never sell your personal information. We may share your data with trusted third parties solely for the purpose of delivering your travel experience:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1.5 text-earth">
                <li>Lodges, camps, and property partners to secure your accommodations</li>
                <li>Domestic airlines and transfer operators for your ground and air transport</li>
                <li>Payment processors for secure transaction handling</li>
                <li>Email service providers (Brevo) for communications</li>
                <li>Analytics providers to improve our website performance</li>
              </ul>
              <p className="mt-3">
                All third-party partners are contractually bound to protect your data and may only use it for the specific service they provide.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">6. International Transfers</h2>
              <p>
                As a South African company serving global clients, your personal data may be transferred to and processed in countries outside your country of residence, including South Africa and Zambia. When transferring data from the EEA or UK, we ensure appropriate safeguards are in place, including Standard Contractual Clauses where required.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">7. Data Retention</h2>
              <p>
                We retain your personal data only as long as necessary to fulfill the purposes for which it was collected, including legal, accounting, or reporting requirements. Booking-related data is retained for five years after your journey. Marketing data is retained until you withdraw consent.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">8. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the following rights regarding your personal data:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1.5 text-earth">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal obligations)</li>
                <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service provider</li>
                <li><strong>Objection:</strong> Object to processing based on legitimate interests or direct marketing</li>
                <li><strong>Withdrawal of Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, please contact us at <a href="mailto:concierge@kivara.luxury" className="text-gold-dark hover:text-gold transition-colors underline">concierge@kivara.luxury</a>.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">9. Cookies</h2>
              <p>
                Our website uses cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic, and provide personalized content. You can control cookie preferences through your browser settings. Essential cookies are required for the website to function properly; analytics and marketing cookies require your consent.
              </p>
              <p className="mt-2">
                Third-party cookies we may use include analytics providers (to understand how visitors interact with our site) and social media platforms (for integrated sharing features).
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">10. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. These include SSL encryption, secure data storage, access controls, and regular security assessments.
              </p>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your data rights, please contact our Data Protection Officer:
              </p>
              <div className="mt-3 p-6 bg-warm-white border border-sand-light/30">
                <p className="text-sm"><strong>Kivara Luxury Travel</strong></p>
                <p className="text-sm text-earth mt-1">Cape Town, South Africa</p>
                <p className="text-sm text-earth mt-1">
                  Email: <a href="mailto:concierge@kivara.luxury" className="text-gold-dark hover:text-gold transition-colors">concierge@kivara.luxury</a>
                </p>
                <p className="text-sm text-earth mt-1">
                  Phone: {process.env.NEXT_PUBLIC_SITE_PHONE || "+27 87 123 4567"}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-xl md:text-2xl font-heading font-medium text-soft-black mb-3">12. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Material changes will be notified via our website or by email. We encourage you to review this policy periodically.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
