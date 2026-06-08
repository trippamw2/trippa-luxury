type ProductJsonLdProps = {
  name: string;
  description: string;
  image?: string;
  offers?: {
    priceCurrency?: string;
    price?: string;
    availability?: "InStock" | "OutOfStock" | "PreOrder";
    url?: string;
  };
  brand?: string;
  category?: string;
};

export function ProductJsonLd({
  name,
  description,
  image,
  offers,
  brand = "Kivara Luxury Travel",
  category = "Luxury Travel Package",
}: ProductJsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name,
          description,
          image,
          brand: { "@type": "Brand", name: brand },
          category,
          ...(offers && {
            offers: {
              "@type": "Offer",
              priceCurrency: offers.priceCurrency || "USD",
              price: offers.price || "0",
              availability: `https://schema.org/${offers.availability || "InStock"}`,
              url: offers.url,
            },
          }),
        }),
      }}
    />
  );
}
