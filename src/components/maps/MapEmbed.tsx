import { cn } from "@/lib/utils";

interface MapEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  title?: string;
  className?: string;
}

/**
 * Google Maps embed (no API key required) via the public `output=embed` endpoint.
 * Server-safe: plain iframe, lazy-loaded below the fold.
 */
export function MapEmbed({
  lat,
  lng,
  zoom = 12,
  title = "Location map",
  className,
}: MapEmbedProps) {
  const src = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div className={cn("relative w-full overflow-hidden", className)}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );
}
