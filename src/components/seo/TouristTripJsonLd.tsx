type ItineraryItem = {
  day: number;
  title: string;
  description: string;
};

type TouristTripJsonLdProps = {
  name: string;
  description: string;
  duration: string;
  image?: string;
  itinerary?: ItineraryItem[];
  destination?: string[];
};

export function TouristTripJsonLd({
  name,
  description,
  duration,
  image,
  itinerary,
  destination,
}: TouristTripJsonLdProps) {
  const trip = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name,
    description,
    image,
    touristType: "Couple, Honeymoon",
    itinerary: itinerary
      ? {
          "@type": "ItemList",
          itemListElement: itinerary.map((day, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: day.title,
              description: day.description,
            },
          })),
        }
      : undefined,
    ...(destination && {
      touristAttraction: destination.map((d) => ({
        "@type": "TouristAttraction",
        name: d,
      })),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(trip) }}
    />
  );
}
