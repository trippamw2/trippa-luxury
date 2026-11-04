import { serializeJsonLd } from "@/lib/json-ld";

type FaqItem = {
  question: string;
  answer: string;
};

export function FaqJsonLd({ items }: { items: FaqItem[] }) {
  if (!items.length) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }),
      }}
    />
  );
}
