import { PROPERTIES, EXPERIENCES } from "@/lib/constants";

/**
 * Journey route model : how a guest physically moves through a journey.
 * A route is an ordered list of stops (arrival gateway → stays → experiences),
 * each tagged with the transport mode used to ARRIVE at it from the previous stop.
 */

export type RouteStopKind = "gateway" | "stay" | "experience" | "departure";
export type MovementMode = "fly" | "drive" | "boat";

export interface RouteStop {
  id: string;
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
  kind: RouteStopKind;
  /** Link target shown in the popup, when applicable. */
  href?: string;
  /** How the traveller arrives at this stop from the previous one. */
  arrival?: MovementMode;
  /** Destination slug the point belongs to (shown on network context layers). */
  destination?: string;
}

export interface DestinationRoute {
  destination: string;
  destinationLabel: string;
  stops: RouteStop[];
}

export const DESTINATION_LABELS: Record<string, string> = {
  "lake-malawi": "Lake Malawi",
  "south-luangwa": "South Luangwa",
  "zanzibar": "Zanzibar",
};

export const ARRIVAL_GATEWAYS: Record<string, RouteStop> = {
  "lake-malawi": {
    id: "llw",
    label: "Lilongwe",
    sublabel: "Kamuzu International Airport (LLW)",
    lat: -13.789,
    lng: 33.781,
    kind: "gateway",
  },
  "south-luangwa": {
    id: "mfu",
    label: "Mfuwe",
    sublabel: "Mfuwe Airport (MFU)",
    lat: -13.255,
    lng: 31.936,
    kind: "gateway",
  },
  "zanzibar": {
    id: "znz",
    label: "Zanzibar",
    sublabel: "Abeid Amani Karume Intl (ZNZ)",
    lat: -6.222,
    lng: 39.225,
    kind: "gateway",
  },
};

export const MOVEMENT_LABELS: Record<MovementMode, string> = {
  fly: "Private flight",
  drive: "Road transfer",
  boat: "Boat transfer",
};

/** How the guest leaves the gateway for the first stay of each destination. */
const GATEWAY_ARRIVAL: Record<string, MovementMode> = {
  "lake-malawi": "fly",
  "south-luangwa": "fly",
  "zanzibar": "drive",
};

/** How the guest moves between stays within a single destination. */
const STAY_TO_STAY: Record<string, MovementMode> = {
  "lake-malawi": "boat",
  "south-luangwa": "drive",
  "zanzibar": "drive",
};

const propertyById = (id: string) => PROPERTIES.find((p) => p.id === id);

function stayStop(propertyId: string): RouteStop | null {
  const p = propertyById(propertyId);
  if (!p?.coordinates) return null;
  return {
    id: p.id,
    label: p.name,
    sublabel: p.location,
    lat: p.coordinates.lat,
    lng: p.coordinates.lng,
    kind: "stay",
    href: `/properties/${p.id}`,
    destination: p.destination,
  };
}

/**
 * Assemble the ordered route stops for an ordered list of destinations and
 * property ids. Each destination contributes its gateway followed by its
 * properties (in the given order). Between destinations the guest flies.
 */
function assembleStops(destinations: string[], propertyIds: string[]): RouteStop[] {
  const stops: RouteStop[] = [];
  destinations.forEach((dest, destIndex) => {
    const gateway = ARRIVAL_GATEWAYS[dest];
    if (!gateway) return;
    // Reaching a second (or later) destination means flying from the previous one.
    stops.push(destIndex === 0 ? { ...gateway } : { ...gateway, arrival: "fly" });

    const destProperties = propertyIds.filter((pid) => propertyById(pid)?.destination === dest);
    destProperties.forEach((pid, idx) => {
      const stop = stayStop(pid);
      if (!stop) return;
      stops.push({
        ...stop,
        arrival: idx === 0 ? GATEWAY_ARRIVAL[dest] : STAY_TO_STAY[dest],
      });
    });
  });
  return stops;
}

/**
 * Route for a single journey package : every destination in travel order,
 * gateway first, then its stays, with movement modes between stops.
 */
export function buildPackageStops(pkg: { destinations: string[]; properties: string[] }): RouteStop[] {
  return assembleStops(pkg.destinations, pkg.properties);
}

/**
 * Routes for a whole collection, one per destination covered by the collection's
 * packages. Each route shows the gateway plus every property the collection uses
 * in that destination : "all locations of the destination on one map".
 */
