// ─── Kivara Luxury Travel ──────────────────────────────────────────────
// Africa's most coveted romance sanctuary.
// We occupy the space between Aman's serenity and &Beyond's wilderness.
// ──────────────────────────────────────────────────────────────────────

// ─── UNSplash Image Library ───────────────────────────────────────────
// Cinematic imagery sourced for each destination and property

export const IMAGES = {
  // Lake Malawi (updated with images from Green Safaris)
  lakeMalawiHero: "/images/kaya-mawa-beach-swing.jpg",
  lakeMalawiRomanceHero: "/images/gs--283.mainja-pool_1.jpg",
  lakeMalawiAerial: "/images/likoma-scuba.jpg",
  lakeMalawiSunset: "/images/likoma-paddleboard.jpg",
  lakeMalawiBeach: "/images/makokola-retreat.jpg",
  lakeMalawiDhow: "/images/likoma-kayaking.jpg",
  lakeMalawiIsland: "/images/likoma-paddleboard.jpg",

  // South Luangwa (official camp imagery)
  southLuangwaHero: "/images/puku-ridge-5.jpg",
  southLuangwaRomanceHero: "/images/shawa-campfire.jpg",
  southLuangwaElephant: "/images/chinzombo-wildlife.jpg",
  southLuangwaLeopard: "/images/chinzombo-main-area.jpg",
  southLuangwaSunset: "/images/chinzombo-sundowner.jpg",
  southLuangwaSafari: "/images/shawa-lion.jpg",
  southLuangwaCamp: "/images/shawa-lodge.jpg",

  // Zanzibar
  zanzibarHero: "/images/residence.jpg",
  zanzibarRomanceHero: "/images/baraza-beach.jpg",
  zanzibarBeach: "/images/baraza-beach.jpg",
  zanzibarAerial: "/images/zanzibar-stonetown.jpg",
  zanzibarDhow: "/images/zanzibar-dhow.jpg",
  zanzibarSpa: "/images/zanzibar-spa.jpg",
  zanzibarStoneTown: "/images/zanzibar-stonetown.jpg",

  // Properties
  kayaMawa: "/images/kaya-mawa-beach-swing.jpg",
  kayaMawaSnorkel: "/images/kaya-mawa-snorkel.jpg",
  kayaMawaPicnic: "/images/kaya-mawa-picnic.jpg",
  kayaMawaSailing: "/images/kaya-mawa-sailing.jpg",
  pumulani: "/images/pl-camporlodge-pumulani-lodge-58.jpg",
  makokolaRetreat: "/images/makokola-retreat.jpg",
  // South Luangwa : official camp images
  chinzombo: "/images/chinzombo-sundowner.jpg",
  chinzomboMain: "/images/chinzombo-main-area.jpg",
  chinzomboCampfire: "/images/chinzombo-campfire.jpg",
  chinzomboRoom: "/images/chinzombo-room-1.jpg",
  chinzomboWildlife: "/images/chinzombo-wildlife.jpg",
  pukuRidge: "/images/puku-ridge-1.jpg",
  pukuRidgeCamp: "/images/puku-ridge-2.jpg",
  pukuRidgeSunset: "/images/puku-ridge-3.jpg",
  pukuRidgeStars: "/images/puku-ridge-4.jpg",
  pukuRidgeView: "/images/puku-ridge-5.jpg",
  xanadu: "/images/xanadu.jpg",
  baraza: "/images/baraza.jpg",
  barazaVillaView: "/images/baraza-villa-view.jpg",
  barazaGarden: "/images/baraza-garden.jpg",
  barazaPool: "/images/baraza-pool.jpg",
  barazaBeach: "/images/baraza-beach.jpg",
  barazaDining: "/images/baraza-dining.jpg",
  barazaSpa: "/images/baraza-spa.jpg",
  barazaSunset: "/images/baraza-sunset.jpg",
  barazaRoyalVilla: "/images/baraza-royal-villa.jpg",

  // Experiences (real property photography)
  dining: "/images/dining.jpg",
  walking: "/images/lrc-walking.jpg",
  dhow: "/images/zanzibar-dhow.jpg",
  spa: "/images/baraza-spa.jpg",
  starbed: "/images/pr-starbed.jpg",
  bushDining: "/images/lrc-dining.jpg",

  // Journal
  journalHoneymoon: "/images/journal-honeymoon.jpg",
  journalMalawi: "/images/journal-malawi.jpg",

  journalZanzibar: "/images/journal-zanzibar.jpg",

  // Hero video poster frames
  heroPoster: "/images/chinzombo-wildlife.jpg",
} as const;

export const BRAND_POSITIONING = {
  proposition: "The African Love Story, a private journey house crafting bespoke romantic experiences across Africa's most intimate destinations.",
  tagline: "Where Your Love Story Meets the Wild.",
  description:
    "Kivara crafts private romantic journeys across Africa, combining breathtaking destinations, authentic culture and unforgettable moments designed around your story. Not trips. Love stories.",
  betweenAmanAndBeyond:
    "We occupy the space between Aman's serenity and &Beyond's wilderness. Like Aman, we worship space and silence. Like &Beyond, we honor the raw and the wild. We are Kivara: Africa's first Luxury Romance Journey House.",
  storyBrand: {
    hero: "You, a couple who has experienced the world's finest and still seeks something more, a memory that represents your love.",
    problem: "Finding a meaningful romantic African experience should not feel overwhelming. Most holidays distract. You deserve a journey that deepens your bond rather than merely filling your calendar.",
    guide: "Kivara. Your personal curators of romance. We know Africa's most secret gardens, its most intimate camps, its most soul stirring shorelines.",
    plan: "Choose your love story, a proposal, a honeymoon, an anniversary, or a private escape. Choose your African chapter, The Heart, The Wild Soul, or The Forever. Then let Kivara craft your private journey, from arrival to departure.",
    callToAction: "Begin Your Love Story.",
    success: "You created a memory that will stay with you forever. Closer. More in love. The golden light over Luangwa, the silence of a Lake Malawi sunrise, the scent of cloves in Zanzibar's twilight, yours to keep.",
    stakes: "Let Africa remain someone else's story, or claim the golden light over Luangwa as your own. The silence of a Lake Malawi sunrise. The scent of cloves in Zanzibar's twilight. The choice is yours.",
  },
};

/** Single canonical URL : all absolute URLs derive from this */
export const SITE_URL = "https://kivarajourneys.com";

export const SITE_CONFIG = {
  name: "Kivara",
  tagline: BRAND_POSITIONING.tagline,
  description: BRAND_POSITIONING.description,
  url: SITE_URL,
  email: "concierge@kivara.luxury",
  phone: "+27 87 123 4567",
  whatsapp: "+27871234567",
  social: {
    instagram: "https://instagram.com/kivara",
    tiktok: "https://tiktok.com/@kivara",
    facebook: "https://facebook.com/kivara",
    pinterest: "https://pinterest.com/kivara",
  },
};

