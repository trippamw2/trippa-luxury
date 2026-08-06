"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";

const faqs = [
  {
    category: "Booking",
    questions: [
      { q: "How do I book a journey with Kivara?", a: "You can book by filling out the inquiry form on our website, emailing concierge@kivara.com, or messaging us on WhatsApp. A member of our concierge team will respond within 24 hours to begin crafting your bespoke itinerary." },
      { q: "What is the booking process?", a: "After your initial inquiry, we will create a personalized itinerary. Once you approve it, we require a 30% deposit to secure your reservation. The balance is due 60 days before departure." },
      { q: "Is a deposit required?", a: "Yes, a non-refundable deposit of 30% is required to confirm all bookings. Full payment is due 60 days prior to travel." },
      { q: "Can I modify my booking after confirmation?", a: "Yes, amendments can be made up to 14 days before departure. A $100 administration fee applies per change, plus any costs from suppliers." },
    ],
  },
  {
    category: "Cancellation & Refunds",
    questions: [
      { q: "What is your cancellation policy?", a: "Cancellations made more than 60 days before departure result in loss of deposit. Between 30 and 60 days, 50% of the total cost is forfeited. Less than 30 days, 100% is forfeited." },
      { q: "Do you offer refunds?", a: "Refunds are processed according to our cancellation policy. We strongly recommend comprehensive travel insurance to cover unforeseen circumstances." },
      { q: "Can I transfer my booking to someone else?", a: "Yes, name changes may be permitted up to 14 days before departure, subject to supplier approval and an administration fee." },
    ],
  },
  {
    category: "Travel & Destinations",
    questions: [
      { q: "Which destinations do you serve?", a: "We specialize in three iconic African destinations: Lake Malawi, South Luangwa (Zambia), and Zanzibar. Our journeys can combine multiple destinations." },
      { q: "What is the best time to travel?", a: "Each destination has its own optimal season. Lake Malawi is best May to November; South Luangwa is excellent June to October; Zanzibar is lovely year-round but peak season is June to October and December to February." },
      { q: "Do I need a visa?", a: "Visa requirements vary by nationality. Our concierge team will advise you on specific visa requirements for your itinerary. You are responsible for obtaining the correct visas." },
    ],
  },
  {
    category: "Health & Safety",
    questions: [
      { q: "Is travel insurance mandatory?", a: "Yes, comprehensive travel insurance covering medical expenses, repatriation, cancellation, and baggage is mandatory for all Kivara journeys." },
      { q: "Are there any health requirements?", a: "We recommend consulting your doctor regarding vaccinations and malaria prophylaxis at least 6 weeks before travel. Your concierge will provide a detailed health briefing." },
    ],
  },
  {
    category: "Sustainability",
    questions: [
      { q: "How does Kivara support conservation?", a: "Every Kivara booking contributes to Conservation South Luangwa for anti-poaching patrols. We partner exclusively with lodges that demonstrate genuine commitment to conservation and community development." },
      { q: "Are the lodges eco-friendly?", a: "All properties in the Kivara collection meet rigorous sustainability standards, including solar power, water conservation, plastic-free initiatives, and local employment practices." },
    ],
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = faqs.map((cat) => ({
    ...cat,
    questions: cat.questions.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.questions.length > 0);

  return (
    <>
      <section className="relative h-[40vh] min-h-[320px] w-full overflow-hidden bg-soft-black">
        <div className="absolute inset-0 bg-gradient-to-br from-soft-black via-soft-black-light to-gold/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-soft-black/60 via-transparent to-soft-black/30" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <span className="inline-block text-xs font-medium tracking-[0.2em] uppercase text-gold-light mb-4">
            Support
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-medium text-cream leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-sm text-cream/60 max-w-lg">
            Everything you need to know about planning your Kivara journey.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-cream">
        <div className="max-w-3xl mx-auto px-6">
          <div className="relative mb-10">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-earth/50" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-sand-light/50 text-sm bg-warm-white focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {filtered.map((category) => (
            <div key={category.category} className="mb-10">
              <h2 className="text-xl font-heading font-medium text-soft-black mb-4">{category.category}</h2>
              <div className="space-y-2">
                {category.questions.map((item, idx) => {
                  const isOpen = openIndex === idx;
                  return (
                    <motion.div key={item.q} className="border border-sand-light/30 bg-warm-white overflow-hidden">
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-soft-black hover:bg-gold/5 transition-colors"
                      >
                        <span>{item.q}</span>
                        <ChevronDown className={`w-4 h-4 text-gold transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 text-sm text-earth leading-relaxed">
                              {item.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-earth text-sm">No questions found matching your search.</p>
            </div>
          )}

          <div className="mt-12 p-8 bg-warm-white border border-sand-light/30 text-center">
            <h3 className="text-lg font-heading font-medium text-soft-black mb-2">Still have questions?</h3>
            <p className="text-sm text-earth mb-4">Our concierge team is here to help.</p>
            <a href="/contact" className="inline-flex px-6 py-3 bg-gold text-soft-black text-sm font-medium tracking-widest uppercase hover:bg-gold-dark transition-all">
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
