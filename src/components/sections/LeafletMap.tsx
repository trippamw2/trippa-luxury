"use client";

import L from "leaflet";
import { MapContainer, Marker, Popup, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { PROPERTIES } from "@/lib/constants";
import { AIRPORTS, DESTINATION_BOUNDARIES } from "@/lib/journey-routes";
import { useEffect } from "react";

// ─── Brand colors ─────────────────────────────────────────────────────────
const GOLD = "#C2A46D";
const CREAM = "#F7F1E3";
const BLUE = "#6BA3C0";

// ─── Property marker (gold pin) ───────────────────────────────────────────
const propertyIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:32px;height:40px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4));">
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="${GOLD}" stroke="${CREAM}" stroke-width="1.5"/>
        <circle cx="16" cy="16" r="6" fill="${CREAM}"/>
      </svg>
    </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -36],
});

// ─── Airport marker (blue circle with plane glyph) ───────────────────────
const airportIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:28px;height:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="12" fill="${BLUE}" stroke="${CREAM}" stroke-width="1.5"/>
        <path d="M14 7l-2 5h4l-2-5zM10 12l-4 2 4 1v-3zM18 12v3l4-1-4-2zM9 16l-2 5 4-2-2-3zM19 16l-2 3 4 2-2-5z" fill="${CREAM}" opacity="0.9"/>
      </svg>
    </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -24],
});

// ─── Fit bounds to specific points ───────────────────────────────────────
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points as [number, number][]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 9 });
    // Fix for blank map: invalidate size after mount
    setTimeout(() => map.invalidateSize(), 100);
  }, [map, points]);
  return null;
}

// ─── Zoom Control ──────────────────────────────────────────────────────────
function CustomZoomControl() {
  const map = useMap();
  return (
    <div className="absolute right-3 bottom-3 z-[1000] flex flex-col gap-1">
      <button
        className="w-9 h-9 bg-cream/90 backdrop-blur-sm border border-sand-light/30 shadow-lg hover:bg-gold hover:border-gold transition-all duration-300 flex items-center justify-center text-earth-light hover:text-soft-black text-lg font-medium"
        onClick={() => map.zoomIn()}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        className="w-9 h-9 bg-cream/90 backdrop-blur-sm border border-sand-light/30 shadow-lg hover:bg-gold hover:border-gold transition-all duration-300 flex items-center justify-center text-earth-light hover:text-soft-black text-lg font-medium"
        onClick={() => map.zoomOut()}
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  );
}

// ─── Map background (dark luxury gradient via CSS) ────────────────────────
const mapContainerClass =
  "h-full w-full z-0 luxury-map-bg";

// ─── Props ─────────────────────────────────────────────────────────────────
interface LeafletMapProps {
  /** When provided, focuses on this destination + its properties/airports */
  destinationId?: string;
  /** When provided, highlights this property on the map */
  propertyId?: string;
  /** Show all destinations (default: true when no destinationId/propertyId) */
  showAll?: boolean;
}

export function LeafletMap({
  destinationId,
  propertyId,
  showAll = true,
}: LeafletMapProps) {
  // Determine which boundaries to show
  const boundaries = destinationId
    ? DESTINATION_BOUNDARIES.filter((b) => b.destination === destinationId)
    : showAll
      ? DESTINATION_BOUNDARIES
      : [];

  // Determine which properties to show
  const properties = destinationId
    ? PROPERTIES.filter((p) => p.destination === destinationId && p.coordinates)
    : showAll
      ? PROPERTIES.filter((p) => p.coordinates)
      : propertyId
        ? PROPERTIES.filter((p) => p.id === propertyId && p.coordinates)
        : PROPERTIES.filter((p) => p.coordinates);

  // Determine which airports to show
  const airports = destinationId
    ? Object.values(AIRPORTS).filter((a) => a.destination === destinationId)
    : showAll
      ? Object.values(AIRPORTS)
      : [];

  // Collect all points for FitBounds
  const allPoints: [number, number][] = [
    ...boundaries.flatMap((b) => b.positions),
    ...properties.map((p) => [p.coordinates.lat, p.coordinates.lng] as [number, number]),
    ...airports.map((a) => [a.lat, a.lng] as [number, number]),
  ];

  // If focusing on a single property, center on it with padding
  const focusPoints: [number, number][] =
    propertyId && !destinationId
      ? properties
          .filter((p) => p.id === propertyId)
          .map((p) => [p.coordinates.lat, p.coordinates.lng] as [number, number])
      : allPoints;

  return (
    <MapContainer
      scrollWheelZoom={false}
      zoomControl={false}
      center={[-13.0, 34.0]}
      zoom={6}
      className={mapContainerClass}
      style={{ height: "100%", width: "100%", background: "#1a1a1a" }}
    >
      <FitBounds points={focusPoints.length > 0 ? focusPoints : allPoints} />
      <CustomZoomControl />

      {/* Destination boundary polygons */}
      {boundaries.map((boundary) => (
        <Polygon
          key={boundary.destination}
          positions={boundary.positions}
          pathOptions={{
            color: boundary.color,
            fillColor: boundary.color,
            fillOpacity: 0.1,
            weight: 2,
            dashArray: "6 4",
            opacity: 0.7,
          }}
        />
      ))}

      {/* Property markers (gold pins) */}
      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.coordinates.lat, property.coordinates.lng]}
          icon={propertyIcon}
        >
          <Popup>
            <div className="text-left" style={{ minWidth: 180 }}>
              <span className="block font-heading text-[15px] font-medium text-[#1E1B16]">
                {property.name}
              </span>
              <span className="block text-xs text-[#7A6F5D] mt-0.5">
                {property.location}
              </span>
              <Link
                href={`/properties/${property.id}`}
                className="mt-2 inline-block text-xs font-medium uppercase tracking-widest text-[#B08A4D] hover:text-[#8F6B35] transition-colors"
              >
                Explore Sanctuary
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Airport markers (blue) */}
      {airports.map((airport) => (
        <Marker
          key={airport.id}
          position={[airport.lat, airport.lng]}
          icon={airportIcon}
        >
          <Popup>
            <div className="text-left" style={{ minWidth: 160 }}>
              <span className="block font-heading text-[15px] font-medium text-[#1E1B16]">
                {airport.label}
              </span>
              <span className="block text-xs text-[#7A6F5D] mt-0.5">
                {airport.sublabel}
              </span>
              <span className="mt-1.5 inline-block text-[10px] font-medium uppercase tracking-widest text-[#6BA3C0]">
                Arrival Gateway
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