export const BRAND = {
  colors: {
    sand: "#D4C5A9",
    sandLight: "#E8DCC8",
    sandDark: "#B8A88A",
    warmWhite: "#F5F0EB",
    warmWhiteDark: "#EDE5DA",
    softBlack: "#1A1A1A",
    softBlackLight: "#2C2C2C",
    earth: "#8B7D6B",
    earthLight: "#A89880",
    gold: "#C9A96E",
    goldLight: "#D4BC8A",
    goldDark: "#B8944A",
    cream: "#FAF7F2",
  },
  fonts: {
    heading: "'Trajan Pro', 'Cinzel', 'Cormorant Garamond', serif",
    body: "'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
};

export const DESTINATIONS = [
  {
    id: "lake-malawi",
    accent: "teal",
    title: "Lake Malawi",
    chapter: "The Heart",
    subtitle: "A freshwater archipelago known only to the fortunate few.",
    tagline: "The beginning of your African love story, where the warmth of its people embraces you",
    description:
      "Lake Malawi. Africa's third largest lake holds crystal waters, shores untouched by mass tourism, and an atmosphere of such profound serenity that couples find themselves recalibrating to a slower, more meaningful rhythm.",
    positioning:
      "The Warm Heart of Africa. This is the chapter where your story meets the heart of a people who have faced hardship with resilience, and greet every visitor with hope, dignity and kindness. An infinity of water and sky. Kayak at dawn across coves discovered only by those who know. Dine beneath constellations on a private beach where the only footsteps in the sand are your own. Kaya Mawa, Pumulani, and The Makokola Retreat : each a chapter in a love story that few will ever read. Africa's hidden luxury beach escape. Reserved for those who know where to look.",
    heroImage: IMAGES.lakeMalawiRomanceHero,
    slug: "lake-malawi",
    properties: ["kaya-mawa", "pumulani-lodge", "makokola-retreat"],
    experiences: [
      "Private beach dining beneath a canopy of stars",
      "Sunset dhow cruises across the Lake of Stars",
      "Snorkeling in crystalline freshwater coves",
      "Private picnics on deserted islands",
      "Kayaking through golden hour light",
      "Intimate cultural encounters with lakeside villages",
    ],
    seasons: {
      bestTime: "April to October",
      closed: "Some properties close November to March due to rainy season",
      months: [
        { name: "January", temp: "26°C", weather: "Hot, occasional rain", open: true },
        { name: "February", temp: "26°C", weather: "Hot, occasional rain", open: true },
        { name: "March", temp: "26°C", weather: "Rainy season ends", open: true },
        { name: "April", temp: "25°C", weather: "Dry season begins", open: true },
        { name: "May", temp: "24°C", weather: "Perfect weather", open: true },
        { name: "June", temp: "22°C", weather: "Ideal conditions", open: true },
        { name: "July", temp: "21°C", weather: "Peak season", open: true },
        { name: "August", temp: "22°C", weather: "Peak season", open: true },
        { name: "September", temp: "24°C", weather: "Excellent", open: true },
        { name: "October", temp: "25°C", weather: "Great weather", open: true },
        { name: "November", temp: "26°C", weather: "Rain begins", open: "partial" },
        { name: "December", temp: "26°C", weather: "Rainy season", open: "partial" },
      ],
    },
  },
  {
    id: "south-luangwa",
    accent: "amber",
    title: "South Luangwa",
    chapter: "The Wild Soul",
    subtitle: "Where the Birthplace of the Walking Safari Becomes Yours Alone.",
    tagline: "The adventure chapter of your love story, where the wild brings two hearts closer",
    description:
      "South Luangwa. The birthplace of the walking safari. An unfiltered communion with wilderness that strips away everything unnecessary and leaves only what matters : you, your partner, and Africa in its purest form.",
    positioning:
      "Africa as it was before fences, before crowds, before compromise. Here, luxury means falling asleep to the rumble of lions and waking to the call of fish eagles, knowing you are among a fortunate few who will ever know this silence. Two signature properties : Time+Tide Chinzombo and Puku Ridge Camp : each offers a different window into this ancient world. From award winning riverside villas to silent electric safaris, this is safari luxury for those who seek not just to see Africa but to be remade by it.",
    heroImage: IMAGES.southLuangwaRomanceHero,
    slug: "south-luangwa",
    properties: ["chinzombo", "puku-ridge-camp"],
    experiences: [
      "Guided walking safaris following ancient elephant paths",
      "Night drives revealing the bush after dark",
      "Sundowners on the riverbank as Africa paints the sky",
      "Bush breakfasts where zebras are your dining companions",
      "Exclusive photography hides for intimate wildlife encounters",
      "Stargazing from raised platforms above the floodplain",
    ],
    seasons: {
      bestTime: "April to October",
      closed: "Most properties close November to March due to wet season and road conditions",
      months: [
        { name: "January", temp: "28°C", weather: "Wet season", open: false },
        { name: "February", temp: "28°C", weather: "Wet season", open: false },
        { name: "March", temp: "27°C", weather: "Wet season ends", open: false },
        { name: "April", temp: "26°C", weather: "Dry season begins", open: true },
        { name: "May", temp: "24°C", weather: "Excellent weather", open: true },
        { name: "June", temp: "22°C", weather: "Peak season", open: true },
        { name: "July", temp: "21°C", weather: "Peak season", open: true },
        { name: "August", temp: "22°C", weather: "Peak season", open: true },
        { name: "September", temp: "25°C", weather: "Excellent", open: true },
        { name: "October", temp: "27°C", weather: "Great weather", open: true },
        { name: "November", temp: "28°C", weather: "Rain begins", open: false },
        { name: "December", temp: "28°C", weather: "Wet season", open: false },
      ],
    },
  },
  {
    id: "zanzibar",
    accent: "coral",
    title: "Zanzibar",
    chapter: "The Forever",
    subtitle: "The Spice Island. The Apex of Indian Ocean Romance.",
    tagline: "The forever chapter, where turquoise waters hold memories that last a lifetime",
    description:
      "Zanzibar. A love letter written in cinnamon and clove. Stone Town's ancient corridors lead to beaches of impossible beauty. The Indian Ocean trades in shades of turquoise reserved for those with the discernment to find them.",
    positioning:
      "Culture and coastline intertwined. Spice scented corridors, dhows sailing into fiery sunsets, and two peerless properties : Xanadu Luxury Villas & Retreat and Baraza Resort & Spa : each a sanctuary of romance known only to those who seek the remarkable. From the artistic vision of Xanadu to the Swahili grandeur of Baraza. Tropical elegance, refined to perfection, reserved for the discerning.",
    heroImage: IMAGES.zanzibarRomanceHero,
    slug: "zanzibar",
    properties: ["xanadu-villas", "baraza-resort-spa"],
    experiences: [
      "Spice plantation tours through ancient aromatic gardens",
      "Stone Town heritage walks through living history",
      "Private sandbank dining surrounded by the Indian Ocean",
      "Sunset dhow cruises with champagne and Swahili canapes",
      "Couples spa rituals using indigenous Zanzibari ingredients",
      "Deep sea fishing expeditions into the Indian Ocean",
    ],
    seasons: {
      bestTime: "June to October, December to February",
      closed: "Open year round, occasional short rains in November and April/May",
      months: [
        { name: "January", temp: "27°C", weather: "Peak dry season", open: true },
        { name: "February", temp: "28°C", weather: "Peak dry season", open: true },
        { name: "March", temp: "28°C", weather: "Dry season", open: true },
        { name: "April", temp: "27°C", weather: "Short rains", open: true },
        { name: "May", temp: "26°C", weather: "Short rains", open: true },
        { name: "June", temp: "25°C", weather: "Dry season begins", open: true },
        { name: "July", temp: "24°C", weather: "Peak season", open: true },
        { name: "August", temp: "24°C", weather: "Peak season", open: true },
        { name: "September", temp: "25°C", weather: "Excellent", open: true },
        { name: "October", temp: "26°C", weather: "Great weather", open: true },
        { name: "November", temp: "27°C", weather: "Short rains", open: true },
        { name: "December", temp: "27°C", weather: "Dry season begins", open: true },
      ],
    },
  },
];

export const PROPERTIES = [
  {
    id: "kaya-mawa",
    name: "Kaya Mawa",
    destination: "lake-malawi",
    location: "Likoma Island, Lake Malawi",
    coordinates: { lat: -12.059, lng: 34.734 },
    awards: ["Green Safaris : 100% renewable energy pioneer"],
    tagline: "Barefoot luxury on a private island sanctuary",
    description:
      "Perched on the shores of Likoma Island, Kaya Mawa is the apotheosis of barefoot luxury. Each suite handcrafted from local stone and thatch, opening to panoramic views of Lake Malawi's crystalline waters. A place where time suspends and love deepens.",
    longDescription:
      "Kaya Mawa is not a lodge. It is a sanctuary on one of Africa's most beautiful islands, built into the rocky shoreline with such reverence that the landscape remains the protagonist. Each of the eleven houses and rooms offers complete privacy with sweeping lake views, designed in a philosophy of minimal intervention: local stone, handwoven textiles, and an architecture that lets the water take center stage. Some suites feature their own private plunge pools carved from the granite shoreline. Days unfold at nature's pace. Swim in the infinity edge pool that merges with the lake : Africa's fourth largest. Explore hidden coves by kayak or stand up paddleboard. Dive into the crystalline depths with the on site PADI dive centre. Lose yourself in a novel on your private deck while the lake whispers below. The restaurant serves farm to table cuisine with a Malawian soul. The over water Sunset Bar perches above the lake for sundowners that linger into starlit evenings. Kaya Mawa is operated by Green Safaris, running entirely on 100% renewable solar energy, and its Kaya Mawa Foundation champions education and enterprise on the island. Open annually from mid March to mid January.",
    heroImage: "/images/kaya-mawa-beach-swing.jpg",
    gallery: [
      IMAGES.kayaMawa,                                   // 1  Hero : beach swing at sunset
      IMAGES.kayaMawaSnorkel,                            // 2  Snorkelling in Likoma's coves
      IMAGES.kayaMawaPicnic,                             // 3  Private beach picnic
      IMAGES.kayaMawaSailing,                            // 4  Sailing on the lake
      "/images/kaya-mawa-madimba-evening-pool-view.jpg", // 5  Madimba House infinity pool
      "/images/kaya-mawa-mainja-dinner-on-terrace.jpg",  // 6  Mainja House terrace dinner
      "/images/kaya-mawa-mbamba-room-view.jpg",          // 7  Mbamba Suite panoramic view
      "/images/kaya-mawa-mbamba-room.jpg",               // 8  Mbamba Suite bedroom
      "/images/kaya-mawa-mbungo-room.jpg",               // 9  Mbungo double room
      "/images/kaya-mawa-nkhwazi-bath-tub.jpg",          // 10 Nkhwazi Suite bathtub
      "/images/kaya-mawa-nkhwazi-terrace.jpg",           // 11 Nkhwazi Suite terrace
      "/images/kaya-mawa-yofu-sofa-beach.jpg",           // 12 Ndomo House beach sofa
      "/images/gs--399.nkhwazi-bedroom_1.jpg",           // 13 Nkhwazi Suite bedroom
      "/images/gs--217.mbamba-pool.jpg",                 // 14 Mbamba Suite private pool
      "/images/gs--11.madimba-bedroom_1.jpg",            // 15 Madimba House bedroom
    ],
    priceRange: "$450 to $735 per person per night",
    roomTypes: ["Standard Room", "Nkhwazi Suite", "Mbamba Suite", "Madimba House", "Mainja House", "Ndomo Private House"],
    amenities: [
      "Infinity edge swimming pool",
      "Over water Sunset Bar",
      "Farm to table restaurant",
      "Private beach coves",
      "PADI dive centre",
      "Kayaking and stand up paddleboarding",
      "Sailing and wakeboarding",
      "Quad biking and e biking",
      "Spa treatments",
      "100% solar powered",
      "Helicopter pad",
      "Complimentary WiFi",
    ],
    rating: 4.9,
    reviews: [
      { name: "Sarah and James Mitchell", text: "The most romantic place we have ever stayed. Every detail was perfection. We left a piece of our hearts on Likoma Island.", location: "London, United Kingdom" },
      { name: "Emma and Thomas Chen", text: "Kaya Mawa is pure magic. We arrived as guests and left as family. The Lake of Stars is real and it will change you.", location: "Sydney, Australia" },
    ],
    romanticHighlights: [
      "Private beach dinners beneath the Southern Cross",
      "Sunset dhow cruises across the Lake of Stars",
      "Couples massage on your private deck overlooking the lake",
      "Stargazing from your suite with nothing but the sound of water",
      "Private island picnics on deserted coves",
    ],
    rooms: [
      {
        name: "Standard Room",
        description: "Intimate rooms nestled into the granite shoreline, each with sweeping lake views and a private veranda. The perfect romantic retreat for two.",
        images: [
          "/images/km-std-bedroom.jpg",
          "/images/km-std-view.jpg",
          "/images/km-std-sundeck.jpg",
          "/images/km-std-bath.jpg",
        ],
        sleeps: 2,
      },
      {
        name: "Nkhwazi Suite",
        description: "A spacious suite with a separate sitting area, indoor outdoor bathroom with a freestanding bathtub, and a wide terrace overlooking the lake.",
        images: [
          "/images/gs--399.nkhwazi-bedroom_1.jpg",
          "/images/kaya-mawa-nkhwazi-bath-tub.jpg",
          "/images/kaya-mawa-nkhwazi-terrace.jpg",
        ],
        sleeps: 3,
      },
      {
        name: "Mbamba Suite",
        description: "A generous suite with a private plunge pool carved into the granite, outdoor lounge area, and panoramic lake views from every angle.",
        images: [
          "/images/kaya-mawa-mbamba-room.jpg",
          "/images/kaya-mawa-mbamba-room-view.jpg",
          "/images/gs--217.mbamba-pool.jpg",
          "/images/kaya-mawa-mbungo-room.jpg",
        ],
        sleeps: 3,
      },
      {
        name: "Madimba House",
        description: "Our most coveted accommodation : a private house with its own infinity pool, expansive deck, and uninterrupted views across the Lake of Stars.",
        images: [
          "/images/gs--11.madimba-bedroom_1.jpg",
          "/images/kaya-mawa-madimba-evening-pool-view.jpg",
          "/images/gs--13.madimba-bathroom_1.jpg",
        ],
        sleeps: 3,
      },
      {
        name: "Mainja House",
        description: "A sprawling two bedroom house ideal for small groups or families, with a private pool, outdoor dining pavilion, and direct beach access.",
        images: [
          "/images/gs--286.mainja-bedroom.jpg",
          "/images/gs--283.mainja-pool_1.jpg",
          "/images/kaya-mawa-mainja-dinner-on-terrace.jpg",
        ],
        sleeps: 5,
      },
      {
        name: "Ndomo Private House",
        description: "The ultimate private house experience : a completely private house with dedicated staff, private beach access, and an outdoor living area perched above the lake.",
        images: [
          "/images/gs--337.yofu-bedroom_1.jpg",
          "/images/gs--340.yofu-outside-bath_1.jpg",
          "/images/kaya-mawa-yofu-sofa-beach.jpg",
        ],
        sleeps: 6,
      },
    ],
  },
  {
    id: "pumulani-lodge",
    name: "Pumulani Lodge",
    destination: "lake-malawi",
    location: "Nankumba Peninsula, Lake Malawi",
    coordinates: { lat: -14.013, lng: 34.832 },
    tagline: "Where the lake meets the sky in perfect stillness",
    description:
      "Set on a private peninsula on the Nankumba Peninsula, Pumulani Lodge offers ten secluded villas with sweeping views across Lake Malawi. One of Robin Pope Safaris' finest properties : a place of serene beauty where high net worth couples rediscover each other far from the world's gaze.",
    longDescription:
      "Pumulani Lodge occupies a pristine stretch of the Nankumba Peninsula, offering a level of seclusion that feels like your own private world. The ten villas embody a contemporary African aesthetic: clean architectural lines, natural materials, and floor to ceiling windows that frame the lake as living art. Each villa features its own plunge pool and outdoor shower, creating an indoor outdoor living experience that dissolves the boundary between luxury and nature. The main lodge houses a stunning infinity pool, a curated library, and a dining room where the seasonal menu celebrates the flavours of Malawi with a sophistication that rivals the world's finest restaurants. Operated by the award winning Robin Pope Safaris, Pumulani operates on a Fully Inclusive Plus basis: all meals, select premium drinks, laundry, and a wide range of activities are included. From water skiing and sailing to guided nature walks, mountain biking, and visits to local villages, every day offers a new adventure or perfect stillness : entirely on your terms.",
    heroImage: "/images/pl-camporlodge-pumulani-lodge-69.jpg",
    gallery: [
      IMAGES.pumulani,                            // 1  Hero : lodge by the lake
      "/images/pl-camporlodge-pumulani-lodge-64.jpg", // 2  Villa interior
      "/images/pl-camporlodge-pumulani-lodge-65.jpg", // 3  Lakeside deck
      "/images/pl-camporlodge-pumulani-lodge-67.jpg", // 4  Superior villa
      "/images/pl-camporlodge-pumulani-lodge-68.jpg", // 5  Sunset terrace
      "/images/pl-camporlodge-pumulani-lodge-69.jpg", // 6  Pool view
      "/images/pl-camporlodge-pumulani-lodge-78.jpg", // 7  Honeymoon villa
      "/images/pl-camporlodge-pumulani-lodge-50.jpg", // 8  Beachfront
      "/images/pl-camporlodge-pumulani-lodge-59.jpg", // 9  Honeymoon bedroom
      "/images/pl-camporlodge-pumulani-lodge-1.png",  // 10 Standard villa
      "/images/pl-camporlodge-pumulani-lodge-2.png",  // 11 Superior villa
      "/images/pl-camporlodge-pumulani-lodge-3.png",  // 12 Honeymoon villa
      IMAGES.lakeMalawiSunset,                    // 13 Lake Malawi sunset
      IMAGES.lakeMalawiAerial,                    // 14 Aerial coastline
    ],
    priceRange: "$370 to $505 per person per night",
    roomTypes: ["Standard Villa", "Superior Villa", "Honeymoon Villa"],
    amenities: [
      "Private plunge pool per villa",
      "Infinity pool overlooking the lake",
      "Outdoor shower",
      "Restaurant and bar",
      "Water skiing and sailing",
      "Kayaking and paddleboarding",
      "Snorkelling and scuba diving",
      "Guided nature walks and mountain biking",
      "Dhow sunset cruises",
      "Village and cultural visits",
      "Spa sanctuary",
      "Curated library",
      "Complimentary WiFi",
      "Fully Inclusive Plus basis",
    ],
    rating: 4.8,
    reviews: [
      { name: "Michael and Anna Barnes", text: "Paradise found. The villa, the views, the service extraordinary. We have traveled the world. This is different.", location: "New York, USA" },
    ],
    romanticHighlights: [
      "Private villa dining with your personal chef",
      "Couples spa journeys using indigenous ingredients",
      "Sunset dhow cruises with champagne on the Lake of Stars",
      "Secluded beach picnics on private coves",
      "Stargazing from your private plunge pool",
    ],
    rooms: [
      {
        name: "Standard Villa",
        description: "A light filled villa with floor to ceiling windows overlooking the lake, a private plunge pool, and an outdoor shower. Contemporary African design meets barefoot luxury.",
        images: [
          "/images/pl-camporlodge-pumulani-lodge-64.jpg",
          "/images/pl-camporlodge-pumulani-lodge-65.jpg",
          "/images/pl-camporlodge-pumulani-lodge-1.png",
          "/images/pl-camporlodge-pumulani-lodge-78.jpg",
        ],
        sleeps: 2,
      },
      {
        name: "Superior Villa",
        description: "A more spacious villa with premium lake views, a larger private plunge pool, and an extended sun deck. The indoor outdoor bathroom features a freestanding bath.",
        images: [
          "/images/pl-camporlodge-pumulani-lodge-67.jpg",
          "/images/pl-camporlodge-pumulani-lodge-68.jpg",
          "/images/pl-camporlodge-pumulani-lodge-2.png",
          "/images/pl-camporlodge-pumulani-lodge-69.jpg",
        ],
        sleeps: 2,
      },
      {
        name: "Honeymoon Villa",
        description: "The pinnacle of romance : positioned at the tip of the peninsula for uninterrupted panoramic views. Features include an infinity edge plunge pool, outdoor shower, and a private sala.",
        images: [
          "/images/pl-camporlodge-pumulani-lodge-58.jpg",
          "/images/pl-camporlodge-pumulani-lodge-59.jpg",
          "/images/pl-camporlodge-pumulani-lodge-3.png",
          "/images/pl-camporlodge-pumulani-lodge-50.jpg",
        ],
        sleeps: 2,
      },
    ],
  },
  {
    id: "makokola-retreat",
    name: "The Makokola Retreat",
    destination: "lake-malawi",
    location: "Southern Shore, Lake Malawi",
    coordinates: { lat: -14.04, lng: 34.82 },
    tagline: "Where the lake's ancient rhythm meets unhurried grace",
    description:
      "On Lake Malawi's sun bleached southern shore, Makokola Retreat is a world unto itself. Palm fringed, white sanded, and wrapped in the unhurried rhythm of lakeside days. Here, the Lake Suites offer an adult only enclave with private infinity pools suspended above the water : your own crystalline corner of Africa.",
    longDescription:
      "Makokola Retreat unfolds along the brilliant white sands of Lake Malawi's southern shore : a place where time sheds its urgency and the lake becomes the only horizon that matters. The Lake Suites form an adult only sanctuary of 22 suites and the private Sunset Villa, each with a terrace that delivers the lake to your doorstep. The infinity pool here is reserved exclusively for adults : a sheet of still water that seems to pour directly into the lake beyond. The culinary journey carries the same attention to detail: Il Lago serves Italian and Mediterranean cuisine al fresco with the lake as your backdrop, while Harry's Bar is the kind of place where sundowners stretch into evenings without notice. Beyond the pool and plate, a nine hole par three golf course unfurls along the lakeshore, botanical gardens invite wandering, and the Tropex Nursery offers a living博物馆 of indigenous flora to carry home as memory. The Superior Beach Rooms, reimagined in 2021, blend thatch roofed charm with considered comfort. All of it set to the soundtrack of lapping water and rustling palms : the soundtrack of Malawi at peace.",
    heroImage: "/images/mk-lake-suite-01.jpg",
    gallery: [
      IMAGES.makokolaRetreat,
      "/images/mk-lake-suite-01.jpg",
      "/images/mk-lake-suite-02.jpg",
      "/images/mk-lake-suite-03.jpg",
      "/images/mk-retreat-01.jpg",
      "/images/mk-retreat-04.jpg",
      "/images/mk-sunset-villa-01.jpg",
      "/images/mk-sunset-villa-02.jpg",
      "/images/mk-sunset-villa-03.jpg",
      "/images/mk-superior-room-01.jpg",
      "/images/mk-superior-room-02.jpg",
      "/images/mk-superior-room-03.jpg",
    ],
    priceRange: "$250 to $550 per night",
    roomTypes: ["Sunset Villa", "Lake Suite", "Superior Beach Room", "Standard Beach Room", "Garden Room"],
    rooms: [
      {
        name: "Sunset Villa",
        description: "The crown jewel of the Retreat : a two level villa with a king size bedroom upstairs, panoramic lake views, a living room, and a private infinity pool that surrounds the room on both sides.",
        images: ["/images/mk-sunset-villa-01.jpg", "/images/mk-sunset-villa-02.jpg", "/images/mk-sunset-villa-03.jpg"],
        sleeps: 2,
      },
      {
        name: "Lake Suite",
        description: "Adult only luxury suites with private terrace or balcony overlooking Lake Malawi. En suite bathrooms, flat screen TV, mini fridge, and exclusive access to the Lake Suite infinity pool and bar.",
        images: ["/images/mk-lake-suite-01.jpg", "/images/mk-lake-suite-02.jpg", "/images/mk-lake-suite-03.jpg"],
        sleeps: 2,
      },
      {
        name: "Superior Beach Room",
        description: "Thatch roofed rooms completely redesigned in 2021, with beach and partial lake views. Modern amenities include flat screen TV, AC, mini fridge, and a private terrace.",
        images: ["/images/mk-superior-room-01.jpg", "/images/mk-superior-room-02.jpg", "/images/mk-superior-room-03.jpg"],
        sleeps: 2,
      },
    ],
    amenities: [
      "Adult only Lake Suite infinity pool",
      "Nine hole par three golf course (Mlambe)",
      "Flood lit bowling green",
      "Il Lago Italian restaurant",
      "Harry's Bar lakeside bar",
      "Coffee Lounge with complimentary WiFi",
      "Curated fitness sanctuary",
      "Multiple swimming pools",
      "Water sports and boat excursions",
      "Bespoke event spaces",
      "Tropex botanical nursery",
      "Complimentary WiFi in public areas",
      "Air conditioning in Lake Suites",
      "Electronic safe and mini fridge in all rooms",
    ],
    rating: 4.5,
    reviews: [
      { name: "Robert and Catherine Thompson", text: "A wonderful resort with stunning lake views. The Lake Suite was beautifully appointed and the golf course was a delightful surprise.", location: "Toronto, Canada" },
    ],
    romanticHighlights: [
      "Adult only Lake Suites with private infinity pool for two",
      "Sundowners at Harry's Bar as the sun sets over Lake Malawi",
      "Couples golf on the nine hole Mlambe course",
      "Stargazing from your Lake Suite terrace with a Malawian gin and tonic",
      "Candlelit dinner at Il Lago with the lake as your backdrop",
    ],
  },
  {
    id: "chinzombo",
    name: "Time + Tide Chinzombo",
    destination: "south-luangwa",
    location: "South Luangwa National Park, Zambia",
    coordinates: { lat: -13.017, lng: 31.767 },
    awards: ["Best New Property in Africa 2014", "Best New Property in Africa 2015"],
    tagline: "The most awarded safari camp on the Luangwa River",
    description:
      "Set on a sweeping curve of the Luangwa River within 60 acres of private land, Time+Tide Chinzombo is arguably Africa's most celebrated bush sanctuary. Six peerless villas, each with a private plunge pool, redefine the boundaries of ultra luxury safari living.",
    longDescription:
      "Named after a species of acacia that grows near camp, Time+Tide Chinzombo's natural building materials and vintage accents blend modern style with the best of a traditional bush safari camp. Designed by award winning architects Silvio Rech and Lesley Carstens, the camp won Best New Property in Africa in 2014 and again in 2015. Its six spacious luxury safari villas (including a two bedroom, two bathroom family villa) rest beneath ancient msikizi trees. Each has a private plunge pool, a soaking tub with panoramic views over the river, and an open plan design featuring canvas, timber, and reed accented with leather and raw linen. Each stretches out onto a shaded verandah where you can while away the afternoon or unwind with an in villa spa treatment. Down a winding path, the main lodge beckons with a riverfront sun deck, an open air library, a bar rich with old books and photographs, and a fire pit suspended high atop the river bank. Here, dining is a celebration of Zambian flavours enriched by produce grown in the camp's own garden.",
    heroImage: "/images/cz-pool-villa.jpg",
    gallery: [
      // ROOMS : villa interiors, suites, bedrooms
      "/images/cz-room-04.jpg",                // 1  Bathroom with soaking tub
      "/images/cz-room-05.jpg",                // 2  Villa verandah
      "/images/cz-room-06.jpg",                // 3  Camp overview aerial
      "/images/cz-room-07.jpg",                // 4  Luxury suite panoramic
      "/images/cz-room-08.jpg",                // 5  Holiday package suite

      // AMENITIES : pool, lounge, dining
      "/images/cz-pool-villa.jpg",             // 6  Villa with private plunge pool
      "/images/cz-amenity-01.jpg",             // 7  Main lodge & river views
      "/images/cz-amenity-02.jpg",             // 8  Sundowner deck

      // ROMANCE : dining, sundowners, experiences
      "/images/cz-romance-02.jpg",             // 9  Sundowner cocktails
      "/images/cz-romance-05.jpg",             // 10 Couples massage
    ],
    priceRange: "From $1,330 per person per night",
    roomTypes: ["Luxury Safari Villa", "Family Safari Villa (2BR, 2BA)"],
    amenities: [
      "Private plunge pool per villa",
      "Soaking tub with riverfront views",
      "Award winning architectural design",
      "Morning and afternoon game drives",
      "Guided walking safaris",
      "Seasonal boat cruises",
      "Cultural village visits",
      "20 minute welcome massage included",
      "In villa spa treatments",
      "Sleepout under the stars",
      "Riverfront dining and fire pit",
      "WiFi in villas",
      "Eco cooled sleeping areas",
      "Full laundry and service included",
    ],
    rating: 4.9,
    reviews: [
      { name: "Zetta", text: "What an amazing, memory filled stay we enjoyed at Chinzombo. The accommodation and catering are next level. You will leave with a treasure trove of memories.", location: "Time+Tide Guest" },
      { name: "Robert and Catherine Thompson", text: "Chinzombo is a stunning lodge. The rooms are luxurious and spacious, with a deck and plunge pool overlooking the Luangwa River. Always an abundance of wildlife around the rooms.", location: "Toronto, Canada" },
    ],
    romanticHighlights: [
      "Private plunge pool overlooking the Luangwa River for two",
      "Sundowners around the riverfront fire pit at dusk",
      "In villa spa treatments side by side",
      "Sleepout under the stars on a private platform",
      "Candlelit dinners grown from the camp's own garden",
    ],
    rooms: [
      {
        name: "Luxury Safari Villa",
        description: "A spectacular open plan villa with a private plunge pool, soaking tub with panoramic river views, and a shaded verandah. Canvas, timber, and reed interiors accented with leather and raw linen create the ultimate bush sanctuary.",
        images: ["/images/chinzombo-room-1.jpg", "/images/chinzombo-room-2.jpg", "/images/cz-room-interior.jpg"],
        sleeps: 2,
      },
      {
        name: "Family Safari Villa",
        description: "A two bedroom, two bathroom villa with the same award winning design and river views. Perfect for couples traveling with children or sharing the safari experience with close friends.",
        images: ["/images/chinzombo-room-1.jpg", "/images/cz-pool-villa.jpg", "/images/cz-family-tent.jpg"],
        sleeps: 4,
      },
    ],
  },
  {
    id: "puku-ridge-camp",
    name: "Puku Ridge Camp",
    destination: "south-luangwa",
    location: "South Luangwa National Park, Zambia",
    coordinates: { lat: -12.983, lng: 31.7 },
    awards: ["Award winning guiding team : Chiawa Safaris"],
    tagline: "Where the floodplain becomes your private wilderness",
    description:
      "Perched on an elevated ridge commanding the Kakumbi Floodplain, Puku Ridge Camp offers eight air conditioned luxury suites, each with its own plunge pool and star bed tower. An encounter that brings you closer to the wild : and to each other : than you thought possible.",
    longDescription:
      "Puku Ridge Camp occupies a spectacular hilltop position in the South Luangwa National Park, commanding panoramic views of the sprawling Kakumbi Floodplain below. Rebuilt in 2019, the camp's eight luxury tented suites are ranged across the hillside, each featuring a super king or twin bed configuration, air conditioning (a rare and welcome luxury in the Luangwa Valley), and en suite facilities with his and hers washbasins and a large bathtub with a view. Outside, a multi level verandah with a private plunge pool overlooks the plains, while a tower above the bathroom offers a star bed for a night under the vast African sky. The main area features indoor and open air lounges, a bar, a campfire, and a photographic hide overlooking a waterhole that draws predators and prey alike. Zambia is renowned for its walking safaris, and Puku Ridge's award winning guides lead both vehicle and foot explorations, including night drives using an award winning red light protocol that allows guests to observe nocturnal predators undisturbed.",
    heroImage: "/images/puku-ridge-property.jpg",
    gallery: [
      IMAGES.pukuRidge,                         // 1  Puku Ridge camp
      IMAGES.pukuRidgeCamp,                     // 2  Camp entrance
      IMAGES.pukuRidgeSunset,                   // 3  Sunset over the valley
      IMAGES.pukuRidgeStars,                    // 4  Night sky
      IMAGES.pukuRidgeView,                     // 5  Panoramic view
      "/images/puku-ridge.jpg",                 // 6  Camp overview
      "/images/pr-breakfast.jpg",               // 7  Bush breakfast with floodplain view
      "/images/pr-pool-view.jpg",               // 8  Private plunge pool & view
      "/images/pr-starbed.jpg",                 // 9  Star bed sleepout
      "/images/pr-stars.jpg",                   // 10 Star tower above suite
      "/images/pr-walking.jpg",                 // 11 Walking safari
      "/images/pr-photo-hide.jpg",              // 12 Photo hide overlooking waterhole
      "/images/pr-wildlife.jpg",                // 13 Wild dogs on the floodplain
      "/images/pr-bath-view.jpg",               // 14 Bathtub with floodplain view
    ],
    priceRange: "$800 to $1,500 per person per night",
    roomTypes: ["Luxury Safari Suite", "Premium Safari Suite"],
    amenities: [
      "Private plunge pool per suite",
      "Air conditioning (rare in the Luangwa Valley)",
      "Star bed tower for sleeping under the stars",
      "Morning and evening game drives",
      "Night drives with award winning red light protocol",
      "Guided walking safaris",
      "Photographic hide overlooking waterhole",
      "Bush dining under the stars",
      "Minibar with tea and coffee station",
      "Complimentary WiFi",
      "24/7 220V power with international charging",
      "Indoor and outdoor showers",
      "Campfire and open air lounge",
    ],
    rating: 4.9,
    reviews: [
      { name: "Robert and Catherine Thompson", text: "The most incredible wildlife experience of our lives. We watched a leopard stalk from our plunge pool. Unforgettable.", location: "Toronto, Canada" },
      { name: "Guest, Puku Ridge", text: "A beautiful lodge with first rate service and imaginative, well presented food. Well designed and comfortable rooms with tremendous views.", location: "Chiawa Safaris Guest" },
    ],
    romanticHighlights: [
      "Sundowners on the ridge as the sun sets over the floodplain",
      "Private star bed sleepout for two beneath the Milky Way",
      "Bush dinners surrounded by lantern light with views of the waterhole",
      "Exclusive walking safaris for two with a private guide",
      "Wildlife viewing from your private plunge pool",
    ],
    rooms: [
      {
        name: "Luxury Safari Suite",
        description: "A spacious tented suite on a raised deck with a super king bed, air conditioning, his and hers washbasins, and a large bathtub with floodplain views. Multi level verandah with private plunge pool and star bed tower above the bathroom.",
        images: ["/images/puku-ridge-2.jpg", "/images/puku-ridge-5.jpg", "/images/puku-ridge-3.jpg"],
        sleeps: 2,
      },
      {
        name: "Premium Safari Suite",
        description: "Positioned for the most dramatic views across the Kakumbi Floodplain, this suite offers enhanced privacy, premium furnishings, and an expanded verandah with the best sightlines for wildlife viewing from your plunge pool.",
        images: ["/images/puku-ridge-1.jpg", "/images/puku-ridge-4.jpg", "/images/puku-ridge-2.jpg"],
        sleeps: 2,
      },
    ],
  },
  {
    id: "xanadu-villas",
    name: "Xanadu Luxury Villas & Retreat",
    destination: "zanzibar",
    location: "Michamvi, East Coast, Zanzibar",
    coordinates: { lat: -6.15, lng: 39.483 },
    tagline: "Where dreams meet the Indian Ocean",
    description:
      "Nine uncompromising villas on a stretch of pristine white sand beach on Zanzibar's east coast. Each villa a private sanctuary with plunge pool, butler service, and an indulgence where every detail is anticipated : crafted for the discerning couple.",
    longDescription:
      "Xanadu Luxury Villas & Retreat is an experience, a lifestyle, an awakening of what life can be. Nine individually designed villas : each with a Swahili name meaning clouds, waves, stars, or dew : are scattered along a pristine white sand beach on Zanzibar's sun drenched east coast. Each villa features its own private plunge pool, indoor and outdoor living spaces, and a private butler who anticipates your every need. The experience is uncompromising: world class cuisine prepared by an international chef, premium beverages, laundry service, and a range of water sports including sea kayaking, snorkelling, and stand up paddleboarding directly from the beach. The Kiota Spa nestles on the sand, offering treatments with the sound of the Indian Ocean as your soundtrack. A member of Small Luxury Hotels of the World and featured in the National Geographic Traveller UK Collection 2024, Xanadu has been crafted out of a desire to breathe : to celebrate life in its purest, most luxurious form.",
    heroImage: IMAGES.xanadu,
    gallery: [
      "/images/xanadu.jpg",
      "/images/xanadu-1.jpg",
      "/images/xanadu-2.jpg",
      "/images/xanadu-3.jpg",
      "/images/xanadu-4.jpg",
      "/images/xanadu-5.jpg",
      "/images/xanadu-6.jpg",
      "/images/xanadu-7.jpg",
      "/images/xanadu-8.jpg",
      "/images/xanadu-9.jpg",
      "/images/xanadu-10.jpg",
      "/images/xanadu-11.jpg",
      "/images/xanadu-12.jpg",
      "/images/xanadu-13.jpg",
      "/images/xanadu-14.jpg",
    ],
    priceRange: "$895 to $4,400 per villa per night",
    roomTypes: ["Umande (1BR Garden)", "Alfajiri (1BR Honeymoon)", "Mawingu/Mawimbi (1BR Ocean)", "Kimwondo (1BR Rooftop Pool)", "Mlima/Korongo (2BR)", "Nyota/Mbingu (Presidential 2BR)"],
    amenities: [
      "Private plunge pool per villa",
      "Personal butler throughout your stay",
      "All inclusive cuisine by international chef",
      "Kiota Spa on the beach",
      "Private beach access",
      "Sea kayaking, snorkelling and SUP",
      "Private return airport transfers",
      "Laundry service up to 5kg per guest per day",
      "In villa dining and bar",
      "Yoga and wellness",
      "Sunset dhow cruises on Free Spirit",
      "Complimentary WiFi",
      "Air conditioning and ceiling fans",
      "Bluetooth music speakers",
    ],
    rating: 4.9,
    reviews: [
      { name: "Jessica and Daniel Wright", text: "Xanadu is everything you imagine Zanzibar to be and more. Pure paradise. We are already planning our return.", location: "San Francisco, USA" },
    ],
    romanticHighlights: [
      "Private poolside dining under the stars",
      "Sunset dhow cruises on the traditional dhow Free Spirit",
      "Couples spa rituals at Kiota Spa overlooking the ocean",
      "Signature rooftop pool dinner at Kimwondo Villa",
      "Private beachfront breakfast with your butler",
    ],
    rooms: [
      {
        name: "Umande : One Bedroom Garden Villa",
        description: "A serene garden villa set amidst tropical foliage with a private plunge pool, indoor outdoor living, and a personal butler. The bedroom opens onto a shaded terrace with views of the lush gardens.",
        images: ["/images/xanadu-15.jpg", "/images/xanadu-16.jpg", "/images/xanadu-17.jpg"],
        sleeps: 2,
      },
      {
        name: "Alfajiri : One Bedroom Honeymoon Villa",
        description: "The ultimate honeymoon villa positioned for privacy and romance. Features a king size bed draped in mosquito netting, an open plan bathroom with rainfall shower, and a private plunge pool overlooking the ocean.",
        images: ["/images/xanadu-18.jpg", "/images/xanadu-19.jpg", "/images/xanadu-20.jpg"],
        sleeps: 2,
      },
      {
        name: "Mawingu / Mawimbi : One Bedroom Ocean Villa",
        description: "Ocean facing villas with panoramic Indian Ocean views from the bedroom and terrace. Private plunge pool, indoor outdoor bathroom, and a thatched beach banda on the sand.",
        images: ["/images/xanadu-21.jpg", "/images/xanadu-22.jpg", "/images/xanadu-1.jpg"],
        sleeps: 2,
      },
      {
        name: "Kimwondo : One Bedroom Rooftop Pool Villa",
        description: "The signature Xanadu experience : a villa with a spectacular rooftop plunge pool offering 360 degree views over the Indian Ocean. Open plan living, private butler, and the most dramatic sunsets on the island.",
        images: ["/images/xanadu-10.jpg", "/images/xanadu-12.jpg", "/images/xanadu-14.jpg"],
        sleeps: 2,
      },
    ],
  },
  {
    id: "baraza-resort-spa",
    name: "Baraza Resort & Spa",
    destination: "zanzibar",
    location: "Bwejuu, South East Coast, Zanzibar",
    coordinates: { lat: -6.367, lng: 39.517 },
    awards: ["Condé Nast Traveller : Top 30 Beaches in the World"],
    tagline: "Swahili elegance on one of the world's finest beaches",
    description:
      "A stunning 30 villa boutique resort on Zanzibar's award winning Bwejuu Beach, recognised by Condé Nast Traveller as one of the top 30 beaches in the world. Every villa features a private plunge pool and Swahili inspired architecture with hand carved details : every meal, every drink, every moment included.",
    longDescription:
      "Baraza Resort & Spa is a refined Swahili boutique resort set along a beach named one of the top 30 in the world by Condé Nast Traveller. The resort evokes the heritage of Zanzibar dating back to the era of the Sultans, designed in a fusion of Arabic, Swahili, and Indian architectural styles with dramatic Swahili arches, intricate hand carved cement decorations, beautiful antiques, handmade furniture, and brass lanterns. All 30 villas : 14 one bedroom and 15 two bedroom, plus one Royal Sultan two bedroom villa : feature luxury interiors, hand carved furniture, spacious terraces, and private plunge pools. The resort offers four restaurants and two bars including Livingstone Terrace, Dhahabu Bar & Lounge, Chai Lounge, Ocean Lounge, and The Sultans Dining Room. The Frangipani Spa offers a wide array of massage techniques and treatments. On site activities include a PADI dive centre, kite surfing, sailing, snorkelling, kayaking, dhow excursions, Swahili cooking classes, spice farm visits, Jozani Forest excursions, and tennis.",
    heroImage: IMAGES.baraza,
    gallery: [
      IMAGES.baraza,                                     // 1  Main building exterior
      IMAGES.barazaBeach,                                // 2  Sundowners at the beach
      IMAGES.barazaPool,                                 // 3  Swimming pool
      IMAGES.barazaSunset,                              // 4  Dhahabu Bar terrace
      IMAGES.barazaSpa,                                // 5  Frangipani Spa
      IMAGES.barazaGarden,                                // 6  Garden villa exterior
      IMAGES.barazaPool,                                 // 7  Main pool at dusk
      IMAGES.barazaVillaView,                            // 8  One bedroom villa
      IMAGES.barazaVillaView,                            // 9  Ocean front villa
      IMAGES.barazaRoyalVilla,                           // 10 Royal beach villa
    ],
    priceRange: "$500 to $1,200 per night",
    roomTypes: ["One Bedroom Villa", "Ocean Front One Bedroom Villa", "Two Bedroom Garden Villa", "Royal Sultan Two Bedroom Villa"],
    amenities: [
      "Private plunge pool per villa",
      "Gourmet dining and premium beverages included",
      "4 restaurants and 2 bars",
      "Frangipani Spa",
      "PADI dive centre",
      "Fitness centre",
      "Floodlit tennis court",
      "Kite surfing and windsurfing",
      "Snorkelling and scuba diving",
      "Dhow excursions",
      "Swahili cooking classes",
      "Spice farm and Stone Town tours",
      "Kids club",
      "Concierge service",
      "Complimentary WiFi",
      "Air conditioning",
      "Room service",
      "Airport shuttle",
    ],
    rating: 4.8,
    reviews: [
      { name: "Robert and Catherine Thompson", text: "Baraza exceeded every expectation. The villa, the food, the service : all world class.", location: "Toronto, Canada" },
    ],
    romanticHighlights: [
      "Private beach dinners for two with your toes in the sand",
      "Couples spa rituals at the Frangipani Spa",
      "Sunset cocktails at Dhahabu Bar & Lounge",
      "Private dhow cruise along the Bwejuu coast",
      "Swahili cooking class for two with the resort chef",
    ],
    rooms: [
      {
        name: "One Bedroom Villa",
        description:
          "A spacious 70m² villa with Swahili inspired interiors, hand carved furniture, king size bed, en suite bathroom with twin vanity and rainfall shower, a private terrace with plunge pool, and garden views.",
        images: [IMAGES.barazaVillaView, IMAGES.barazaGarden, IMAGES.barazaPool],
        sleeps: 2,
      },
      {
        name: "Ocean Front One Bedroom Villa",
        description:
          "Positioned closest to the ocean, these villas offer panoramic sea views from a larger private terrace and plunge pool. The interiors feature premium Swahili furnishings, a king size bed, and an expansive bathroom with twin vanities.",
        images: [IMAGES.barazaBeach, IMAGES.barazaPool, IMAGES.baraza],
        sleeps: 2,
      },
      {
        name: "Royal Sultan Two Bedroom Villa",
        description:
          "The ultimate villa at Baraza spanning 140m² with two en suite bedrooms, a grand living room, private dining area, expansive terrace, and a large private plunge pool. Designed with Sultan inspired opulence throughout.",
        images: [IMAGES.barazaRoyalVilla, IMAGES.barazaVillaView, IMAGES.barazaBeach],
        sleeps: 4,
      },
    ],
  },
];

export const PACKAGES = [
  {
    id: "honeymoon-escape",
    title: "The Honeymoon Escape",
    subtitle: "Begin your forever in African paradise",
    image: IMAGES.kayaMawa,
    description:
      "The definitive African honeymoon : four nights of island barefoot luxury on Lake Malawi's Likoma Island, followed by four nights in the award winning wilderness of Time+Tide Chinzombo. Lake and bush, silence and roar, composed into the perfect beginning.",
    duration: "8 nights",
    price: "Enquire Within",
    collection: "romance",
    destinations: ["lake-malawi", "south-luangwa"],
    properties: ["kaya-mawa", "chinzombo"],
    inclusions: [
      "Luxury accommodation",
      "Breakfast, selected lunches and dinners",
      "Airport and lodge transfers",
      "Domestic flights where applicable",
      "Private sunset cruise",
      "Couples spa treatment",
      "Safari game drives",
      "Bush breakfast",
      "Bush dinner",
      "Park fees",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival on Likoma Island", description: "Fly from Lilongwe to Likoma Island and settle into Kaya Mawa. Sunset gin and tonic on the jetty as the lake turns to gold." },
      { day: 2, title: "Island Discovery", description: "Kayak hidden coves, snorkel the cichlid filled reefs, and enjoy a private beach lunch with your toes in the sand." },
      { day: 3, title: "Lake Romance", description: "Private sunset dhow cruise along the island's shores, followed by a couples spa treatment at the Kaya Mawa Spa." },
      { day: 4, title: "Journey to the Wild", description: "Morning swim, then fly to Mfuwe and transfer to Time+Tide Chinzombo in South Luangwa. Afternoon game drive and sundowners on the riverbank." },
      { day: 5, title: "Safari Immersion", description: "Full day of game drives and guided walking safaris with award winning guides. Bush breakfast among the ebony groves." },
      { day: 6, title: "Wilderness Intimacy", description: "Dawn drive along the Luangwa River. Afternoon by your private plunge pool, then a candlelit dinner on your villa deck." },
      { day: 7, title: "Bush Romance", description: "Private bush dinner beneath the stars, the firelight your only companion and the river your soundtrack." },
      { day: 8, title: "Departure", description: "Final morning game drive, brunch, and your flight home : your honeymoon becomes your most cherished memory." },
    ],
  },
  {
    id: "african-love-story",
    title: "The African Love Story",
    subtitle: "Lake, bush and island : a three chapter romance",
    image: IMAGES.chinzombo,
    description:
      "Kivara's signature journey across three worlds : the hidden beaches of Lake Malawi, the untamed wilderness of South Luangwa, and the spice scented shores of Zanzibar. Twelve nights composed for two, each chapter more extraordinary than the last.",
    duration: "12 nights",
    price: "Enquire Within",
    collection: "romance",
    destinations: ["lake-malawi", "south-luangwa", "zanzibar"],
    properties: ["kaya-mawa", "chinzombo", "xanadu-villas"],
    inclusions: [
      "Luxury accommodation",
      "Breakfast, selected lunches and dinners",
      "Airport and lodge transfers",
      "Domestic flights where applicable",
      "Private sunset cruise",
      "Couples spa treatment",
      "Safari game drives",
      "Bush breakfast",
      "Private beach dinner",
      "Park fees",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival on Likoma Island", description: "Fly from Lilongwe to Likoma Island and settle into Kaya Mawa. A champagne welcome as the sun sets over the lake." },
      { day: 2, title: "Island Discovery", description: "Kayak hidden coves and snorkel rainbow cichlid reefs. Private beach picnic on a stretch of sand you will have to yourselves." },
      { day: 3, title: "Lake Romance", description: "Private sunset dhow cruise, followed by a couples spa treatment and a candlelit dinner on the jetty." },
      { day: 4, title: "Journey to the Wild", description: "Fly to Mfuwe and transfer to Time+Tide Chinzombo. Afternoon game drive along the Luangwa River." },
      { day: 5, title: "Safari Begins", description: "Full day of game drives and walking safaris. Sundowners on the riverbank as Africa paints the sky." },
      { day: 6, title: "Wilderness Immersion", description: "Dawn game drive, bush breakfast, and an afternoon of wild swimming and riverside lounging." },
      { day: 7, title: "Bush Romance", description: "Private bush dinner beneath the stars : the firelight, the river, and you." },
      { day: 8, title: "Farewell Zambia", description: "Final game drive, then fly to Zanzibar and transfer to Xanadu Luxury Villas & Retreat." },
      { day: 9, title: "Ocean Arrival", description: "Settle into your private villa with plunge pool. Welcome dinner on your terrace overlooking the Indian Ocean." },
      { day: 10, title: "Island Leisure", description: "A day entirely at leisure : beach, pool, spa treatments, and unhurried island time." },
      { day: 11, title: "Spice & Stone", description: "Explore Stone Town's ancient corridors and wander a spice plantation in the island's aromatic heart." },
      { day: 12, title: "Departure", description: "Final beach morning, then transfer to Zanzibar Airport. Three worlds, one love story, a lifetime of memories." },
    ],
  },
  {
    id: "private-proposal-journey",
    title: "The Private Proposal Journey",
    subtitle: "The most important question, perfectly composed",
    image: IMAGES.lakeMalawiRomanceHero,
    description:
      "A four night journey built around the moment you ask the question. A private proposal setup with photographer, flowers and champagne, a candlelit dinner, and a sunset cruise : every detail arranged in secret, so the only thing you think about is the words.",
    duration: "4 nights",
    price: "Enquire Within",
    collection: "romance",
    destinations: ["lake-malawi", "zanzibar"],
    properties: ["kaya-mawa", "xanadu-villas"],
    inclusions: [
      "Luxury accommodation",
      "Private proposal setup",
      "Professional photographer",
      "Flowers and champagne",
      "Private candlelit dinner",
      "Sunset cruise",
      "Breakfast, selected lunches and dinners",
      "Airport and lodge transfers",
      "Domestic flights where applicable",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival on Likoma Island", description: "Fly to Likoma Island and settle into Kaya Mawa. Your Journey Concierge begins arranging the moment, entirely in secret." },
      { day: 2, title: "The Question", description: "A private sunset proposal on the jetty, photographer poised, flowers and champagne at the ready. Candlelit dinner on the beach to celebrate the answer." },
      { day: 3, title: "Fly to Zanzibar", description: "Morning cruise around the island, then fly to Zanzibar and settle into Xanadu Luxury Villas & Retreat for a celebration dinner." },
      { day: 4, title: "Departure", description: "A final breakfast on your terrace overlooking the Indian Ocean, then transfer to Zanzibar Airport. The journey begins." },
    ],
  },
  {
    id: "safari-sunset-romance",
    title: "Safari & Sunset Romance",
    subtitle: "Intimate encounters with the wild",
    image: IMAGES.chinzombo,
    description:
      "Five nights at the award winning Time+Tide Chinzombo in the heart of South Luangwa. Game drives at dawn, walking safaris through ancient wilderness, sundowners on the riverbank, and dinners beneath a canopy of stars.",
    duration: "5 nights",
    price: "Enquire Within",
    collection: "safari",
    destinations: ["south-luangwa"],
    properties: ["chinzombo"],
    inclusions: [
      "Luxury accommodation",
      "Full board dining",
      "Safari game drives",
      "Guided walking safaris",
      "Sundowners on the riverbank",
      "Bush breakfast",
      "Bush dinner",
      "Couples spa treatment",
      "Park fees",
      "Airport and lodge transfers",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival in the Wild", description: "Fly to Mfuwe and transfer to Time+Tide Chinzombo. Afternoon game drive along the Luangwa River." },
      { day: 2, title: "Safari Immersion", description: "Full day of game drives and guided walking safaris. Bush breakfast among the ebony groves." },
      { day: 3, title: "River Romance", description: "Private sundowners on the riverbank as hippos surface in the golden light. Dinner on your villa deck." },
      { day: 4, title: "Wilderness Farewell", description: "Dawn game drive, spa treatment by the river, and a private bush dinner beneath the stars." },
      { day: 5, title: "Departure", description: "Final game drive, brunch, and your flight home : the wild, and the two of you." },
    ],
  },
  {
    id: "island-romance-retreat",
    title: "Island Romance Retreat",
    subtitle: "A lakeside sanctuary for two",
    image: IMAGES.pumulani,
    description:
      "Five nights at Pumulani Lodge, where the Rift Valley escarpment meets the turquoise water of Lake Malawi. Days of sailing, snorkelling and lake cruises; evenings of private dining beneath a canopy of stars.",
    duration: "5 nights",
    price: "Enquire Within",
    collection: "beach-island",
    destinations: ["lake-malawi"],
    properties: ["pumulani-lodge"],
    inclusions: [
      "Luxury accommodation",
      "Full board dining",
      "Lake activities (kayaking, sailing, snorkelling)",
      "Private sunset cruise",
      "Couples spa treatment",
      "Private beach dinner",
      "Airport and lodge transfers",
      "Park fees",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival at the Lake", description: "Fly to Club Makokola Airstrip and transfer to Pumulani Lodge. Sunset drinks on the deck as the escarpment turns rose." },
      { day: 2, title: "Lake Discovery", description: "Sail, kayak and snorkel the cichlid filled waters of Lake Malawi National Park." },
      { day: 3, title: "Romance on the Water", description: "Private sunset cruise, followed by a couples spa treatment overlooking the lake." },
      { day: 4, title: "Island Farewell", description: "A day of beach time and a private candlelit dinner on the sand." },
      { day: 5, title: "Departure", description: "Final lake morning, then transfer onward. Africa's hidden beach escape, discovered." },
    ],
  },
  {
    id: "zanzibar-love-escape",
    title: "Zanzibar Love Escape",
    subtitle: "The Spice Island, made for two",
    image: IMAGES.xanadu,
    description:
      "Six nights across two of Zanzibar's most coveted addresses : the artistic vision of Xanadu Luxury Villas & Retreat and the Swahili grandeur of Baraza Resort & Spa. Spice scented days, dhow sailed sunsets, and Indian Ocean nights.",
    duration: "6 nights",
    price: "Enquire Within",
    collection: "beach-island",
    destinations: ["zanzibar"],
    properties: ["xanadu-villas", "baraza-resort-spa"],
    inclusions: [
      "Luxury villa accommodation",
      "Breakfast, selected lunches and dinners",
      "Couples spa treatment",
      "Sunset dhow cruise",
      "Stone Town tour",
      "Spice plantation visit",
      "Airport transfers",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival in Zanzibar", description: "Transfer to Xanadu Luxury Villas & Retreat. Settle into your private villa with plunge pool." },
      { day: 2, title: "Villa Life", description: "A day entirely at leisure : beach, pool, spa treatments, and the Indian Ocean as your horizon." },
      { day: 3, title: "Spice & Stone", description: "Wander Stone Town's ancient corridors and visit a spice plantation in the island's aromatic heart." },
      { day: 4, title: "The South Coast", description: "Transfer to Baraza Resort & Spa. A Swahili welcome and dinner beneath the palms." },
      { day: 5, title: "Ocean Romance", description: "Sunset dhow cruise along the coast, followed by a couples spa ritual using indigenous Zanzibari ingredients." },
      { day: 6, title: "Departure", description: "Final beach morning, then transfer to Zanzibar Airport. The Spice Island, and the two of you." },
    ],
  },
  {
    id: "anniversary-celebration",
    title: "Anniversary Celebration",
    subtitle: "Honour your story with a journey worthy of it",
    image: IMAGES.makokolaRetreat,
    description:
      "Celebrate the years you have built together : three nights at The Makokola Retreat on Lake Malawi's sun bleached shore, then four nights of wilderness romance at Time+Tide Chinzombo. Surprises composed at every turn.",
    duration: "7 nights",
    price: "Enquire Within",
    collection: "romance",
    destinations: ["lake-malawi", "south-luangwa"],
    properties: ["makokola-retreat", "chinzombo"],
    inclusions: [
      "Luxury accommodation",
      "Surprise room décor and champagne",
      "Private romantic dinner",
      "Sunset cruise",
      "Couples spa treatment",
      "Safari game drives",
      "Bush dinner",
      "Breakfast, selected lunches and dinners",
      "Airport and lodge transfers",
      "Domestic flights where applicable",
      "Park fees",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival at the Retreat", description: "Transfer to The Makokola Retreat. Welcome champagne and a suite prepared in celebration of your years together." },
      { day: 2, title: "Lakeside Celebration", description: "Days by the adult only infinity pool, a couples spa treatment, and dinner at Il Lago with the lake as your backdrop." },
      { day: 3, title: "Sunset Cruise", description: "Private sunset cruise along the southern shore, followed by an anniversary dinner on the sand." },
      { day: 4, title: "Journey to the Wild", description: "Fly to Mfuwe and transfer to Time+Tide Chinzombo. Afternoon game drive along the Luangwa River." },
      { day: 5, title: "Safari Romance", description: "Full day of game drives and walking safaris with award winning guides." },
      { day: 6, title: "Bush Celebration", description: "Private bush dinner beneath the stars, with a surprise composed for your anniversary." },
      { day: 7, title: "Departure", description: "Final game drive, brunch, and your flight home. Your story continues." },
    ],
  },
  {
    id: "luxury-african-couple-adventure",
    title: "Luxury African Couple Adventure",
    subtitle: "Wilderness and coastline : Africa's great contrast",
    image: IMAGES.pukuRidge,
    description:
      "Experience the contrast that defines Africa : five nights above the floodplains of South Luangwa at Puku Ridge Camp, then five nights of Swahili elegance at Baraza Resort & Spa on Zanzibar. The wild, and the coast, in one unforgettable journey.",
    duration: "10 nights",
    price: "Enquire Within",
    collection: "safari",
    destinations: ["south-luangwa", "zanzibar"],
    properties: ["puku-ridge-camp", "baraza-resort-spa"],
    inclusions: [
      "Luxury accommodation",
      "Full board dining",
      "Safari game drives",
      "Guided walking safaris",
      "Star bed experience",
      "Bush breakfast",
      "Couples spa treatment",
      "Sunset dhow cruise",
      "Park fees",
      "Airport and lodge transfers",
      "Domestic flights where applicable",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival at Puku Ridge", description: "Fly to Mfuwe and transfer to Puku Ridge Camp, raised above the floodplain with the park at your feet." },
      { day: 2, title: "Wilderness Immersion", description: "Game drives and guided walking safaris across one of Africa's greatest wildlife sanctuaries." },
      { day: 3, title: "The Heart of Luangwa", description: "Full day in the bush. Sundowners on the ridge as elephants cross the floodplain below." },
      { day: 4, title: "Star Bed Night", description: "Sleep beneath the Milky Way on a raised star bed, the sounds of the wild all around you." },
      { day: 5, title: "Farewell Zambia", description: "Final game drive, then fly to Zanzibar and transfer to Baraza Resort & Spa." },
      { day: 6, title: "Coast Arrival", description: "Settle into your Swahili villa. A welcome dinner beneath the palms." },
      { day: 7, title: "Ocean Days", description: "Beach, pool, and spa treatments. The Indian Ocean at your doorstep." },
      { day: 8, title: "Spice & Stone", description: "Explore Stone Town and wander a spice plantation in the island's aromatic heart." },
      { day: 9, title: "Dhow Sunset", description: "Private sunset dhow cruise, followed by a farewell dinner on the beach." },
      { day: 10, title: "Departure", description: "Final beach morning, then transfer to Zanzibar Airport. The great contrast, experienced." },
    ],
  },
  {
    id: "ultimate-african-romance",
    title: "The Ultimate African Romance",
    subtitle: "Kivara's premier journey for two",
    image: IMAGES.southLuangwaRomanceHero,
    description:
      "Fourteen nights across the finest of Africa : the hidden beaches of Kaya Mawa, the untamed wild of Time+Tide Chinzombo, and the artistic luxury of Xanadu on Zanzibar. Private transfers, curated dining, and a dedicated Journey Concierge : the journey of a lifetime, in every sense.",
    duration: "14 nights",
    price: "Enquire Within",
    collection: "romance",
    destinations: ["lake-malawi", "south-luangwa", "zanzibar"],
    properties: ["kaya-mawa", "chinzombo", "xanadu-villas"],
    inclusions: [
      "Luxury accommodation",
      "Breakfast, selected lunches and dinners",
      "All private transfers",
      "Domestic flights where applicable",
      "Private sunset cruises",
      "Couples spa treatments",
      "Safari game drives and walking safaris",
      "Bush breakfast and bush dinner",
      "Private beach dinner",
      "Park fees",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Arrival on Likoma Island", description: "Fly from Lilongwe to Likoma Island and settle into Kaya Mawa. Champagne on the jetty as the lake turns to gold." },
      { day: 2, title: "Island Life", description: "Kayak hidden coves, snorkel cichlid filled reefs, and picnic on a private stretch of sand." },
      { day: 3, title: "Lake Romance", description: "Private sunset dhow cruise and a couples spa treatment at the Kaya Mawa Spa." },
      { day: 4, title: "Island Exploration", description: "Explore Likoma's village life and the island's historic cathedral. Sundowners on a hidden beach." },
      { day: 5, title: "Journey South", description: "Fly to Mfuwe and transfer to Time+Tide Chinzombo. Afternoon game drive along the Luangwa River." },
      { day: 6, title: "Safari Begins", description: "Full day of game drives and walking safaris. Bush breakfast among the ebony groves." },
      { day: 7, title: "Wilderness Immersion", description: "Dawn drive, wild swimming, and an afternoon of riverside tranquillity." },
      { day: 8, title: "Bush Romance", description: "Private bush dinner beneath the stars : the firelight, the river, and you." },
      { day: 9, title: "Farewell Zambia", description: "Final game drive, then fly to Zanzibar and transfer to Xanadu Luxury Villas & Retreat." },
      { day: 10, title: "Ocean Arrival", description: "Settle into your private villa with plunge pool. Welcome dinner on your terrace." },
      { day: 11, title: "Island Leisure", description: "A day entirely at leisure : beach, pool, spa, and unhurried island time." },
      { day: 12, title: "Spice & Stone", description: "Wander Stone Town's ancient corridors and visit a spice plantation in the island's aromatic heart." },
      { day: 13, title: "Final Romance", description: "Private beach dinner and a sunset dhow cruise to close the journey in style." },
      { day: 14, title: "Departure", description: "Final beach morning, then transfer to Zanzibar Airport. The ultimate African romance, complete." },
    ],
  },
  {
    id: "kivara-bespoke-private-journey",
    title: "Kivara Bespoke Private Journey",
    subtitle: "Africa, composed entirely around you",
    image: IMAGES.xanadu,
    description:
      "A fully customised itinerary built around your vision : a honeymoon, a proposal, an anniversary, a wellness retreat, or a multi country African adventure. Kivara's Journey Concierge composes every detail around your wishes, your rhythm, and your story.",
    duration: "Fully customised",
    price: "Enquire Within",
    collection: "bespoke",
    destinations: ["lake-malawi", "south-luangwa", "zanzibar"],
    properties: ["kaya-mawa", "pumulani-lodge", "makokola-retreat", "chinzombo", "puku-ridge-camp", "xanadu-villas", "baraza-resort-spa"],
    inclusions: [
      "Fully customised itinerary",
      "Luxury accommodation",
      "Breakfast, selected lunches and dinners",
      "All private transfers",
      "Domestic flights where applicable",
      "Private experiences composed around your wishes",
      "Dedicated Kivara Journey Concierge",
    ],
    excludes: [
      "International flights",
      "Visa fees",
      "Travel insurance",
      "Premium beverages",
      "Personal expenses",
      "Gratuities",
    ],
    itinerary: [
      { day: 1, title: "Your Arrival", description: "Met by your dedicated Kivara Journey Concierge, with your itinerary refined and polished around your every wish." },
      { day: 2, title: "Your World", description: "Choose from Lake Malawi's hidden beaches, South Luangwa's untamed wilderness, or Zanzibar's spice scented shores." },
      { day: 3, title: "Your Moments", description: "Private dinners, proposals, spa rituals, game drives, or cultural encounters : composed entirely for you." },
      { day: 4, title: "Your Legacy", description: "Depart with a journey that could never be repeated. This is yours alone." },
    ],
  },
];

export const JOURNEY_COLLECTIONS = [
  {
    id: "romance",
    title: "Romance Collection",
    description: "Honeymoons, proposals and anniversaries crafted for two across Africa's most romantic landscapes.",
    image: IMAGES.kayaMawa,
  },
  {
    id: "safari",
    title: "Safari Collection",
    description: "Intimate wilderness encounters in the birthplace of the walking safari.",
    image: IMAGES.chinzombo,
  },
  {
    id: "beach-island",
    title: "Beach & Island Collection",
    description: "Turquoise waters and powder white sands on Lake Malawi and the Zanzibar Archipelago.",
    image: IMAGES.baraza,
  },
  {
    id: "bespoke",
    title: "Bespoke Journeys",
    description: "Fully customised journeys composed entirely around your vision.",
    image: "/images/xanadu-1.jpg",
  },
];

export const DESTINATION_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  "lake-malawi": { lat: -13.0, lng: 34.7, zoom: 7 },
  "south-luangwa": { lat: -13.0, lng: 31.8, zoom: 9 },
  "zanzibar": { lat: -6.15, lng: 39.3, zoom: 10 },
};

