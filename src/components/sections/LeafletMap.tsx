"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { PROPERTIES } from "@/lib/constants";
import { AIRPORTS, DESTINATION_BOUNDARIES } from "@/lib/journey-routes";

// ─── Brand colors ─────────────────────────────────────────────────────────
const GOLD = "#C2A46D";
const CREAM = "#F7F1E3";
const BLUE = "#6BA3C0"; // airport markers

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

// ─── Fit bounds to all destinations ───────────────────────────────────────
const allBoundaryPoints = DESTINATION_BOUNDARIES.flatMap((b) => b.positions);

function FitBounds() {
  const map = useMap();
  map.whenReady(() => {
    const bounds = L.latLngBounds(allBoundaryPoints as [number, number][]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  });
  return null;
}

// ─── Legend ────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div
      className="absolute bottom-4 left-4 z-[1000] bg-cream/95 backdrop-blur-sm p-4 border border-sand-light/30 shadow-lg"
      style={{ fontSize: "11px", lineHeight: "1.6" }}
    >
      <p className="font-medium text-soft-black tracking-widest uppercase text-[10px] mb-2">
        Map Legend
      </p>
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block w-3 h-3 rounded-full border-2"
          style={{ background: GOLD, borderColor: CREAM }}
        />
        <span className="text-earth">Property</span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="inline-block w-3 h-3 rounded-full border-2"
          style={{ background: BLUE, borderColor: CREAM }}
        />
        <span className="text-earth">Airport</span>
      </div>
      <div className="mt-2 pt-2 border-t border-sand-light/40">
        <p className="text-[10px] text-earth/70 mb-1">Destination Areas</p>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#4A90A4" }} />
          <span className="text-earth">Lake Malawi</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#D4956A" }} />
          <span className="text-earth">South Luangwa</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: "#E07A5F" }} />
          <span className="text-earth">Zanzibar</span>
        </div>
      </div>
    </div>
  );
}

// ─── Zoom Control ──────────────────────────────────────────────────────────
function CustomZoomControl() {
  const map = useMap();
  return (
    <div className="absolute right-4 bottom-4 z-[1000] flex flex-col gap-1">
      <button
        className="w-10 h-10 bg-cream/90 backdrop-blur-sm border border-sand-light/30 shadow-lg hover:bg-gold hover:border-gold transition-all duration-300 flex items-center justify-center text-earth-light hover:text-soft-black"
        onClick={() => map.zoomIn()}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        className="w-10 h-10 bg-cream/90 backdrop-blur-sm border border-sand-light/30 shadow-lg hover:bg-gold hover:border-gold transition-all duration-300 flex items-center justify-center text-earth-light hover:text-soft-black"
        onClick={() => map.zoomOut()}
        aria-label="Zoom out"
      >
        −
      </button>
    </div>
  );
}

// ─── Destination labels (hidden — only Kivara context shows on map) ──────

export function LeafletMap() {
  return (
    <MapContainer
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-full w-full z-0"
      style={{ background: "#1a1a1a" }}
    >
      <FitBounds />
      <CustomZoomControl />

      {/* Dark elegant base tiles — luxury aesthetic (no non-Kivara attribution) */}
      <TileLayer
        attribution=""
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Destination boundary polygons */}
      {DESTINATION_BOUNDARIES.map((boundary) => (
        <Polygon
          key={boundary.destination}
          positions={boundary.positions}
          pathOptions={{
            color: boundary.color,
            fillColor: boundary.color,
            fillOpacity: 0.08,
            weight: 2,
            dashArray: "6 4",
            opacity: 0.6,
          }}
        />
      ))}

      {/* Destination labels (hidden — no non-Kivara text on map) */}

      {/* Property markers (gold pins) */}
      {PROPERTIES.filter((p) => p.coordinates).map((property) => (
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
      {Object.values(AIRPORTS).map((airport) => (
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

      <Legend />
    </MapContainer>
  );
}