export function buildCollectionRoutes(
  collectionId: string,
  packages: { collection?: string; destinations: string[]; properties: string[] }[]
): DestinationRoute[] {
  const collectionPackages = packages.filter((pkg) => pkg.collection === collectionId);

  const destinations: string[] = [];
  const propertyIds: string[] = [];
  for (const pkg of collectionPackages) {
    for (const dest of pkg.destinations) {
      if (!destinations.includes(dest)) destinations.push(dest);
    }
    for (const pid of pkg.properties) {
      if (!propertyIds.includes(pid)) propertyIds.push(pid);
    }
  }

  return destinations.map((dest) => {
    const destPropertyIds = propertyIds.filter((pid) => propertyById(pid)?.destination === dest);
    return {
      destination: dest,
      destinationLabel: DESTINATION_LABELS[dest] ?? dest,
      stops: assembleStops([dest], destPropertyIds),
    };
  });
}

/**
 * Route for a signature experience : the destination's gateway, every property
 * of that destination, then the experience itself as the final stop.
 */
export function buildExperienceStops(experience: { id: string }): RouteStop[] {
  const exp = EXPERIENCES.find((e) => e.id === experience.id);
  if (!exp?.destination || !exp.coordinates) return [];

  const dest = exp.destination;
  const gateway = ARRIVAL_GATEWAYS[dest];
  if (!gateway) return [];
  const stops: RouteStop[] = [{ ...gateway }];

  const destProperties = PROPERTIES.filter(
    (p) => p.destination === dest && p.coordinates
  );
  destProperties.forEach((p, idx) => {
    stops.push({
      ...stayStop(p.id)!,
      arrival: idx === 0 ? GATEWAY_ARRIVAL[dest] : STAY_TO_STAY[dest],
    });
  });

  stops.push({
    id: `exp-${exp.id}`,
    label: exp.title,
    sublabel: DESTINATION_LABELS[dest] ?? dest,
    lat: exp.coordinates.lat,
    lng: exp.coordinates.lng,
    kind: "experience",
    href: `/${dest}`,
    arrival: STAY_TO_STAY[dest] ?? "drive",
  });

  // Point of departure : back to the arrival gateway for the international flight out.
  stops.push({
    id: `dep-${gateway.id}`,
    label: gateway.label,
    sublabel: gateway.sublabel,
    lat: gateway.lat,
    lng: gateway.lng,
    kind: "departure",
    arrival: "fly",
  });

  return stops;
}

/**
 * Every arrival airport across the portfolio. Rendered as the context layer
 * on every journey map so guests always see the full network of airports.
 * Defined after the stop builders : module-scope evaluation calls stayStop.
 */
export const ALL_AIRPORTS: RouteStop[] = [
  {
    id: "llw",
    label: "Lilongwe",
    sublabel: "Kamuzu International Airport (LLW)",
    lat: -13.789,
    lng: 33.781,
    kind: "gateway",
    destination: "lake-malawi",
  },
  {
    id: "chileka",
    label: "Blantyre",
    sublabel: "Chileka / Bakili Muluzi International Airport (BLZ)",
    lat: -15.679,
    lng: 34.968,
    kind: "gateway",
    destination: "lake-malawi",
  },
  {
    id: "likoma",
    label: "Likoma Island",
    sublabel: "Likoma Airstrip",
    lat: -12.052,
    lng: 34.736,
    kind: "gateway",
    destination: "lake-malawi",
  },
  {
    id: "club_makokola",
    label: "Club Makokola",
    sublabel: "Club Makokola Airstrip",
    lat: -14.283,
    lng: 35.167,
    kind: "gateway",
    destination: "lake-malawi",
  },
  {
    id: "mfu",
    label: "Mfuwe",
    sublabel: "Mfuwe Airport (MFU)",
    lat: -13.255,
    lng: 31.936,
    kind: "gateway",
    destination: "south-luangwa",
  },
  {
    id: "znz",
    label: "Zanzibar",
    sublabel: "Abeid Amani Karume International Airport (ZNZ)",
    lat: -6.222,
    lng: 39.225,
    kind: "gateway",
    destination: "zanzibar",
  },
];

/**
 * The full network : every airport and every property across all three
 * destinations. Rendered as a muted context layer under the active route
 * on every journey map, so all locations are always visible.
 */
export const NETWORK_STOPS: RouteStop[] = [
  ...ALL_AIRPORTS,
  ...PROPERTIES.filter((p) => p.coordinates)
    .map((p) => stayStop(p.id))
    .filter((s): s is RouteStop => Boolean(s)),
];
