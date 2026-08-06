"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { MOVEMENT_LABELS, type RouteStop } from "@/lib/journey-routes";

const GOLD = "#C2A46D";
const GOLD_DARK = "#8F6B35";
const CREAM = "#F7F1E3";
const INK = "#1E1B16";

/** Marker per route stop : numbered, styled by kind. */
function stopIcon(stop: RouteStop, index: number): L.DivIcon {
  const number = String(index + 1);
  const kindStyle: Record<string, { bg: string; border: string; color: string; shape: string }> = {
    gateway: { bg: CREAM, border: GOLD, color: GOLD_DARK, shape: "circle" },
    stay: { bg: GOLD, border: CREAM, color: INK, shape: "circle" },
    experience: { bg: INK, border: GOLD, color: GOLD, shape: "diamond" },
  };
  const style = kindStyle[stop.kind] ?? kindStyle.stay;

  const shapeCss =
    style.shape === "diamond"
      ? "transform:rotate(45deg);border-radius:4px;"
      : "border-radius:9999px;";

  const innerCss =
    style.shape === "diamond"
      ? "transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;"
      : "display:flex;align-items:center;justify-content:center;";

  const glyph = stop.kind === "gateway" ? "&#9992;" : number; // ✈ for gateways

  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:36px;height:36px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
        <div style="position:absolute;inset:0;background:${style.bg};border:2px solid ${style.border};${shapeCss}">
          <div style="width:100%;height:100%;${innerCss};font-family:Georgia,serif;font-size:13px;font-weight:600;color:${style.color};">${glyph}</div>
        </div>
        <div style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;border-radius:9999px;background:${GOLD_DARK};border:1.5px solid ${CREAM};color:${CREAM};font-size:9px;font-weight:600;display:flex;align-items:center;justify-content:center;font-family:Georgia,serif;">${number}</div>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

export function JourneyRouteMap({ stops }: { stops: RouteStop[] }) {
  if (stops.length < 2) return null;

  const bounds = L.latLngBounds(
    stops.map((s) => [s.lat, s.lng] as [number, number])
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
      <Polyline
        positions={stops.map((s) => [s.lat, s.lng] as [number, number])}
        pathOptions={{
          color: GOLD,
          weight: 2.5,
          dashArray: "6 8",
          opacity: 0.9,
        }}
      />
      {stops.map((stop, index) => (
        <Marker
          key={stop.id}
          position={[stop.lat, stop.lng]}
          icon={stopIcon(stop, index)}
        >
          <Popup>
            <div className="text-left" style={{ minWidth: 190 }}>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-[#B08A4D]">
                {stop.kind === "gateway"
                  ? "Arrival Gateway"
                  : stop.kind === "experience"
                    ? "Signature Experience"
                    : `Stay ${String(index + 1).padStart(2, "0")}`}
              </span>
              <span className="block font-heading text-[15px] font-medium text-[#1E1B16] mt-0.5">
                {stop.label}
              </span>
              {stop.sublabel && (
                <span className="block text-xs text-[#7A6F5D] mt-0.5">
                  {stop.sublabel}
                </span>
              )}
              {stop.arrival && (
                <span className="block text-xs text-[#7A6F5D] mt-1">
                  Arrive by {MOVEMENT_LABELS[stop.arrival]}
                </span>
              )}
              {stop.href && (
                <Link
                  href={stop.href}
                  className="mt-2 inline-block text-xs font-medium uppercase tracking-widest text-[#B08A4D] hover:text-[#8F6B35] transition-colors"
                >
                  {stop.kind === "stay" ? "View Property" : "Explore"}
                </Link>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