export const TESTIMONIALS = [
  {
    name: "Sarah and James Mitchell",
    location: "London, United Kingdom",
    text: "From the moment we landed in Malawi to our final sundowner at Baraza Resort & Spa in Zanzibar, every detail was flawless. James teared up at Kaya Mawa : our private dinner on the jetty, the lake glowing under stars. This was not a trip. It was the beginning of our love story.",
    destination: "Lake Malawi and Zanzibar",
    rating: 5,
  },
  {
    name: "Emma and Thomas Chen",
    location: "Sydney, Australia",
    text: "We have travelled the world, but nothing compares to walking the Luangva floodplain at dawn with the Puku Ridge team. Our guide, Moses, read the bush like a living map. We saw wild dogs hunt, slept on a star bed under the Milky Way, and came home quieter. Changed, somehow.",
    destination: "South Luangwa",
    rating: 5,
  },
  {
    name: "Alexander and Natalia Petrov",
    location: "Oslo, Norway",
    text: "Baraza's Royal Sultan Villa was pure magic : we barely left our plunge pool for two days. But it was the small things that undid us: fresh coconuts brought to our beach loungers without asking, a surprise spice tour arranged overnight. They think of everything. We are already planning our return.",
    destination: "Zanzibar",
    rating: 5,
  },
  {
    name: "Michael and Olivia Barnes",
    location: "New York, USA",
    text: "The Beach and Bush Escape was perfect: swimming Lake Malawi at Kaya Mawa one day, tracking leopards with the Chinzombo team the next. But what stayed with us was the transfer : Kivara met us at every airport, every connection, seamless. They do not plan trips. They compose journeys.",
    destination: "Lake Malawi and South Luangwa",
    rating: 5,
  },
];

