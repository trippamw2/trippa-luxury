"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import {
  DESTINATION_LABELS,
  MOVEMENT_LABELS,
  NETWORK_STOPS,
  type RouteStop,
} from "@/lib/journey-routes";

const GOLD = "#C2A46D";
const GOLD_DARK = "#8F6B35";
const CREAM = "#F7F1E3";
const INK = "#1E1B16";

/** Southern & eastern Africa viewport : the map can never zoom out to show the whole continent. */
const SOUTH_EAST_AFRICA: [[number, number], [number, number]] = [
  [-35, 18],
  [5, 46],
];

/** Marker per route stop : numbered, styled by kind. */
function stopIcon(stop: RouteStop, index: number): L.DivIcon {
  const number = String(index + 1);
  const kindStyle: Record<string, { bg: string; border: string; color: string; shape: string }> = {
    gateway: { bg: CREAM, border: GOLD, color: GOLD_DARK, shape: "circle" },
    stay: { bg: GOLD, border: CREAM, color: INK, shape: "circle" },
    experience: { bg: INK, border: GOLD, color: GOLD, shape: "diamond" },
    departure: { bg: CREAM, border: INK, color: GOLD_DARK, shape: "circle" },
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

  const glyph =
    stop.kind === "gateway" || stop.kind === "departure" ? "&#9992;" : number; // ✈ for airports

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

/** Muted marker for the network context layer : airports as small planes, properties as dots. */
function contextIcon(stop: RouteStop): L.DivIcon {
  const isAirport = stop.kind === "gateway";
  const size = isAirport ? 26 : 16;
  const html = isAirport
    ? `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:rgba(247,241,227,0.9);border:1.5px solid rgba(194,164,109,0.75);display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(143,107,53,0.85);box-shadow:0 2px 6px rgba(0,0,0,0.3);">&#9992;</div>`
    : `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:rgba(194,164,109,0.9);border:1.5px solid rgba(247,241,227,0.85);box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

interface JourneyRouteMapProps {
  stops: RouteStop[];
  /** Muted context layer shown under the active route ; defaults to the full airport + property network. */
  contextStops?: RouteStop[];
}

export function JourneyRouteMap({
  stops,
  contextStops = NETWORK_STOPS,
}: JourneyRouteMapProps) {
  if (stops.length < 2) return null;

  const activeIds = new Set(stops.map((s) => s.id));
  const context = contextStops.filter((s) => !activeIds.has(s.id));

  // Fit the map to the ACTIVE ROUTE (arrival → locations → departure) so it stays
  // zoomed on the region ; the network context stays on the map but is pannable.
  const bounds = L.latLngBounds(
    stops.map((s) => [s.lat, s.lng] as [number, number])
  ).pad(0.12);

  return (
    <MapContainer
      bounds={bounds}
      minZoom={6}
      maxBounds={SOUTH_EAST_AFRICA}
      maxBoundsViscosity={0.8}
      scrollWheelZoom={false}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Network context layer : every airport and property, muted. */}
      {context.map((stop) => (
        <Marker
          key={`ctx-${stop.id}`}
          position={[stop.lat, stop.lng]}
          icon={contextIcon(stop)}
          zIndexOffset={-1000}
        >
          <Popup>
            <div className="text-left" style={{ minWidth: 170 }}>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-[#B08A4D]">
                {stop.destination
                  ? (DESTINATION_LABELS[stop.destination] ?? "Destination")
                  : stop.kind === "gateway"
                    ? "Airport"
                    : "Property"}
              </span>
              <span className="block font-heading text-[14px] font-medium text-[#1E1B16] mt-0.5">
                {stop.label}
              </span>
              {stop.sublabel && (
                <span className="block text-xs text-[#7A6F5D] mt-0.5">
                  {stop.sublabel}
                </span>
              )}
              {stop.href && (
                <Link
                  href={stop.href}
                  className="mt-2 inline-block text-xs font-medium uppercase tracking-widest text-[#B08A4D] hover:text-[#8F6B35] transition-colors"
                >
                  View Property
                </Link>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
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
          zIndexOffset={1000}
        >
          <Popup>
            <div className="text-left" style={{ minWidth: 190 }}>
              <span className="block text-[10px] font-medium uppercase tracking-widest text-[#B08A4D]">
                {stop.kind === "gateway"
                  ? "Arrival Gateway"
                  : stop.kind === "departure"
                    ? "Departure Point"
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
                  {stop.kind === "departure" ? "Depart by " : "Arrive by "}
                  {MOVEMENT_LABELS[stop.arrival]}
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
