import { PROPERTIES, EXPERIENCES } from "@/lib/constants";

/**
 * Journey route model : how a guest physically moves through a journey.
 * A route is an ordered list of stops (arrival gateway → stays → experiences),
 * each tagged with the transport mode used to ARRIVE at it from the previous stop.
 */

export type RouteStopKind = "gateway" | "stay" | "experience" | "departure";
export type MovementMode = "fly" | "drive" | "boat";

/** IATA-style airport codes used across the portfolio's transfer network. */
export type AirportCode = "llw" | "blz" | "cmk" | "lix" | "mfu" | "lun" | "znz";

export interface Airport {
  code: AirportCode;
  /** Legacy marker id used by the map context layer. */
  id: string;
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
  destination: string;
}

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

/**
 * Single source of truth for every airport in the transfer network.
 * Keyed by IATA-style code; declared in ALL_AIRPORTS render order so the
 * derived context layer keeps its legacy ordering (plus LUN at the end).
 */
export const AIRPORTS: Record<AirportCode, Airport> = {
  llw: {
    code: "llw",
    id: "llw",
    label: "Lilongwe",
    sublabel: "Kamuzu International Airport (LLW)",
    lat: -13.789,
    lng: 33.781,
    destination: "lake-malawi",
  },
  blz: {
    code: "blz",
    id: "chileka",
    label: "Blantyre",
    sublabel: "Chileka / Bakili Muluzi International Airport (BLZ)",
    lat: -15.679,
    lng: 34.968,
    destination: "lake-malawi",
  },
  lix: {
    code: "lix",
    id: "likoma",
    label: "Likoma Island",
    sublabel: "Likoma Airstrip (LIX)",
    lat: -12.052,
    lng: 34.736,
    destination: "lake-malawi",
  },
  cmk: {
    code: "cmk",
    id: "club_makokola",
    label: "Club Makokola",
    sublabel: "Club Makokola Airstrip (CMK)",
    lat: -14.04,
    lng: 34.82,
    destination: "lake-malawi",
  },
  mfu: {
    code: "mfu",
    id: "mfu",
    label: "Mfuwe",
    sublabel: "Mfuwe Airport (MFU)",
    lat: -13.255,
    lng: 31.936,
    destination: "south-luangwa",
  },
  lun: {
    code: "lun",
    id: "lun",
    label: "Lusaka",
    sublabel: "Kenneth Kaunda International Airport (LUN)",
    lat: -15.3308,
    lng: 28.4526,
    destination: "south-luangwa",
  },
  znz: {
    code: "znz",
    id: "znz",
    label: "Zanzibar",
    sublabel: "Abeid Amani Karume International Airport (ZNZ)",
    lat: -6.222,
    lng: 39.225,
    destination: "zanzibar",
  },
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

/** Primary international arrival airport per destination. */
export const INTERNATIONAL_GATEWAYS: Record<string, AirportCode> = {
  "lake-malawi": "llw",
  "south-luangwa": "lun",
  "zanzibar": "znz",
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

// ─── Property transfer routes ───────────────────────────────────────────
// How a guest physically reaches each property from its international
// arrival gateway, leg by leg. Enforces the portfolio's airport rules:
// Malawi arrives via LLW (or BLZ), Zambia via LUN, Zanzibar via ZNZ;
// Makokola & Pumulani connect via CMK, Likoma via LIX, South Luangwa via MFU.

export interface TransferStep {
  id: string;
  label: string;
  sublabel?: string;
  /** IATA code for airport steps (absent on property steps). */
  code?: string;
  kind: "airport" | "property";
  /** How the traveller ARRIVES at this step from the previous one. */
  mode: MovementMode;
  duration: string;
  note?: string;
  lat: number;
  lng: number;
}

export interface PropertyTransfer {
  propertyId: string;
  /** International arrival airport for this property. */
  gateway: AirportCode;
  /** Secondary connection (e.g. Likoma from the southern lakeshore). */
  alternateGateway?: { code: AirportCode; note: string };
  /** Ordered steps : gateway → … → property. */
  steps: TransferStep[];
}

const propertyCoordinates = (id: string) =>
  PROPERTIES.find((p) => p.id === id)?.coordinates ?? { lat: 0, lng: 0 };

/** Gateway step shared by every route : the international arrival airport. */
function gatewayStep(code: AirportCode, note: string): TransferStep {
  const a = AIRPORTS[code];
  return {
    id: a.id,
    label: a.label,
    sublabel: a.sublabel,
    code: a.code,
    kind: "airport",
    mode: "fly",
    duration: "International arrival",
    note,
    lat: a.lat,
    lng: a.lng,
  };
}

/** Domestic airstrip leg : reachable by scheduled or charter flight. */
function airportStep(code: AirportCode, duration: string, note?: string): TransferStep {
  const a = AIRPORTS[code];
  return {
    id: a.id,
    label: a.label,
    sublabel: a.sublabel,
    code: a.code,
    kind: "airport",
    mode: "fly",
    duration,
    note,
    lat: a.lat,
    lng: a.lng,
  };
}

/** Final leg : the property itself. */
function propertyStep(
  propertyId: string,
  mode: MovementMode,
  duration: string,
  note?: string
): TransferStep {
  const p = PROPERTIES.find((x) => x.id === propertyId);
  const coords = propertyCoordinates(propertyId);
  return {
    id: propertyId,
    label: p?.name ?? propertyId,
    sublabel: p?.location,
    kind: "property",
    mode,
    duration,
    note,
    lat: coords.lat,
    lng: coords.lng,
  };
}

export const PROPERTY_TRANSFERS: Record<string, PropertyTransfer> = {
  "kaya-mawa": {
    propertyId: "kaya-mawa",
    gateway: "llw",
    alternateGateway: {
      code: "cmk",
      note: "Travelling between the southern lakeshore and Likoma connects through Club Makokola Airstrip (CMK).",
    },
    steps: [
      gatewayStep("llw", "Kamuzu International, Lilongwe — Kivara concierge meets you airside"),
      airportStep("lix", "45-minute scenic flight", "Scenic charter over the Lake of Stars"),
      propertyStep("kaya-mawa", "drive", "10-minute road transfer", "Airstrip to the lodge on Likoma Island"),
    ],
  },
  "pumulani-lodge": {
    propertyId: "pumulani-lodge",
    gateway: "llw",
    steps: [
      gatewayStep("llw", "Kamuzu International, Lilongwe — Kivara concierge meets you airside"),
      airportStep("cmk", "35-minute scenic flight", "Club Makokola Airstrip — gateway to the southern lakeshore"),
      propertyStep("pumulani-lodge", "drive", "Scenic road transfer", "Approximately 50 minutes along the lake shore to Nankumba Peninsula"),
    ],
  },
  "makokola-retreat": {
    propertyId: "makokola-retreat",
    gateway: "llw",
    steps: [
      gatewayStep("llw", "Kamuzu International, Lilongwe — Kivara concierge meets you airside"),
      airportStep("cmk", "35-minute scenic flight"),
      propertyStep("makokola-retreat", "drive", "5-minute road transfer", "The Retreat lies moments from the airstrip"),
    ],
  },
  "chinzombo": {
    propertyId: "chinzombo",
    gateway: "lun",
    steps: [
      gatewayStep("lun", "Kenneth Kaunda International, Lusaka — Kivara concierge meets you airside"),
      airportStep("mfu", "1.5-hour light aircraft flight", "Flight over the Luangwa Valley"),
      propertyStep("chinzombo", "drive", "Game-drive transfer", "30–60 minutes through the park to camp — a safari begins before you arrive"),
    ],
  },
  "puku-ridge-camp": {
    propertyId: "puku-ridge-camp",
    gateway: "lun",
    steps: [
      gatewayStep("lun", "Kenneth Kaunda International, Lusaka — Kivara concierge meets you airside"),
      airportStep("mfu", "1.5-hour light aircraft flight"),
      propertyStep("puku-ridge-camp", "drive", "Game-drive transfer", "30–60 minutes to the ridge above the Kakumbi Floodplain"),
    ],
  },
  "xanadu-villas": {
    propertyId: "xanadu-villas",
    gateway: "znz",
    steps: [
      gatewayStep("znz", "Abeid Amani Karume International, Zanzibar — Kivara concierge meets you airside"),
      propertyStep("xanadu-villas", "drive", "Private road transfer", "Approximately 50 minutes to the east coast at Michamvi"),
    ],
  },
  "baraza-resort-spa": {
    propertyId: "baraza-resort-spa",
    gateway: "znz",
    steps: [
      gatewayStep("znz", "Abeid Amani Karume International, Zanzibar — Kivara concierge meets you airside"),
      propertyStep("baraza-resort-spa", "drive", "Private road transfer", "Approximately 60 minutes to the south-east coast at Bwejuu"),
    ],
  },
};

/** Transfer route for a property, or null when the property is not in the portfolio. */
export function getPropertyTransfer(propertyId: string): PropertyTransfer | null {
  return PROPERTY_TRANSFERS[propertyId] ?? null;
}

/**
 * Every arrival airport across the portfolio. Rendered as the context layer
 * on every journey map so guests always see the full network of airports.
 * Defined after the stop builders : module-scope evaluation calls stayStop.
 */
export const ALL_AIRPORTS: RouteStop[] = Object.values(AIRPORTS).map(
  (a): RouteStop => ({
    id: a.id,
    label: a.label,
    sublabel: a.sublabel,
    lat: a.lat,
    lng: a.lng,
    kind: "gateway",
    destination: a.destination,
  })
);

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

// ─── Destination boundaries ──────────────────────────────────────────────
// Polygons that visually distinguish each destination area on the map.
// Colors match each destination's accent: teal (Lake Malawi), amber (South Luangwa), coral (Zanzibar).

export interface DestinationBoundary {
  destination: string;
  label: string;
  positions: [number, number][];
  color: string;
}

export const DESTINATION_BOUNDARIES: DestinationBoundary[] = [
  {
    destination: "lake-malawi",
    label: "Lake Malawi",
    color: "#4A90A4", // teal
    positions: [
      [-11.4, 34.2],
      [-11.4, 34.9],
      [-12.0, 35.0],
      [-13.5, 35.4],
      [-14.6, 35.5],
      [-14.6, 34.6],
      [-14.0, 34.1],
      [-12.5, 34.0],
      [-11.4, 34.2],
    ],
  },
  {
    destination: "south-luangwa",
    label: "South Luangwa",
    color: "#D4956A", // amber
    positions: [
      [-12.2, 31.2],
      [-12.2, 32.0],
      [-13.0, 32.1],
      [-13.6, 31.9],
      [-13.6, 31.3],
      [-13.0, 31.1],
      [-12.2, 31.2],
    ],
  },
  {
    destination: "zanzibar",
    label: "Zanzibar",
    color: "#E07A5F", // coral
    positions: [
      [-5.9, 39.1],
      [-5.9, 39.5],
      [-6.2, 39.6],
      [-6.5, 39.5],
      [-6.5, 39.1],
      [-6.2, 39.0],
      [-5.9, 39.1],
    ],
  },
];
