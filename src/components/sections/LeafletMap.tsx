"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { PROPERTIES } from "@/lib/constants";

const GOLD = "#C2A46D";
const CREAM = "#F7F1E3";

const markerIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:36px;height:44px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="${GOLD}" stroke="${CREAM}" stroke-width="2"/>
        <circle cx="18" cy="18" r="7" fill="${CREAM}"/>
      </svg>
    </div>`,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
  popupAnchor: [0, -40],
});

const mappedProperties = PROPERTIES.filter(
  (p) => p.coordinates && p.coordinates.lat !== undefined
);

export function LeafletMap() {
  const bounds = L.latLngBounds(
    mappedProperties.map(
      (p) => [p.coordinates.lat, p.coordinates.lng] as [number, number]
    )
  );

  return (
    <MapContainer
      bounds={bounds}
      scrollWheelZoom={false}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mappedProperties.map((property) => (
        <Marker
          key={property.id}
          position={[property.coordinates.lat, property.coordinates.lng]}
          icon={markerIcon}
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
                View Property
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
