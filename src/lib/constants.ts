// ─── Kivara Luxury Travel ──────────────────────────────────────────────
// Africa's most coveted romance sanctuary.
// We occupy the space between Aman's serenity and &Beyond's wilderness.
// ──────────────────────────────────────────────────────────────────────

// ─── UNSplash Image Library ───────────────────────────────────────────
// Cinematic imagery sourced for each destination and property

export const IMAGES = {
  // Lake Malawi (updated with images from Green Safaris)
  lakeMalawiHero: "/images/likoma-lake-of-stars.jpg",
  lakeMalawiAerial: "/images/likoma-scuba.jpg",
  lakeMalawiSunset: "/images/likoma-paddleboard-view.jpg",
  lakeMalawiBeach: "/images/likoma-snorkelling.jpg",
  lakeMalawiDhow: "/images/likoma-kayaking.jpg",
  lakeMalawiIsland: "/images/likoma-paddleboard.jpg",

  // South Luangwa
  southLuangwaHero: "/images/south-luangwa-hero.jpg",
  southLuangwaElephant: "/images/south-luangwa-elephant.jpg",
  southLuangwaLeopard: "/images/south-luangwa-camp.jpg",
  southLuangwaSunset: "/images/south-luangwa-sunset.jpg",
  southLuangwaSafari: "/images/south-luangwa-safari.jpg",
  southLuangwaCamp: "/images/south-luangwa-camp.jpg",

  // Zanzibar
  zanzibarHero: "/images/zanzibar-hero.jpg",
  zanzibarBeach: "/images/zanzibar-beach.jpg",
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
  blueZebra: "/images/bz-cormorant-chalet.jpg",
  makokolaRetreat: "/images/makokola-retreat.jpg",
  chinzombo: "/images/chinzombo.jpg",
  pukuRidge: "/images/puku-ridge.jpg",
  shawaLuangwa: "/images/shawa-luangwa.jpg",
  luangwaRiver: "/images/luangwa-river.jpg",
  xanadu: "/images/xanadu.jpg",
  kilindi: "/images/kilindi.jpg",
  baraza: "/images/baraza.jpg",
  palms: "/images/the-palms.jpg",
  whiteSand: "/images/white-sand.jpg",
  residence: "/images/residence.jpg",

  // Experiences
  dining: "/images/dining.jpg",
  walking: "/images/walking.jpg",
  dhow: "/images/dhow.jpg",
  spa: "/images/spa.jpg",
  starbed: "/images/starbed.jpg",
  bushDining: "/images/bush-dining.jpg",

  // Journal
  journalHoneymoon: "/images/journal-honeymoon.jpg",
  journalMalawi: "/images/journal-malawi.jpg",
  journalWalking: "/images/journal-walking.jpg",
  journalZanzibar: "/images/journal-zanzibar.jpg",

  // Hero video poster frames
  heroPoster: "/images/hero-poster.jpg",
} as const;

export const BRAND_POSITIONING = {
  tagline: "Where the Soul of the Bush Meets the Serenity of the Shore.",
  description:
    "A handcrafted collection of Africa's most exquisite beach and bush escapes. Curated exclusively for couples who refuse to compromise on beauty, intimacy, or refinement.",
  betweenAmanAndBeyond:
    "We occupy the space between Aman's serenity and &Beyond's wilderness. Like Aman, we worship space and silence. Like &Beyond, we honor the raw and the wild. We are Kivara: Africa's most romantic gateway.",
  storyBrand: {
    hero: "You. A couple in love. A partnership that deserves celebrating.",
    problem: "Most vacations distract. You deserve a journey that deepens your connection.",
    guide: "Kivara. Your personal curators of romance. We know Africa's most secret gardens, its most intimate camps, its most soul-stirring shorelines.",
    plan: "A bespoke journey around your love story. Three destinations. Nine extraordinary properties. Infinite moments of wonder.",
    callToAction: "Begin Your Journey.",
    success: "You return transformed. Closer. More in love. Africa stays with you forever.",
    stakes: "Settle for ordinary, and Africa's magic stays someone else's story. The golden light over Luangwa. The silence of a Lake Malawi sunrise. The scent of cloves in Zanzibar's twilight. These are yours for the taking.",
  },
};

export const SITE_CONFIG = {
  name: "Kivara",
  tagline: BRAND_POSITIONING.tagline,
  description: BRAND_POSITIONING.description,
  url: "https://kivara.luxury",
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
    body: "'Montserrat', 'Inter', 'Helvetica Neue', Arial, sans-serif",
  },
};

