import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | Kivara",
  description: "Kivara Luxury Travel Terms and Conditions. Please read these terms carefully before booking your journey.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <>
      <section className="relative h-[40vh] min-h-[320px] w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
            Legal
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-cream leading-tight">
            Terms & Conditions
          </h1>
          <p className="mt-3 text-sm text-cream/60 max-w-lg">
            Please read these terms carefully before booking your journey with us.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-3xl mx-auto px-6">
          <div className="prose prose-sm md:prose-base max-w-none text-earth leading-relaxed space-y-8">
            <p className="text-sm text-earth/60">Last updated: May 2026</p>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">1. Introduction</h2>
              <p>These Terms and Conditions govern your use of the Kivara website and the booking of any travel services through Kivara Luxury Travel (&ldquo;Kivara,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing our website or making a booking, you agree to be bound by these terms.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">2. Booking and Payment</h2>
              <p>All bookings are subject to availability and confirmation. A non-refundable deposit of 30% is required to secure your reservation. The balance must be paid no later than 60 days prior to departure. For bookings made within 60 days of travel, full payment is required at the time of booking.</p>
              <p className="mt-3">Payments can be made via bank transfer, credit card, or PayPal. All prices are quoted in US Dollars unless otherwise stated.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">3. Cancellation Policy</h2>
              <p>Cancellation must be made in writing. The following charges apply:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>More than 60 days before departure: Loss of deposit</li>
                <li>30&ndash;60 days before departure: 50% of total cost</li>
                <li>Less than 30 days before departure: 100% of total cost</li>
              </ul>
              <p className="mt-3">We strongly recommend purchasing comprehensive travel insurance at the time of booking.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">4. Amendments</h2>
              <p>Any changes to your booking after confirmation will incur an administration fee of $100 per change, plus any costs imposed by our suppliers. Changes must be requested in writing at least 14 days before departure.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">5. Travel Insurance</h2>
              <p>Comprehensive travel insurance is mandatory for all Kivara journeys. Insurance must cover medical expenses, repatriation, cancellation, and baggage loss. Kivara is not responsible for any losses arising from inadequate insurance coverage.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">6. Passports and Visas</h2>
              <p>It is your responsibility to ensure you have a valid passport (with at least six months validity beyond your travel dates) and any necessary visas for your destinations. Kivara can provide guidance but accepts no liability for visa refusals or entry denials.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">7. Health and Safety</h2>
              <p>You should consult your doctor or a travel clinic regarding recommended vaccinations and malaria prophylaxis for your destinations. Kivara is not liable for any illness or injury sustained during your journey.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">8. Limitation of Liability</h2>
              <p>Kivara acts as a booking agent for independent suppliers including lodges, airlines, and activity providers. While we carefully select our partners, we cannot be held liable for any acts or omissions of these third parties. Our total liability is limited to the amount paid for your booking.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">9. Force Majeure</h2>
              <p>Kivara shall not be liable for any delay or failure to perform resulting from circumstances outside our reasonable control, including but not limited to natural disasters, pandemics, political unrest, strikes, or adverse weather conditions.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">10. Governing Law</h2>
              <p>These terms are governed by the laws of the Republic of South Africa. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Cape Town, South Africa.</p>
            </div>

            <div>
              <h2 className="text-xl font-heading font-medium text-soft-black mb-3">11. Contact</h2>
              <p>For questions about these terms, please contact us at <a href="mailto:concierge@kivara.com" className="text-gold hover:text-gold-dark">concierge@kivara.com</a> or via our <a href="/contact" className="text-gold hover:text-gold-dark">contact page</a>.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