export const EXPERIENCES = [
  {
    id: "private-beach-dining",
    title: "Private Beach Dining",
    description: "An intimate dinner beneath the stars with your toes in the sand. A table for two, candlelight, and the rhythm of waves as your soundtrack. The ultimate expression of romance.",
    image: IMAGES.dining,
    category: "Romance",
    destination: "lake-malawi",
    coordinates: { lat: -12.059, lng: 34.734 },
  },
  {
    id: "walking-safari",
    title: "Walking Safaris",
    description: "Follow in the footsteps of explorers on a guided walking safari. Feel the earth beneath your feet and connect with Africa on its own terms. There is no more intimate way to experience the wild.",
    image: IMAGES.walking,
    category: "Safari",
    destination: "south-luangwa",
    coordinates: { lat: -13.017, lng: 31.767 },
  },
  {
    id: "sunset-dhow",
    title: "Sunset Dhow Cruises",
    description: "Sail into the golden hour on a traditional dhow. Champagne in hand, the sky painted in amber and rose. A moment you will carry in your heart forever.",
    image: IMAGES.dhow,
    category: "Romance",
    destination: "zanzibar",
    coordinates: { lat: -6.15, lng: 39.483 },
  },
  {
    id: "couples-spa",
    title: "Couples Spa Rituals",
    description: "Side by side treatments in open air pavilions overlooking the ocean or bush. Ancient techniques meet modern wellness. Connection deepens with every breath.",
    image: IMAGES.spa,
    category: "Wellness",
    destination: "zanzibar",
    coordinates: { lat: -6.367, lng: 39.517 },
  },
  {
    id: "star-bed",
    title: "Star Bed Safaris",
    description: "Sleep beneath a canopy of African stars on a raised platform in the wilderness. The ultimate romantic safari experience. You and the universe. Nothing between.",
    image: IMAGES.starbed,
    category: "Romance",
    destination: "south-luangwa",
    coordinates: { lat: -12.983, lng: 31.7 },
  },
  {
    id: "bush-dining",
    title: "Bush Dining",
    description: "A table set in the wilderness, surrounded by lanterns and the sounds of the African night. Fine dining meets raw nature. An evening you will never forget.",
    image: IMAGES.bushDining,
    category: "Dining",
    destination: "south-luangwa",
    coordinates: { lat: -13.02, lng: 31.77 },
  },
];

// JOURNAL_POSTS removed : now served from blog_posts table via getMergedBlogPosts()
// See supabase/migrations/011_journal_posts.sql for the seed data.