export const DESTINATIONS = [
  {
    id: "lake-malawi",
    title: "Lake Malawi",
    subtitle: "Africa's Best Kept Secret. Your Private Freshwater Paradise.",
    tagline: "Where the lake becomes an ocean of tranquility",
    description:
      "Lake Malawi. Africa's third largest lake holds crystal waters, shores untouched by time, and an atmosphere of such profound serenity that couples find themselves speaking in whispers.",
    positioning:
      "Horizon of water and sky. Kayak at dawn. Dine beneath constellations on a private beach. Kaya Mawa, Pumulani, Blue Zebra Island Lodge, and The Makokola Retreat each write their own chapter of this love story. Africa's hidden luxury beach escape. Reserved for those who know where to look.",
    heroImage: IMAGES.lakeMalawiHero,
    slug: "lake-malawi",
    properties: ["kaya-mawa", "pumulani-lodge", "blue-zebra-island-lodge", "makokola-retreat"],
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
    title: "South Luangwa",
    subtitle: "The Birthplace of the Walking Safari. The Soul of African Wilderness.",
    tagline: "Where intimacy with the wild transforms you",
    description:
      "South Luangwa. The birthplace of the walking safari. An unfiltered communion with the natural world that strips away everything unnecessary and leaves only what matters.",
    positioning:
      "Africa as it was before fences, before crowds, before compromise. Here, luxury means falling asleep to the rumble of lions and waking to the call of fish eagles. Four extraordinary properties — Time+Tide Chinzombo, Puku Ridge Camp, Shawa Luangwa Camp, and Luangwa River Camp — each offers a different window into this ancient world. From award-winning riverside villas to silent electric safaris, this is safari luxury for those who seek not just to see Africa but to feel it.",
    heroImage: IMAGES.southLuangwaHero,
    slug: "south-luangwa",
    properties: ["chinzombo", "puku-ridge-camp", "shawa-luangwa", "luangwa-river-camp"],
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
    title: "Zanzibar",
    subtitle: "The Spice Island. The Apex of Tropical Romance.",
    tagline: "Where history, spice, and turquoise waters converge",
    description:
      "Zanzibar. A love letter written in cinnamon and clove. Stone Town alleyways lead to beaches of impossible beauty. The Indian Ocean trades in shades of turquoise no artist could replicate.",
    positioning:
      "Culture and paradise intertwined. Spice-scented corridors, dhows sailing into fiery sunsets, and four extraordinary properties — Xanadu Luxury Villas & Retreat, Kilindi Zanzibar, Baraza Resort & Spa, and The Palms Zanzibar — each a sanctuary of romance. From the white-domed pavilions of Kilindi to the all-inclusive Swahili elegance of Baraza, from the intimate six-villa exclusivity of The Palms to the artistic design of Xanadu. Tropical elegance, refined to perfection.",
    heroImage: IMAGES.zanzibarHero,
    slug: "zanzibar",
    properties: ["xanadu-villas", "kilindi-zanzibar", "baraza-resort-spa", "the-palms-zanzibar"],
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
      closed: "Open year-round - occasional short rains in November and April/May",
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
    tagline: "Barefoot luxury on a private island sanctuary",
    description:
      "Perched on the shores of Likoma Island, Kaya Mawa is the apotheosis of barefoot luxury. Each suite handcrafted from local stone and thatch, opening to panoramic views of Lake Malawi's crystalline waters. A place where time suspends and love deepens.",
    longDescription:
      "Kaya Mawa is not a lodge. It is a sanctuary on one of Africa's most beautiful islands, built into the rocky shoreline with such reverence that the landscape remains the protagonist. Each of the eleven houses and rooms offers complete privacy with sweeping lake views, designed in a philosophy of minimal intervention: local stone, handwoven textiles, and an architecture that lets the water take center stage. Some suites feature their own private plunge pools carved from the granite shoreline. Days unfold at nature's pace. Swim in the infinity-edge pool that merges with the lake — Africa's fourth-largest. Explore hidden coves by kayak or stand-up paddleboard. Dive into the crystalline depths with the on-site PADI dive centre. Lose yourself in a novel on your private deck while the lake whispers below. The restaurant serves farm-to-table cuisine with a Malawian soul. The over-water Sunset Bar perches above the lake for sundowners that linger into starlit evenings. Kaya Mawa is operated by Green Safaris, running entirely on 100% renewable solar energy, and its Kaya Mawa Foundation champions education and enterprise on the island. Open annually from mid-March to mid-January.",
    heroImage: IMAGES.kayaMawa,
    gallery: [IMAGES.kayaMawa, IMAGES.kayaMawaSnorkel, IMAGES.kayaMawaPicnic, IMAGES.kayaMawaSailing],
    priceRange: "$450 to $735 per person per night",
    roomTypes: ["Standard Room", "Nkhwazi Suite", "Mbamba Suite", "Madimba House", "Mainja House", "Ndomo Private House"],
    amenities: [
      "Infinity-edge swimming pool",
      "Over-water Sunset Bar",
      "Farm-to-table restaurant",
      "Private beach coves",
      "PADI dive centre",
      "Kayaking and stand-up paddleboarding",
      "Sailing and wakeboarding",
      "Quad biking and e-biking",
      "Spa treatments",
      "100% solar-powered",
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
        description: "A spacious suite with a separate sitting area, indoor-outdoor bathroom with a freestanding bathtub, and a wide terrace overlooking the lake.",
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
        description: "Our most coveted accommodation — a private house with its own infinity pool, expansive deck, and uninterrupted views across the Lake of Stars.",
        images: [
          "/images/gs--11.madimba-bedroom_1.jpg",
          "/images/kaya-mawa-madimba-evening-pool-view.jpg",
          "/images/gs--13.madimba-bathroom_1.jpg",
        ],
        sleeps: 3,
      },
      {
        name: "Mainja House",
        description: "A sprawling two-bedroom house ideal for small groups or families, with a private pool, outdoor dining pavilion, and direct beach access.",
        images: [
          "/images/gs--286.mainja-bedroom.jpg",
          "/images/gs--283.mainja-pool_1.jpg",
          "/images/kaya-mawa-mainja-dinner-on-terrace.jpg",
        ],
        sleeps: 5,
      },
      {
        name: "Ndomo Private House",
        description: "The ultimate exclusive-use experience — a completely private house with dedicated staff, private beach access, and an outdoor living area perched above the lake.",
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
    tagline: "Where the lake meets the sky in perfect stillness",
    description:
      "Set on a private peninsula on the Nankumba Peninsula, Pumulani Lodge offers ten secluded villas with breathtaking views across Lake Malawi. A place of serene beauty and understated elegance where couples rediscover each other.",
    longDescription:
      "Pumulani Lodge occupies a pristine stretch of the Nankumba Peninsula, offering a level of seclusion that feels like your own private world. The ten villas embody a contemporary African aesthetic: clean architectural lines, natural materials, and floor-to-ceiling windows that frame the lake as living art. Each villa features its own plunge pool and outdoor shower, creating an indoor-outdoor living experience that dissolves the boundary between luxury and nature. The main lodge houses a stunning infinity pool, a curated library, and a dining room where the seasonal menu celebrates the flavours of Malawi with a sophistication that rivals the world's finest restaurants. Operated by the award-winning Robin Pope Safaris, Pumulani operates on a Fully Inclusive Plus basis: all meals, select premium drinks, laundry, and a wide range of activities are included. From water-skiing and sailing to guided nature walks, mountain biking, and visits to local villages, every day offers a new adventure or perfect stillness — entirely on your terms.",
    heroImage: IMAGES.pumulani,
    gallery: [IMAGES.lakeMalawiSunset, IMAGES.lakeMalawiBeach, IMAGES.lakeMalawiAerial],
    priceRange: "$370 to $505 per person per night",
    roomTypes: ["Standard Villa", "Superior Villa", "Honeymoon Villa"],
    amenities: [
      "Private plunge pool per villa",
      "Infinity pool overlooking the lake",
      "Outdoor shower",
      "Restaurant and bar",
      "Water-skiing and sailing",
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
        description: "A light-filled villa with floor-to-ceiling windows overlooking the lake, a private plunge pool, and an outdoor shower. Contemporary African design meets barefoot luxury.",
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
        description: "A more spacious villa with premium lake views, a larger private plunge pool, and an extended sun deck. The indoor-outdoor bathroom features a freestanding bath.",
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
        description: "The pinnacle of romance — positioned at the tip of the peninsula for uninterrupted panoramic views. Features include an infinity-edge plunge pool, outdoor shower, and a private sala.",
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
    id: "blue-zebra-island-lodge",
    name: "Blue Zebra Island Lodge",
    destination: "lake-malawi",
    location: "Nankoma Island, Lake Malawi National Park",
    tagline: "An island of your own in the Lake of Stars",
    description:
      "Exclusively set on Nankoma Island within the UNESCO-listed Lake Malawi National Park, Blue Zebra Island Lodge offers an intimate island escape with pristine beaches and the finest freshwater snorkelling in Africa.",
    longDescription:
      "Blue Zebra Island Lodge occupies its own private island in the crystalline waters of Lake Malawi National Park, a UNESCO World Heritage site renowned for its extraordinary biodiversity. With just twelve rooms ranging from Executive Chalets to Lake Safari Tents, the lodge offers an intimacy increasingly rare in travel. The island is a sanctuary for birdlife; the surrounding waters are a haven for snorkellers and divers exploring the most biodiverse freshwater ecosystem on earth, home to over a thousand species of colourful cichlids found nowhere else. The infinity pool gazes across the lake to the mountains of Mozambique. The Island Spa offers treatments on a deck suspended above the water. Days are spent exploring the island's coves by kayak, snorkelling in the crystal-clear shallows, meandering the nature trails, or simply swaying in a hammock with the sound of lapping water as your only companion.",
    heroImage: IMAGES.blueZebra,
    gallery: ["/images/bz-lounge.jpg", "/images/bz-beach-dining.jpg", "/images/bz-cottage-exterior.jpg", "/images/bz-cormorant-chalet.jpg"],
    priceRange: "$300 to $600 per night",
    roomTypes: ["Executive Chalet", "Executive Family Chalet", "Superior Family Cottage", "Lake Safari Tent"],
    rooms: [
      {
        name: "Executive Chalet",
        description: "Secluded chalets immersed in nature — Sandpiper and Cormorant — with stunning views across Lake Malawi. Perfect for honeymooners, couples and solo travellers.",
        images: ["/images/bz-cottage-exterior.jpg", "/images/bz-cormorant-chalet.jpg", "/images/bz-bedroom.jpg"],
        sleeps: 2,
      },
      {
        name: "Executive Family Chalet",
        description: "Spacious safari-style family chalets — Malachite and Fisheagle — with two bedrooms separated by a lounge leading out to a large balcony overlooking Lake Malawi.",
        images: ["/images/bz-executive-family-chalet.jpg", "/images/bz-lounge.jpg", "/images/bz-cottage-exterior.jpg"],
        sleeps: 4,
      },
      {
        name: "Superior Family Cottage",
        description: "An open-planned house with a lounge, dining area and two en-suite bedrooms. Breathtaking views and bird-watching from the balcony.",
        images: ["/images/bz-superior-cottage.jpg", "/images/bz-cottage-exterior.jpg"],
        sleeps: 6,
      },
      {
        name: "Lake Safari Tent",
        description: "Quaint and comfortable tents — Heron, Darter, Hornbill and Bulbul — nestled along the shoreline with direct access to the lake.",
        images: ["/images/bz-lake-safari-tent.jpg", "/images/bz-tent-gallery.jpg"],
        sleeps: 2,
      },
    ],
    amenities: [
      "Private island within UNESCO National Park",
      "Infinity pool with views across to Mozambique",
      "Island Spa with over-water treatment deck",
      "Snorkelling gear with cichlid-rich reefs",
      "PADI dive centre",
      "Kayaking and paddleboarding",
      "Sunset cruises and tubing",
      "Nature trails and birdwatching",
      "Yoga deck",
      "Restaurant and bar",
      "Beach loungers and hammocks",
      "Complimentary WiFi",
    ],
    rating: 4.7,
    reviews: [
      { name: "David and Claire Mueller", text: "An island paradise. The snorkelling was world class and the staff made us feel like the only people on earth.", location: "Berlin, Germany" },
    ],
    romanticHighlights: [
      "Exclusive island exploration for two",
      "Snorkelling hand in hand through crystal-clear coves filled with rainbow cichlids",
      "Private beachfront dining under the stars",
      "Sunset walks around your private island",
      "Couples treatments at the over-water spa",
    ],
  },
  {
    id: "makokola-retreat",
    name: "The Makokola Retreat",
    destination: "lake-malawi",
    location: "Southern Shore, Lake Malawi",
    tagline: "A lakeside estate where elegance meets the wild beauty of Malawi",
    description:
      "Set along the palm-fringed southern shore of Lake Malawi, The Makokola Retreat is a gracious resort estate blending African design, culture, and tradition. From the adult-only Lake Suites with private infinity pool to the championship golf course, every detail captures the essence of lakeside luxury.",
    longDescription:
      "The Makokola Retreat is a destination unto itself, set on the brilliant white sands of Lake Malawi's southern shore. With a total of 70 rooms across multiple categories, the Retreat offers a diversity of experiences within one stunning property. The crown jewel is the Lake Suite section — an adult-only enclave of 22 luxury suites and the Sunset Villa, each with air conditioning, flat-screen TV, mini-fridge, and a private terrace or balcony with spectacular lake views. Guests in this section enjoy their own private infinity pool, dedicated bar, and access to the state-of-the-art TechnoGym. The Superior Beach Rooms, completely redesigned in 2021, offer thatch-roofed charm with modern amenities. Dining is an eclectic journey: Il Lago serves Italian and Mediterranean cuisine in an al fresco setting overlooking the lake, while Harry's Bar offers casual lakeside fare and sundowners. The Coffee Lounge provides a quiet retreat with unlimited WiFi. Beyond the rooms, the Retreat boasts a nine-hole par-three golf course at Mlambe, a flood-lit bowling green, and lush botanical gardens. The Tropex Nursery at the entrance invites guests to explore indigenous flora and take a piece of Malawi home.",
    heroImage: IMAGES.makokolaRetreat,
    gallery: ["/images/mk-retreat-01.jpg", "/images/mk-retreat-04.jpg", "/images/mk-sunset-villa-02.jpg", "/images/mk-lake-suite-01.jpg"],
    priceRange: "$250 to $550 per night",
    roomTypes: ["Sunset Villa", "Lake Suite", "Superior Beach Room", "Standard Beach Room", "Garden Room"],
    rooms: [
      {
        name: "Sunset Villa",
        description: "The crown jewel of the Retreat — a two-level villa with a king-size bedroom upstairs, panoramic lake views, a living room, and a private infinity pool that surrounds the room on both sides.",
        images: ["/images/mk-sunset-villa-01.jpg", "/images/mk-sunset-villa-02.jpg", "/images/mk-sunset-villa-03.jpg"],
        sleeps: 2,
      },
      {
        name: "Lake Suite",
        description: "Adult-only luxury suites with private terrace or balcony overlooking Lake Malawi. En-suite bathrooms, flat-screen TV, mini-fridge, and exclusive access to the Lake Suite infinity pool and bar.",
        images: ["/images/mk-lake-suite-01.jpg", "/images/mk-lake-suite-02.jpg", "/images/mk-lake-suite-03.jpg"],
        sleeps: 2,
      },
      {
        name: "Superior Beach Room",
        description: "Thatch-roofed rooms completely redesigned in 2021, with beach and partial lake views. Modern amenities include flat-screen TV, AC, mini-fridge, and a private terrace.",
        images: ["/images/mk-superior-room-01.jpg", "/images/mk-superior-room-02.jpg", "/images/mk-superior-room-03.jpg"],
        sleeps: 2,
      },
    ],
    amenities: [
      "Adult-only Lake Suite infinity pool",
      "Nine-hole par-three golf course (Mlambe)",
      "Flood-lit bowling green",
      "Il Lago Italian restaurant",
      "Harry's Bar lakeside bar",
      "Coffee Lounge with complimentary WiFi",
      "State-of-the-art TechnoGym",
      "Multiple swimming pools",
      "Water sports and boat excursions",
      "Conference and wedding facilities",
      "Tropex botanical nursery",
      "Complimentary WiFi in public areas",
      "Air conditioning in Lake Suites",
      "Electronic safe and mini-fridge in all rooms",
    ],
    rating: 4.5,
    reviews: [
      { name: "Robert and Catherine Thompson", text: "A wonderful resort with stunning lake views. The Lake Suite was beautifully appointed and the golf course was a delightful surprise.", location: "Toronto, Canada" },
    ],
    romanticHighlights: [
      "Adult-only Lake Suites with private infinity pool for two",
      "Sundowners at Harry's Bar as the sun sets over Lake Malawi",
      "Couples golf on the nine-hole Mlambe course",
      "Stargazing from your Lake Suite terrace with a Malawian gin and tonic",
      "Candlelit dinner at Il Lago with the lake as your backdrop",
    ],
  },
  {
    id: "chinzombo",
    name: "Time + Tide Chinzombo",
    destination: "south-luangwa",
    location: "South Luangwa National Park, Zambia",
    tagline: "The ultimate in wild luxury at Zambia's premier safari camp",
    description:
      "Set on a sweeping curve of the Luangwa River within 60 acres of private land, Time+Tide Chinzombo brings award-winning style and sophistication to the Luangwa Valley. Six luxurious villas, each with a private plunge pool, redefine the boundaries of bush luxury.",
    longDescription:
      "Named after a species of acacia that grows near camp, Time+Tide Chinzombo's natural building materials and vintage accents blend modern style with the best of a traditional bush safari camp. Designed by award-winning architects Silvio Rech and Lesley Carstens, the camp won Best New Property in Africa in 2014 and again in 2015. Its six spacious luxury safari villas (including a two-bedroom, two-bathroom family villa) rest beneath ancient msikizi trees. Each has a private plunge pool, a soaking tub with panoramic views over the river, and an open-plan design featuring canvas, timber, and reed accented with leather and raw linen. Each stretches out onto a shaded verandah where you can while away the afternoon or unwind with an in-villa spa treatment. Down a winding path, the main lodge beckons with a riverfront sun deck, an open-air library, a bar rich with old books and photographs, and a fire pit suspended high atop the river bank. Here, dining is a celebration of Zambian flavours enriched by produce grown in the camp's own garden.",
    heroImage: IMAGES.chinzombo,
    gallery: [IMAGES.southLuangwaSafari, IMAGES.southLuangwaElephant, IMAGES.southLuangwaLeopard],
    priceRange: "From $1,330 per person per night",
    roomTypes: ["Luxury Safari Villa", "Family Safari Villa (2BR, 2BA)"],
    amenities: [
      "Private plunge pool per villa",
      "Soaking tub with riverfront views",
      "Award-winning architectural design",
      "Morning and afternoon game drives",
      "Guided walking safaris",
      "Seasonal boat cruises",
      "Cultural village visits",
      "20-minute welcome massage included",
      "In-villa spa treatments",
      "Sleepout under the stars",
      "Riverfront dining and fire pit",
      "WiFi in villas",
      "Eco-cooled sleeping areas",
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
      "In-villa spa treatments side by side",
      "Sleepout under the stars on a private platform",
      "Candlelit dinners grown from the camp's own garden",
    ],
  },
  {
    id: "puku-ridge-camp",
    name: "Puku Ridge Camp",
    destination: "south-luangwa",
    location: "South Luangwa National Park, Zambia",
    tagline: "Hilltop luxury with a front-row seat to the African wilderness",
    description:
      "Perched on an elevated ridge overlooking the Kakumbi Floodplain, Puku Ridge Camp offers eight air-conditioned luxury suites, each with its own plunge pool and star bed tower. An experience that brings you face to face with the wild.",
    longDescription:
      "Puku Ridge Camp occupies a spectacular hilltop position in the South Luangwa National Park, commanding panoramic views of the sprawling Kakumbi Floodplain below. Rebuilt in 2019, the camp's eight luxury tented suites are ranged across the hillside, each featuring a super-king or twin bed configuration, air conditioning (a rare and welcome luxury in the Luangwa Valley), and en-suite facilities with his-and-hers washbasins and a large bathtub with a view. Outside, a multi-level verandah with a private plunge pool overlooks the plains, while a tower above the bathroom offers a star bed for a night under the vast African sky. The main area features indoor and open-air lounges, a bar, a campfire, and a photographic hide overlooking a waterhole that draws predators and prey alike. Zambia is renowned for its walking safaris, and Puku Ridge's award-winning guides lead both vehicle and foot explorations, including night drives using an award-winning red-light protocol that allows guests to observe nocturnal predators undisturbed.",
    heroImage: IMAGES.pukuRidge,
    gallery: [IMAGES.southLuangwaSafari, IMAGES.southLuangwaElephant, IMAGES.southLuangwaLeopard],
    priceRange: "$800 to $1,500 per person per night",
    roomTypes: ["Luxury Safari Suite", "Premium Safari Suite"],
    amenities: [
      "Private plunge pool per suite",
      "Air conditioning (rare in the Luangwa Valley)",
      "Star bed tower for sleeping under the stars",
      "Morning and evening game drives",
      "Night drives with award-winning red-light protocol",
      "Guided walking safaris",
      "Photographic hide overlooking waterhole",
      "Bush dining under the stars",
      "Minibar with tea and coffee station",
      "Complimentary WiFi",
      "24/7 220V power with international charging",
      "Indoor and outdoor showers",
      "Campfire and open-air lounge",
    ],
    rating: 4.9,
    reviews: [
      { name: "Robert and Catherine Thompson", text: "The most incredible wildlife experience of our lives. We watched a leopard stalk from our plunge pool. Unforgettable.", location: "Toronto, Canada" },
      { name: "Guest, Puku Ridge", text: "A beautiful lodge with first-rate service and imaginative, well-presented food. Well designed and comfortable rooms with tremendous views.", location: "Chiawa Safaris Guest" },
    ],
    romanticHighlights: [
      "Sundowners on the ridge as the sun sets over the floodplain",
      "Private star bed sleepout for two beneath the Milky Way",
      "Bush dinners surrounded by lantern light with views of the waterhole",
      "Exclusive walking safaris for two with a private guide",
      "Wildlife viewing from your private plunge pool",
    ],
  },
  {
    id: "shawa-luangwa",
    name: "Shawa Luangwa Camp",
    destination: "south-luangwa",
    location: "Nsefu Sector, South Luangwa National Park, Zambia",
    tagline: "Intimate eco-luxury on the banks of the Luangwa River",
    description:
      "A small, eco-friendly bush camp overlooking the Luangwa River in the Nsefu Sector. Named after legendary Zambian guide Jacob Shawa, this intimate camp offers silent safaris in solar-powered electric vehicles and an immersion into one of the park's most untouched areas.",
    longDescription:
      "Shawa Luangwa Camp rests on the eastern bank of the Luangwa River, overlooking the sweeping landscape of the Nsefu Sector — one of the park's most pristine and wildlife-rich areas. Named in honour of Jacob Shawa, one of Zambia's most celebrated guides, the camp is a labour of love and a deep respect for the Luangwa Valley. The camp features just five raised A-frame canvas tents on wooden platforms: three Luxury Couples Tents and one Family Tent (two tents connected by a deck). Each tent opens entirely on three sides to offer uninterrupted 270-degree views over the river and its pods of snorting hippo. Interiors feature a choice of twin or double beds, soft linen, a sunken bathtub, a private verandah, and a plunge pool. A starbed on the rooftop offers a place to sleep beneath the African sky. Shawa is a pioneer of silent safaris in South Luangwa, using solar-powered electric Land Cruisers that traverse the wilderness quietly with minimal carbon footprint. The main camp features an infinity pool, a fire pit at the edge of the wilderness, and a fully stocked bar where you can enjoy an armchair safari.",
    heroImage: IMAGES.shawaLuangwa,
    gallery: [IMAGES.southLuangwaSunset, IMAGES.southLuangwaSafari, IMAGES.southLuangwaElephant],
    priceRange: "From $500 per person per night",
    roomTypes: ["Luxury Couples Tent", "Family Tent (2 tents connected)"],
    amenities: [
      "Private plunge pool per tent",
      "Sunken bathtub with river views",
      "Silent safaris in solar-powered electric vehicles",
      "Morning and evening game drives",
      "Guided walking safaris",
      "Infinity pool overlooking the Luangwa River",
      "Starbed on rooftop for sleeping under the stars",
      "270-degree views from tent (opens on three sides)",
      "Campfire and fully stocked bar",
      "Eco-friendly design and operations",
      "Family tent configuration available",
      "Private dining on your deck available",
    ],
    rating: 4.8,
    reviews: [
      { name: "Guest, Shawa Luangwa", text: "A special little eco-camp in the vast wilderness. The silent safari vehicles are incredible — you can hear every sound of the bush. Jacob's legacy lives on here.", location: "Green Safaris Guest" },
      { name: "David and Claire Mueller", text: "An intimate, romantic escape. The tent opening onto the river with hippos grunting below was unforgettable.", location: "Berlin, Germany" },
    ],
    romanticHighlights: [
      "Private deck dining for two overlooking the Luangwa River",
      "Silent sunset safari drives with only the sounds of the bush",
      "Stargazing from your rooftop starbed",
      "Couples' bubble bath in a sunken tub with river views",
      "Lantern-lit dinners by the campfire at the water's edge",
    ],
  },
  {
    id: "luangwa-river-camp",
    name: "Luangwa River Camp",
    destination: "south-luangwa",
    location: "South Luangwa National Park, Zambia",
    tagline: "The rhythm of the river. The heart of the wild.",
    description:
      "Set along the banks of the Luangwa River beneath an ancient ebony grove, this intimate five-suite camp offers a classic safari experience with understated luxury and a profound connection to the wilderness. A romantic sanctuary for just ten guests.",
    longDescription:
      "Luangwa River Camp sits nestled under an ancient ebony grove on the banks of the Luangwa River in a game-rich area known as the Luangwa Wafwa. Operated by the renowned Robin Pope Safaris, this small and intimate camp offers just five thatched bush suites, ensuring a maximum of ten guests at any one time. Each suite is individually named (Mwala, Mazi, Merzi, Moto, and Ziko) and features a thatch-and-brick design with large sliding doors that open onto a private river-facing deck. The en-suite bathrooms boast double basins and a large sunken stone bathtub that gazes out onto your own private corner of Africa. A multi-level plunge pool with a cascading waterfall sits on the elevated river deck. The central guest area features an open-plan bar, lounge, and dining area surrounded by Balinese-inspired columns and a courtyard planted with banana trees. Cuisine is fresh and hearty, celebrating local Zambian produce, served by the river or in the communal boma. Activities include morning and afternoon game drives, guided walking safaris, night drives, and seasonal boat safaris on the Luangwa River.",
    heroImage: IMAGES.luangwaRiver,
    gallery: [IMAGES.southLuangwaSunset, IMAGES.southLuangwaSafari, IMAGES.southLuangwaCamp],
    priceRange: "$520 to $950 per person per night",
    roomTypes: ["Bush Suite", "Premium River Suite"],
    amenities: [
      "River-facing deck with seating",
      "Sunken stone bathtub with river views",
      "Multi-level plunge pool with waterfall",
      "Morning and afternoon game drives",
      "Guided walking safaris with armed scouts",
      "Night drives for nocturnal wildlife",
      "Seasonal boat safaris on the Luangwa River",
      "Cultural village and school visits",
      "Wildlife Education Centre tour",
      "Stand-alone fans in suites",
      "Limited WiFi in communal areas",
      "Solar and battery-powered lighting",
      "Laundry and battery charging services",
      "Fresh, locally-sourced cuisine",
    ],
    rating: 4.8,
    reviews: [
      { name: "Sophie and Marc Leclerc", text: "Falling asleep to the sound of the river and waking to birdsong. We have never felt so connected to nature.", location: "Paris, France" },
      { name: "Guest, Luangwa River Camp", text: "First experience of LRC and not disappointed. The accommodation was lovely, very spacious and a high standard. The food, service and staff were all exceptional.", location: "Robin Pope Safaris Guest" },
    ],
    romanticHighlights: [
      "Riverfront dining by lantern light beneath the ebony trees",
      "Sundowners on your private deck as hippos surface in the river",
      "Private bush walks for two with an expert guide",
      "Stargazing from the plunge pool deck",
      "Intimate camp of just ten guests — your private corner of Africa",
    ],
  },
  {
    id: "xanadu-villas",
    name: "Xanadu Luxury Villas & Retreat",
    destination: "zanzibar",
    location: "Michamvi, East Coast, Zanzibar",
    tagline: "Where dreams meet the Indian Ocean",
    description:
      "Nine uncompromising villas on a stretch of pristine white sand beach on Zanzibar's east coast. Each villa a private sanctuary with plunge pool, butler service, and all-inclusive indulgence crafted for the discerning couple.",
    longDescription:
      "Xanadu Luxury Villas & Retreat is an experience, a lifestyle, an awakening of what life can be. Nine individually designed villas — each with a Swahili name meaning clouds, waves, stars, or dew — are scattered along a pristine white sand beach on Zanzibar's sun-drenched east coast. Each villa features its own private plunge pool, indoor and outdoor living spaces, and a private butler who anticipates your every need. The all-inclusive experience is uncompromising: world-class cuisine prepared by an international chef, premium beverages, laundry service, and a range of water sports including sea kayaking, snorkelling, and stand-up paddleboarding directly from the beach. The Kiota Spa nestles on the sand, offering treatments with the sound of the Indian Ocean as your soundtrack. A member of Small Luxury Hotels of the World and featured in the National Geographic Traveller UK Collection 2024, Xanadu has been crafted out of a desire to breathe — to celebrate life in its purest, most luxurious form.",
    heroImage: IMAGES.xanadu,
    gallery: [IMAGES.zanzibarBeach, IMAGES.zanzibarAerial, IMAGES.zanzibarDhow],
    priceRange: "$895 to $4,400 per villa per night",
    roomTypes: ["Umande (1BR Garden)", "Alfajiri (1BR Honeymoon)", "Mawingu/Mawimbi (1BR Ocean)", "Kimwondo (1BR Rooftop Pool)", "Mlima/Korongo (2BR)", "Nyota/Mbingu (Presidential 2BR)"],
    amenities: [
      "Private plunge pool per villa",
      "Personal butler throughout your stay",
      "All-inclusive cuisine by international chef",
      "Kiota Spa on the beach",
      "Private beach access",
      "Sea kayaking, snorkelling and SUP",
      "Private return airport transfers",
      "Laundry service up to 5kg per guest per day",
      "In-villa dining and bar",
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
  },
  {
    id: "kilindi-zanzibar",
    name: "Kilindi Zanzibar",
    destination: "zanzibar",
    location: "Kendwa, North-West Coast, Zanzibar",
    tagline: "Scandinavian minimalism meets Zanzibari romance",
    description:
      "A collection of fifteen white-domed Pavilion villas set within 50 acres of lush tropical garden on Zanzibar's secluded north-west coast. Each villa features its own private plunge pool, rainfall shower, and dedicated butler. All-inclusive rates cover accommodation, meals, drinks, sundowners, kayaking, paddleboarding, and laundry.",
    longDescription:
      "Kilindi Zanzibar is a rarity in the world of luxury boutique hotels. Originally designed for Benny Andersson of the 1970s pop group ABBA, Kilindi achieves the perfect marriage between Scandinavian minimalism and the dramatic architectural overtones of Middle Eastern heritage. Fifteen eastern-styled domed Pavilions nestle amongst 50 acres of tropical garden, each with its own private plunge pool and a separate rainfall shower room with spectacular ocean views. The open-to-nature design allows the gentle ocean breeze and the soundtrack of colourful birdlife to waft through each room. A dedicated butler is assigned to every villa, offering a choice of breakfast, lunch, and dinner locations — your private terrace, the alfresco dining terrace, along the pristine white beach, or even in the privacy of your villa. The main Pavilion features a waterfall bar overlooking a 25-metre infinity pool. The Kilindi Spa offers rejuvenating treatments in a serene garden setting. All-inclusive rates include three meals daily, drinks, sundowners, paddleboarding, kayaking, and laundry services.",
    heroImage: IMAGES.kilindi,
    gallery: [IMAGES.zanzibarBeach, IMAGES.zanzibarDhow, IMAGES.zanzibarAerial],
    priceRange: "$600 to $1,200 per night",
    roomTypes: ["Luxury Garden View Villa", "Luxury Ocean View Villa", "Two-Bedroom Garden View Villa"],
    amenities: [
      "Private plunge pool per villa",
      "Personal butler service",
      "25-metre infinity pool",
      "Waterfall bar",
      "Kilindi Spa",
      "All-inclusive dining (3 meals + drinks + sundowners)",
      "Private beach",
      "Kayaking and paddleboarding",
      "Rainfall shower with ocean views",
      "Private terrace with sun loungers",
      "Laundry service included",
      "Complimentary WiFi",
      "Air conditioning",
      "Airport shuttle",
    ],
    rating: 4.8,
    reviews: [
      { name: "Sarah and James Mitchell", text: "Kilindi is a breathtaking property. The views and beautiful grounds are amazing. The villas are stunning and truly exceptional.", location: "London, United Kingdom" },
    ],
    romanticHighlights: [
      "Private beach dinners with your butler under the stars",
      "Sundowners at the waterfall bar overlooking the infinity pool",
      "Couples spa treatments in the tropical garden spa",
      "Open-to-nature rainfall showers with ocean views",
      "Private breakfast on your villa terrace with birdsong",
    ],
  },
  {
    id: "baraza-resort-spa",
    name: "Baraza Resort & Spa",
    destination: "zanzibar",
    location: "Bwejuu, South-East Coast, Zanzibar",
    tagline: "Where Swahili heritage meets all-inclusive luxury",
    description:
      "A stunning 30-villa all-inclusive boutique resort on Zanzibar's award-winning Bwejuu Beach, recognised by Condé Nast Traveller as one of the top 30 beaches in the world. Every villa features a private plunge pool and Swahili-inspired architecture with hand-carved details.",
    longDescription:
      "Baraza Resort & Spa is Zanzibar's most exclusive all-inclusive boutique resort, set along a beach named one of the top 30 in the world by Condé Nast Traveller. The resort evokes the heritage of Zanzibar dating back to the era of the Sultans, designed in a fusion of Arabic, Swahili, and Indian architectural styles with dramatic Swahili arches, intricate hand-carved cement decorations, beautiful antiques, handmade furniture, and brass lanterns. All 30 villas — 14 one-bedroom and 15 two-bedroom, plus one Royal Sultan two-bedroom villa — feature luxury interiors, hand-carved furniture, spacious terraces, and private plunge pools. The resort offers four restaurants and two bars including Livingstone Terrace, Dhahabu Bar & Lounge, Chai Lounge, Ocean Lounge, and The Sultans Dining Room. The Frangipani Spa offers a wide array of massage techniques and treatments. On-site activities include a PADI dive centre, kite surfing, sailing, snorkelling, kayaking, dhow excursions, Swahili cooking classes, spice farm visits, Jozani Forest excursions, and tennis.",
    heroImage: IMAGES.baraza,
    gallery: [IMAGES.zanzibarBeach, IMAGES.zanzibarSpa, IMAGES.zanzibarAerial],
    priceRange: "$500 to $1,200 per night",
    roomTypes: ["One-Bedroom Villa", "Ocean Front One-Bedroom Villa", "Two-Bedroom Garden Villa", "Royal Sultan Two-Bedroom Villa"],
    amenities: [
      "Private plunge pool per villa",
      "All-inclusive dining and premium beverages",
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
      { name: "Robert and Catherine Thompson", text: "The most luxurious all-inclusive resort we have ever experienced. The villa, the food, the service — all world class.", location: "Toronto, Canada" },
    ],
    romanticHighlights: [
      "Private beach dinners for two with your toes in the sand",
      "Couples spa rituals at the Frangipani Spa",
      "Sunset cocktails at Dhahabu Bar & Lounge",
      "Private dhow cruise along the Bwejuu coast",
      "Swahili cooking class for two with the resort chef",
    ],
  },
  {
    id: "the-palms-zanzibar",
    name: "The Palms Zanzibar",
    destination: "zanzibar",
    location: "Bwejuu, South-East Coast, Zanzibar",
    tagline: "Your private island sanctuary — just six villas, infinite luxury",
    description:
      "An adults-only ultra-luxury boutique resort of just seven villas on Zanzibar's pristine Bwejuu Beach. Each villa features a private plunge pool, personal butler, and all-inclusive gourmet dining. The ultimate romantic hideaway for couples seeking absolute privacy.",
    longDescription:
      "The Palms Zanzibar is the island's most exclusive and intimate luxury resort, with just seven villas on the award-winning Bwejuu Beach — recognised by Condé Nast Traveller as one of the top 30 beaches in the world. With a maximum of 14 guests at any one time, The Palms offers a level of privacy and personalised service unmatched on the island. Each villa spans over 140 square metres with a bedroom, separate living room, full en-suite bathroom, walk-in dressing room, bar area, and a large furnished terrace with views of the Indian Ocean. Every villa has its own private plunge pool and a private thatched beach banda on the sand. The all-inclusive experience covers gourmet dining, premium drinks, and a personal butler. The beachfront Sanctuary Spa offers world-class treatments. Guests also enjoy complimentary access to the facilities of sister properties Baraza Resort & Spa and Breezes Beach Club — including a gym, tennis court, PADI dive centre, and the Frangipani Spa. The Palms is strictly adults-only, welcoming guests aged 16 and above.",
    heroImage: IMAGES.palms,
    gallery: [IMAGES.zanzibarBeach, IMAGES.zanzibarAerial, IMAGES.zanzibarSpa],
    priceRange: "$1,200 to $2,500 per night",
    roomTypes: ["One-Bedroom Villa", "Two-Bedroom Villa", "Entire Resort Buyout (7 villas)"],
    amenities: [
      "Private plunge pool per villa",
      "Personal butler service",
      "Private thatched beach banda",
      "All-inclusive gourmet dining and premium drinks",
      "Sanctuary Spa on the beachfront",
      "Access to sister resort facilities (Baraza + Breezes)",
      "PADI dive centre access",
      "Gym and floodlit tennis court",
      "Snorkelling, kayaking, paddleboarding",
      "Dhow cruises and sunset sails",
      "Stone Town and spice farm tours",
      "Complimentary WiFi",
      "Air conditioning and ceiling fans",
      "Satellite TV and DVD player",
      "Airport transfers",
    ],
    rating: 4.9,
    reviews: [
      { name: "Emma and Thomas Chen", text: "The most exclusive resort we have ever stayed at. Seven villas, total privacy, impeccable service. This is how luxury should feel.", location: "Sydney, Australia" },
    ],
    romanticHighlights: [
      "Private dinner on your beach banda with butler service",
      "Couples treatments at the Sanctuary Spa",
      "Sunset dhow cruise just for two",
      "Private beach picnics on Bwejuu's powder-white sand",
      "Stargazing from your private plunge pool",
    ],
  },
  {
    id: "zanzibar-white-sand-villas",
    name: "Zanzibar White Sand Villas",
    destination: "zanzibar",
    location: "Paje, Zanzibar",
    tagline: "White sand. Turquoise dreams. Endless romance.",
    description:
      "A collection of luxury villas on Zanzibar's breathtaking southeast coast, where the Indian Ocean lazes against endless white beaches beneath eternal sunshine.",
    longDescription:
      "Zanzibar White Sand Villas is an ode to the island's legendary coastline. Located on the powdery white sands of Paje, the resort offers 22 villas that blend Swahili architectural traditions with contemporary luxury. The villas are arranged around lush tropical gardens, each with a private pool and outdoor living area. The atmosphere is one of serene indulgence: yoga at sunrise, long walks on the beach, and long lunches at the ocean view restaurant. The beachfront infinity pool is the heart of the resort, a place where hours dissolve into golden days.",
    heroImage: IMAGES.whiteSand,
    gallery: [IMAGES.zanzibarAerial, IMAGES.zanzibarBeach, IMAGES.zanzibarDhow],
    priceRange: "$500 to $950 per night",
    roomTypes: ["Garden Villa", "Ocean View Villa", "Beachfront Villa"],
    amenities: [
      "Private pool",
      "Beachfront infinity pool",
      "Restaurant and bar",
      "Spa and wellness center",
      "Daily yoga pavilion",
      "Water sports",
      "Kite surfing school",
      "Complimentary WiFi",
    ],
    rating: 4.7,
    reviews: [
      { name: "Alex and Rachel Green", text: "The most beautiful beach we have ever seen. The villas are stunning and the service is impeccable.", location: "Melbourne, Australia" },
    ],
    romanticHighlights: [
      "Beachfront dinners as the sun sets over the Indian Ocean",
      "Couples yoga at sunrise",
      "Sunset beach walks on endless white sand",
      "Couples spa journeys",
    ],
  },
  {
    id: "the-residence-zanzibar",
    name: "The Residence Zanzibar",
    destination: "zanzibar",
    location: "Kizimkazi, Zanzibar",
    tagline: "Barefoot elegance on the Spice Island",
    description:
      "A stunning beachfront resort on Zanzibar's tranquil southern coast, where spacious villas, tropical gardens, and world class service create an unforgettable romantic escape.",
    longDescription:
      "The Residence Zanzibar is a haven of understated luxury on the island's tranquil southern coast. Set within 32 hectares of lush tropical gardens, the resort's 66 villas are among the most spacious in Zanzibar, each with a private pool, outdoor shower, and a terrace that opens onto the beach. The resort embodies quiet elegance: whitewashed walls, Swahili-inspired architecture, and interiors that blend African textiles with contemporary design. The spa, set over water, offers treatments inspired by Zanzibar's spice heritage, while the resort's restaurants celebrate the island's culinary traditions with a modern, sophisticated twist.",
    heroImage: IMAGES.residence,
    gallery: [IMAGES.zanzibarSpa, IMAGES.zanzibarBeach, IMAGES.zanzibarAerial],
    priceRange: "$600 to $1,300 per night",
    roomTypes: ["Villa", "Premium Villa", "Beach Villa", "Presidential Villa"],
    amenities: [
      "Private pool",
      "Overwater spa",
      "Multiple restaurants",
      "Beach bar",
      "Tennis court",
      "Butler service",
      "Concierge",
      "Complimentary WiFi",
    ],
    rating: 4.8,
    reviews: [
      { name: "William and Elizabeth van der Merwe", text: "The Residence exceeded every expectation. The villa, the service, the spa. Perfection.", location: "Cape Town, South Africa" },
    ],
    romanticHighlights: [
      "Overwater spa treatments for two",
      "Private beach dinners with personal butler",
      "Sunset cocktails at the beach bar",
      "Couples spice ritual at the spa",
    ],
  },
];

export const PACKAGES = [
  {
    id: "honeymoon-escape",
    title: "Honeymoon Escape",
    subtitle: "Begin your forever in African paradise",
    image: IMAGES.chinzombo,
    description:
      "The ultimate romantic honeymoon weaving together the award-winning luxury of Time+Tide Chinzombo in South Luangwa with the pure relaxation of Zanzibar's pristine shores. A journey that celebrates your new beginning across Africa's most extraordinary landscapes.",
    duration: "10 nights",
    price: "$10,500 per couple",
    destinations: ["south-luangwa", "zanzibar"],
    properties: ["chinzombo", "xanadu-villas"],
    inclusions: [
      "All accommodation",
      "Domestic flights and private transfers",
      "Daily breakfast and dinner",
      "Safari game drives and walking safaris",
      "20-minute welcome massage at Chinzombo",
      "Private beach dinner in Zanzibar",
      "Couples spa treatment",
      "Honeymoon welcome amenity",
      "Personal concierge throughout your journey",
    ],
    itinerary: [
      { day: 1, title: "Arrival in Lusaka", description: "Welcome at Kenneth Kaunda Airport. Private transfer to your hotel." },
      { day: 2, title: "Fly to South Luangwa", description: "Morning flight to Mfuwe. Transfer to Time+Tide Chinzombo. Afternoon game drive." },
      { day: 3, title: "Safari Immersion", description: "Full day of game drives and walking safaris with award-winning guides." },
      { day: 4, title: "Wilderness Romance", description: "Morning walking safari. Afternoon by your private plunge pool. In-villa spa treatment." },
      { day: 5, title: "Final Safari Morning", description: "Dawn game drive. Brunch. Flight to Zanzibar." },
      { day: 6, title: "Beach Arrival", description: "Arrive in Zanzibar. Transfer to Xanadu Villas. Welcome dinner." },
      { day: 7, title: "Ocean Bliss", description: "Day at leisure. Spa treatments. Pool. Beach." },
      { day: 8, title: "Spice Island Exploration", description: "Stone Town tour or spice plantation visit." },
      { day: 9, title: "Romantic Farewell", description: "Private beach dinner beneath the stars." },
      { day: 10, title: "Departure", description: "Transfer to Zanzibar Airport. Your journey becomes your most cherished memory." },
    ],
  },
  {
    id: "beach-bush-escape",
    title: "Beach and Bush Escape",
    subtitle: "The best of both African worlds",
    image: IMAGES.kayaMawa,
    description:
      "Experience the contrasting wonders of Lake Malawi and South Luangwa. From the freshwater paradise of Africa's hidden beach escape to the raw wilderness of Zambia's premier safari destination, where silent electric vehicles glide through an untouched ecosystem. Two worlds. One extraordinary journey.",
    duration: "12 nights",
    price: "$8,500 per couple",
    destinations: ["lake-malawi", "south-luangwa"],
    properties: ["kaya-mawa", "shawa-luangwa"],
    inclusions: [
      "All accommodation",
      "Private transfers and flights",
      "Full board at all lodges",
      "Silent safaris in solar-powered electric vehicles",
      "Game drives and walking safaris",
      "All water sports equipment at Lake Malawi",
      "Private bush dinner",
      "Couples spa treatment",
      "24-hour concierge service",
    ],
    itinerary: [
      { day: 1, title: "Arrival in Lilongwe", description: "Welcome. Overnight in Lilongwe." },
      { day: 2, title: "Lake Malawi Paradise", description: "Transfer to Kaya Mawa on Likoma Island." },
      { day: 3, title: "Island Life", description: "Kayaking, snorkeling, and island exploration." },
      { day: 4, title: "Lake Romance", description: "Private beach dinner. Sunset dhow cruise." },
      { day: 5, title: "Journey to the Bush", description: "Fly to Mfuwe. Transfer to Shawa Luangwa Camp." },
      { day: 6, title: "Safari Begins", description: "Silent game drive in electric vehicle. Walking safari." },
      { day: 7, title: "Wild Immersion", description: "Full day of safari activities. Sundowners by the river." },
      { day: 8, title: "Bush Luxury", description: "Relax by the infinity pool. Rooftop starbed. River views." },
      { day: 9, title: "Farewell Zambia", description: "Final game drive. Brunch. Departure." },
    ],
  },
  {
    id: "romantic-safari-journey",
    title: "Romantic Safari Journey",
    subtitle: "Intimate encounters with the wild",
    image: IMAGES.pukuRidge,
    description:
      "An immersive safari experience designed exclusively for couples. Walk with wildlife on ancient paths, dine beneath the African sky, and sleep to the soundtrack of the bush. This is intimacy redefined.",
    duration: "7 nights",
    price: "$6,800 per couple",
    destinations: ["south-luangwa"],
    properties: ["puku-ridge-camp", "luangwa-river-camp"],
    inclusions: [
      "All accommodation",
      "All transfers",
      "Full board",
      "Private game vehicle",
      "Walking safaris",
      "Star bed experience",
      "Bush breakfast and dinner",
      "Photography guide",
    ],
    itinerary: [
      { day: 1, title: "Arrival", description: "Fly to Mfuwe. Transfer to Puku Ridge Camp." },
      { day: 2, title: "Safari Immersion", description: "Full day game drives and walking safaris." },
      { day: 3, title: "Bush Romance", description: "Private bush dinner under the stars." },
      { day: 4, title: "River Camp", description: "Transfer to Luangwa River Camp." },
      { day: 5, title: "River Life", description: "Game drives along the river. Sunset cruise." },
      { day: 6, title: "Star Bed Experience", description: "Sleep under the stars on a raised platform." },
      { day: 7, title: "Departure", description: "Final game drive. Brunch. Flight out." },
    ],
  },
  {
    id: "anniversary-escape",
    title: "Anniversary Escape",
    subtitle: "Celebrate your love story on the Spice Island",
    image: IMAGES.residence,
    description:
      "A celebration of enduring love on the pristine shores of Zanzibar. From private dining on the sand to couples spa rituals, every moment honors your journey together.",
    duration: "7 nights",
    price: "$7,500 per couple",
    destinations: ["zanzibar"],
    properties: ["the-residence-zanzibar"],
    inclusions: [
      "Beach Villa accommodation",
      "Private transfers",
      "Daily breakfast",
      "Half board dining",
      "Couples spa ritual",
      "Private beach dinner",
      "Anniversary celebration package",
      "Personal butler",
    ],
    itinerary: [
      { day: 1, title: "Arrival", description: "Welcome at Zanzibar Airport. Transfer to The Residence." },
      { day: 2, title: "Beach Relaxation", description: "Day at leisure. Pool. Spa. Beach." },
      { day: 3, title: "Spice Tour", description: "Spice plantation visit. Lunch in Stone Town." },
      { day: 4, title: "Ocean Adventure", description: "Snorkeling and dhow sunset cruise." },
      { day: 5, title: "Wellness Day", description: "Couples spa treatments. Yoga. Relaxation." },
      { day: 6, title: "Romantic Dinner", description: "Private beach dinner to celebrate your love." },
      { day: 7, title: "Departure", description: "Breakfast. Transfer to airport." },
    ],
  },
  {
    id: "luxury-island-retreat",
    title: "Luxury Island Retreat",
    subtitle: "Your private island paradise on Lake Malawi",
    image: IMAGES.kayaMawa,
    description:
      "An escape to the secluded shores of Lake Malawi. Stay at the iconic Kaya Mawa on Likoma Island and experience true barefoot luxury where the only schedule is the rhythm of the lake.",
    duration: "7 nights",
    price: "$6,200 per couple",
    destinations: ["lake-malawi"],
    properties: ["kaya-mawa"],
    inclusions: [
      "All accommodation",
      "Private transfers",
      "Full board",
      "Private dhow cruise",
      "Snorkeling equipment",
      "Couples massage",
      "Island picnic",
      "Concierge service",
    ],
    itinerary: [
      { day: 1, title: "Arrival", description: "Fly to Likoma Island. Settle into Kaya Mawa." },
      { day: 2, title: "Island Discovery", description: "Explore the island. Kayak. Swim." },
      { day: 3, title: "Lake Life", description: "Snorkeling. Sailing. Beach relaxation." },
      { day: 4, title: "Romance on the Lake", description: "Sunset dhow cruise. Private dinner." },
      { day: 5, title: "Adventure and Spa", description: "Water sports. Spa treatments." },
      { day: 6, title: "Island Farewell", description: "Final day. Stargazing." },
      { day: 7, title: "Departure", description: "Transfer to Lilongwe." },
    ],
  },
];

export const TESTIMONIALS = [
  {
    name: "Sarah and James Mitchell",
    location: "London, United Kingdom",
    text: "Kivara curated a honeymoon that exceeded every dream we held. From the moment we landed in Malawi to our final sunset in Zanzibar, every detail was flawless. This was not a trip. It was the beginning of our love story. We have never felt so seen, so cared for, so completely transported.",
    destination: "Lake Malawi and Zanzibar",
    rating: 5,
  },
  {
    name: "Emma and Thomas Chen",
    location: "Sydney, Australia",
    text: "We have traveled the world, but nothing compares to the raw beauty of South Luangwa experienced through Kivara's lens. Walking safaris at dawn. Sundowners on the riverbank. It was deeply moving in ways we struggle to articulate. This is Africa at its most beautiful.",
    destination: "South Luangwa",
    rating: 5,
  },
  {
    name: "Alexander and Natalia Petrov",
    location: "Oslo, Norway",
    text: "Kivara understood what we wanted before we knew it ourselves. The Zanzibar villa was breathtaking. The service impeccable. We felt like the only two people in the world. We are already planning our return.",
    destination: "Zanzibar",
    rating: 5,
  },
  {
    name: "Michael and Olivia Barnes",
    location: "New York, USA",
    text: "The Beach and Bush Escape was the perfect balance of adventure and romance. Swimming in Lake Malawi one day, tracking lions the next. Kivara's curation is nothing short of art. They do not plan trips. They compose journeys.",
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
  },
  {
    id: "walking-safari",
    title: "Walking Safaris",
    description: "Follow in the footsteps of explorers on a guided walking safari. Feel the earth beneath your feet and connect with Africa on its own terms. There is no more intimate way to experience the wild.",
    image: IMAGES.walking,
    category: "Adventure",
  },
  {
    id: "sunset-dhow",
    title: "Sunset Dhow Cruises",
    description: "Sail into the golden hour on a traditional dhow. Champagne in hand, the sky painted in amber and rose. A moment you will carry in your heart forever.",
    image: IMAGES.dhow,
    category: "Romance",
  },
  {
    id: "couples-spa",
    title: "Couples Spa Rituals",
    description: "Side by side treatments in open air pavilions overlooking the ocean or bush. Ancient techniques meet modern wellness. Connection deepens with every breath.",
    image: IMAGES.spa,
    category: "Wellness",
  },
  {
    id: "star-bed",
    title: "Star Bed Safaris",
    description: "Sleep beneath a canopy of African stars on a raised platform in the wilderness. The ultimate romantic safari experience. You and the universe. Nothing between.",
    image: IMAGES.starbed,
    category: "Romance",
  },
  {
    id: "bush-dining",
    title: "Bush Dining",
    description: "A table set in the wilderness, surrounded by lanterns and the sounds of the African night. Fine dining meets raw nature. An evening you will never forget.",
    image: IMAGES.bushDining,
    category: "Dining",
  },
];

export const JOURNAL_POSTS = [
  {
    id: "honeymoon-guide-2026",
    title: "The Ultimate African Honeymoon Guide for Discerning Couples",
    excerpt: "From the shores of Lake Malawi to the wilds of Zambia and the spice scented breezes of Zanzibar. Discover the most romantic escapes Africa has to offer for those who refuse to compromise on beauty.",
    content: `Planning a honeymoon is about more than choosing a destination. It is about curating the opening chapter of your shared history — a journey that sets the tone for a lifetime of adventure together.

Africa offers something no other continent can: the chance to begin your marriage in absolute privacy, surrounded by beauty that has remained unchanged for millennia. At Kivara, we have spent years identifying the properties and experiences that make for an unforgettable honeymoon.

<h3>Lake Malawi: The Lake of Stars</h3>
David Livingstone called it the Lake of Stars, and one night on its shores will show you why. Lake Malawi offers four extraordinary honeymoon experiences, each distinct in character yet united by one truth: this is where romance finds its natural habitat.

On Likoma Island, <strong>Kaya Mawa</strong> is our flagship for a reason. Honeymoon suites are carved into the granite shoreline, with private sundecks plunging directly into crystalline waters. The Madimba House comes with its own infinity pool and uninterrupted views across the Mozambique Channel. Mornings begin with coffee brought to your terrace as saffron light spills across the lake. Evenings bring dhow cruises, champagne in hand, as the sky ignites in shades of amber and rose.

Across the lake on the Nankhumba Peninsula, <strong>Pumulani Lodge</strong> rises from a hillside of ancient trees, each villa a private sanctuary with plunge pool, outdoor shower, and a terrace that frames the sunset. The honeymoon villa sits so far from the main lodge that you might forget there is anyone else on earth — just you, your love, and the vast expanse of the lake.

For the ultimate in island seclusion, <strong>Blue Zebra Island Lodge</strong> occupies its own private island within the UNESCO-listed Lake Malawi National Park. Just twelve rooms ensure absolute privacy. Snorkel together in coves of extraordinary clarity, kayak along deserted shores, and dine on the beach beneath stars undimmed by city light.

On the southern shore, <strong>The Makokola Retreat</strong> offers a different kind of honeymoon magic. The adult-only Lake Suites form an enclave of pure indulgence, each with private infinity pool and dedicated bar. Days are spent on the championship golf course or in the spa; evenings bring candlelit Italian dinners at Il Lago, the lake glimmering beyond the terrace.

<h3>South Luangwa: The Wild Heart</h3>
For couples who crave intimacy with the wild, South Luangwa delivers an intensity of experience unmatched anywhere in Africa. Walking safaris at dawn reveal tracks you would miss from a vehicle. Night drives unveil a world of predators and glowing eyes. And at Puku Ridge Camp, honeymoon suites sit high on a ridge with panoramic views over the floodplain. The bed faces the bush, so you fall asleep to the sound of hyenas calling across the valley.

<h3>Zanzibar: The Spice Island</h3>
Zanzibar is where the Indian Ocean paints in impossible blues. The Residence Zanzibar offers villas with private pools and outdoor showers hidden within tropical gardens. The Palms, with just seven villas, offers the ultimate in privacy — your own stretch of beach, your own butler, your own rhythm.

Whether you choose one destination or combine all three, the key is this: travel slowly, stay long, and let Africa work its magic on your love story.`,
    image: IMAGES.journalHoneymoon,
    category: "Honeymoon Guide",
    date: "May 10, 2026",
    author: "Kivara Concierge",
    readTime: "9 min read",
  },
  {
    id: "why-lake-malawi",
    title: "Why Lake Malawi is Africa's Most Romantic Secret — A Couples' Guide to the Lake of Stars",
    excerpt: "Forget the Maldives. Lake Malawi is the world's most intoxicating romantic escape — crystalline waters, private islands, and four extraordinary properties where love takes centre stage beneath the Southern Cross.",
    content: `There is a place where the water is so clear it looks like liquid glass, where the night sky spills stars from horizon to horizon, and where the only sound is the gentle lapping of waves against a deserted shore. This is Lake Malawi — Africa's best-kept romantic secret.

While the world queues for the Mediterranean and the Maldives, discerning couples have discovered something rarer: a freshwater paradise where luxury meets raw, unfiltered romance. Here, on the shores of what David Livingstone called the Lake of Stars, four extraordinary properties offer the most intimate escapes on the continent.

<h3>Kaya Mawa — The Island Crown Jewel</h3>
Perched on the granite shoreline of Likoma Island, Kaya Mawa is the definition of barefoot romance. Seventeen suites and villas — each carved into the rock, each with its own private sundeck plunging toward the lake. The Honeymoon Suite, Madimba House, comes with its own infinity pool and uninterrupted views across the Mozambique Channel. Mornings begin with coffee brought to your terrace as saffron light spills across the water. Evenings mean sundowners on your private deck, followed by candlelit dinners on the beach beneath a canopy of stars. The spa, suspended above the lake on a rocky outcrop, offers couples treatments with nothing but the sound of water beneath you.

<h3>Pumulani Lodge — Hillside Honeymoon Haven</h3>
On the western shore, Pumulani Lodge by Robin Pope Safaris rises from a hillside of ancient msikizi trees, ten villas overlooking the vast expanse of the lake. This is romance on a grander scale — each villa is a private sanctuary with its own plunge pool, outdoor shower, and a terrace that frames the sunset like a living painting. The honeymoon villa sits at the furthest point of the property, so secluded that you might forget there is anyone else on earth. Days are spent swimming in the infinity pool that seems to merge with the lake below, or exploring the shoreline by kayak. The lodge's location on the Nankhumba Peninsula means you witness both sunrise and sunset over the water — a rare gift on Lake Malawi.

<h3>Blue Zebra Island Lodge — Exclusive Island Escape</h3>
Set on its own private island within the UNESCO-listed Lake Malawi National Park, Blue Zebra Island Lodge offers the ultimate in romantic isolation. With just twelve rooms — from Executive Chalets with panoramic lake views to Lake Safari Tents nestled along the shoreline — this is intimacy by design. Snorkel together in the crystal-clear waters among cichlid fish found nowhere else on earth. Kayak along deserted coves. Dine on a private beach beneath the stars. The island is a sanctuary not just for the birdlife that fills the canopy, but for couples seeking a world where time stands still.

<h3>Makokola Retreat — Lakeside Estate Elegance</h3>
On the southern shore, The Makokola Retreat offers a different kind of romance — elegant, expansive, effortlessly luxurious. The crown jewel is the adult-only Lake Suite enclave, where twenty-two suites and the private Sunset Villa each open onto the lake with their own infinity pool, dedicated bar, and a level of service that anticipates your every desire. Spend afternoons on the nine-hole Mlambe golf course, hand in hand. Evenings bring sundowners at Harry's Bar as the sun melts into the lake, followed by Italian-Mediterranean dining at Il Lago, where the ambience is as exquisite as the cuisine.

<h3>When Romance Beckons</h3>
The sweetest months on Lake Malawi are April through October, when the skies are clear, the breeze is gentle, and the water temperature hovers at a perfect 26°C. This is the season for sunset dhow cruises, for swimming in coves so clear you can count the fish below, for lying on the deck of your villa and watching the Southern Cross emerge above the Lake of Stars.

Whether you choose the barefoot intimacy of Kaya Mawa, the hillside grandeur of Pumulani, the island solitude of Blue Zebra, or the lakeside elegance of Makokola — Lake Malawi offers something the world's great romantic destinations cannot: a place that still feels undiscovered. A secret waiting to be shared with the one you love.`,
    image: IMAGES.journalMalawi,
    category: "Destination Feature",
    date: "April 28, 2026",
    author: "Kivara Concierge",
    readTime: "8 min read",
  },
  {
    id: "walking-safari-guide",
    title: "The Art of the Walking Safari: Intimacy with the Wild in South Luangwa",
    excerpt: "There is no more intimate way to experience Africa than on foot. Here is why South Luangwa is the world's premier walking safari destination for couples seeking transcendence.",
    content: `The vehicle turns off its engine, and suddenly the world is silent. Not the silence of absence, but the silence of presence — the rustle of a leaf, the call of a hornbill, the distant thud of a baboon dropping from a branch. You step out onto the earth, and for the first time, you are not observing Africa. You are in it.

<h3>The Birthplace of the Walking Safari</h3>
South Luangwa National Park in Zambia is the birthplace of the walking safari, and it remains the finest place on earth to experience it. Norman Carr pioneered the concept in the 1950s, believing that the true spirit of Africa could only be felt on foot. Nearly seventy years later, his legacy lives on in every guided walk through this extraordinary valley.

<h3>What to Expect</h3>
A walking safari is not about covering distance. It is about immersion. Your guide reads the bush like a book: here, the imprint of a leopard's paw in the damp sand. There, the musky scent of a buffalo herd bedded down in the thicket. Every step reveals something new.

Walks typically begin at dawn, when the air is cool and the animals are most active. You might walk for two hours or four, stopping frequently to examine tracks, to listen, to simply stand in silence and feel the weight of being in a place where humans are not the dominant species.

<h3>Where to Stay</h3>
Puku Ridge Camp sits on a ridge above the Luangwa floodplain, offering panoramic views that stretch for miles. The rooms are luxury tents on raised decks, each with a private plunge pool and an outdoor shower. The star bed experience — a four-poster rollaway that the staff sets up under the open sky — is the ultimate way to sleep in the wilderness.

<h3>Why It Matters for Couples</h3>
There is something profoundly bonding about experiencing the wild together, without barriers. No windows. No engine. No separation from the world around you. Walking safaris create a shared vulnerability and wonder that strengthens connection. You hold hands a little tighter. You speak in whispers. You see each other react to the raw beauty of the natural world.`,
    image: IMAGES.journalWalking,
    category: "Safari Stories",
    date: "April 15, 2026",
    author: "Kivara Concierge",
    readTime: "10 min read",
  },
  {
    id: "zanzibar-spice-island",
    title: "Zanzibar: Love Letters from the Spice Island",
    excerpt: "Beyond the beaches lies an island woven with history, spice, and romance. Our guide to the most enchanting experiences in Zanzibar for couples who seek the extraordinary.",
    content: `Zanzibar has a way of slowing time. The island operates on what locals call "Zanzibar time" — a gentle rhythm that resists hurry. Within days of arriving, you will find yourself calibrated to its pace: breakfasts that stretch into mid-morning, afternoons lost to books and hammocks, dinners that begin at sunset and end when the last candle flickers out.

<h3>Stone Town: The Soul of the Island</h3>
Before you lose yourself to beach life, spend a night in Stone Town. This UNESCO World Heritage site is a labyrinth of narrow alleys, carved wooden doors, and bustling markets. The history here is layered — Arab, Persian, Indian, African, European — woven into the architecture, the food, the very air. Stay at Emerson on Hurumzi or the Zanzibar Serena Inn, and let the winding streets guide your exploration.

<h3>The Beach Life</h3>
Zanzibar's east coast is where the postcard images come to life. Bwejuu, Paje, and Jambiani offer endless white sand beaches lapped by turquoise water. The Palms Zanzibar is the ultimate romantic retreat — just seven villas on the beachfront, each with a private plunge pool and personal butler. For a slightly different energy, Zanzibar White Sand Villas in Paje offers direct access to the best kite surfing on the island.

<h3>Beyond the Beach</h3>
A spice tour is essential — Zanzibar is the Spice Island, after all, and the scent of cloves, nutmeg, and cinnamon hangs in the air. Visit a working spice farm, taste fresh vanilla pods, and learn how the spice trade shaped the island's history.

The Jozani Forest, home to the endemic red colobus monkey, offers a completely different side of Zanzibar. And for the ultimate romantic experience, book a private sunset dhow cruise along the coast — just you, your love, and the Indian Ocean painted in gold.

<h3>When to Go</h3>
Zanzibar is lovely year-round, but the sweet spot is June to October and December to February, when the weather is dry and the seas are calm. The long rains (March to May) bring lush vegetation and lower rates, while the short rains (November) are typically brief and refreshing.`,
    image: IMAGES.journalZanzibar,
    category: "Destination Feature",
    date: "March 30, 2026",
    author: "Kivara Concierge",
    readTime: "7 min read",
  },
];
