/**
 * Fix live production content — Kivara curated portfolio.
 *
 * 1. Deactivates 8 stale properties + 6 legacy packages (is_active=false)
 * 2. Activates + features the 7 curated properties (renames the-makokola-retreat → makokola-retreat)
 * 3. Rewrites 5 stale blog posts (removed-property references removed)
 * 4. Unpublishes 6 placeholder/stub blog posts
 * 5. Fixes stale post images
 *
 * Uses the Supabase service-role key via PostgREST (no Management API token needed).
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * Usage:
 *   node scripts/fix-live-content.mjs          # dry run (preview only)
 *   node scripts/fix-live-content.mjs --apply  # write to production
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// ─── Environment ────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const get = (key) => {
    const line = lines.find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : undefined;
  };
  return {
    url: get("NEXT_PUBLIC_SUPABASE_URL"),
    key: get("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

const { url, key } = loadEnv();
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const BASE = `${url}/rest/v1`;

// Live DB blog content is stored as a single line (no newlines). The authored
// replacement strings use \n for readability, so strip them before matching.
const norm = (s) => s.replace(/[\r\n]+/g, "");

async function req(method, table, query, body) {
  const res = await fetch(`${BASE}/${table}${query ? `?${query}` : ""}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${table} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res;
}

// ─── Curated slugs ──────────────────────────────────────────────────────
const CURATED_PROPERTIES = [
  "kaya-mawa",
  "pumulani-lodge",
  "makokola-retreat",
  "chinzombo",
  "puku-ridge-camp",
  "xanadu-villas",
  "baraza-resort-spa",
];
const STALE_PROPERTIES = [
  "blue-zebra-island-lodge",
  "kilindi-zanzibar",
  "luangwa-river-camp",
  "luangwa-safari-house",
  "shawa-luangwa",
  "the-palms-zanzibar",
  "the-residence-zanzibar",
  "zanzibar-white-sand-villas",
];
// Live DB row uses slug "the-makokola-retreat" but the curated constants use
// "makokola-retreat". Renamed + reactivated in the properties step below.
const MAKOKOLA_RENAME = { from: "the-makokola-retreat", to: "makokola-retreat" };
const CURATED_PACKAGES = [
  "honeymoon-escape",
  "african-love-story",
  "private-proposal-journey",
  "safari-sunset-romance",
  "island-romance-retreat",
  "zanzibar-love-escape",
  "anniversary-celebration",
  "luxury-african-couple-adventure",
  "ultimate-african-romance",
  "kivara-bespoke-private-journey",
];
const STALE_PACKAGES = [
  "anniversary-escape",
  "beach-bush-escape",
  "luxury-island-retreat",
  "romance-zanzibar",
  "romantic-safari-journey",
  "safari-adventure",
];
const STUB_POSTS = [
  "romance-lake-malawi",
  "walking-safari-guide",
  "zanzibar-honeymoon",
  "luxury-travel-trends-2026",
  "sustainable-tourism",
  "best-time-to-visit",
];

// ─── Blog content replacements (authored from live DB dumps) ────────────
const BLOG_REPLACEMENTS = {
  "lake-malawi-vs-maldives": [
    [
      "<strong>Blue Zebra Island Lodge</strong> occupies an entire island within a UNESCO biosphere reserve — twelve rooms, total.",
      "<strong>The Makokola Retreat</strong>'s adult-only Lake Suites, on the sun-bleached southern shore, offer private infinity pools with dedicated bar service — the lake's most intimate indulgence.",
    ],
    [
      `<h3>Blue Zebra Island Lodge — Nankoma Island</h3>
<p>Your own private island within the UNESCO-listed Lake Malawi National Park. Twelve rooms, absolute privacy. Snorkel in coves of extraordinary clarity among cichlid fish found nowhere else on earth. <a href='/properties/blue-zebra-island-lodge'>Explore Blue Zebra →</a>
</p>
`,
      "",
    ],
  ],
  "honeymoon-guide-2026": [
    [
      "Lake Malawi offers four extraordinary honeymoon experiences",
      "Lake Malawi offers three extraordinary honeymoon experiences",
    ],
    [
      `<h3>Blue Zebra Island Lodge — Private Island</h3>
<p>For the ultimate in island seclusion, Blue Zebra Island Lodge occupies its own private island within the UNESCO-listed Lake Malawi National Park. Just twelve rooms ensure absolute privacy. Snorkel together in coves of extraordinary clarity, kayak along deserted shores, and dine on the beach beneath stars undimmed by city light. The island spa offers treatments on a deck suspended above the water.</p>
<p>
<img src='/images/bl-wetu-00.jpg' alt='Blue Zebra Island Lodge aerial view' style='width:100%' />
</p>
`,
      "",
    ],
    [
      `<h3>Shawa Luangwa Camp — Silent Safaris</h3>
<p>A pioneer of silent safaris using solar-powered electric vehicles, Shawa Luangwa offers just five tents on the banks of the Luangwa River. Each tent opens on three sides for 270-degree views of the river and its hippo pods. The rooftop starbed is pure magic.</p>
<h3>Luangwa River Camp — Intimate Classic</h3>
<p>With just five thatched bush suites for a maximum of ten guests, Luangwa River Camp offers an intimate classic safari experience beneath an ancient ebony grove. The sunken stone bathtubs gazing out onto the river are unforgettable.</p>
`,
      "",
    ],
    [
      `<h3>The Palms Zanzibar — Exclusive Seven Villas</h3>
<p>With just seven villas on Bwejuu Beach — recognised by Condé Nast Traveller as one of the top 30 beaches in the world — The Palms offers the ultimate in privacy and personalised service. Each villa spans over 140 square metres with a private plunge pool, personal butler, and a thatched beach banda on the sand. Gourmet dining and premium beverages are included.</p>
<p>
<img src='/images/the-palms.jpg' alt='The Palms Zanzibar beach view' style='width:100%' />
</p>
<h3>Kilindi Zanzibar — Scandinavian-Zanzibari Fusion</h3>
<p>Fifteen white-domed Pavilion villas set within 50 acres of tropical garden. Originally designed for ABBA's Benny Andersson, Kilindi marries Scandinavian minimalism with Zanzibari architecture. Each villa has a private plunge pool, rainfall shower with ocean views, and a dedicated butler. All-inclusive rates cover everything.</p>
`,
      "",
    ],
    [
      `<h3>The Residence Zanzibar — Barefoot Elegance</h3>
<p>Sixty-six sprawling villas on Zanzibar's tranquil southern coast, each with a private pool and outdoor shower. The overwater spa crowns the experience — treatment rooms suspended above the Indian Ocean.</p>
`,
      "",
    ],
  ],
  "zanzibar-spice-island": [
    [
      `<h3>Bwejuu — The Palms Zanzibar</h3>
<p>
<img src='/images/the-palms.jpg' alt='The Palms Zanzibar beach' style='width:100%' />
</p>
<p>Bwejuu Beach on the southeast coast is recognised by Condé Nast Traveller as one of the top 30 beaches in the world. Here, The Palms Zanzibar offers the island's most exclusive beachfront experience — just seven villas, each with a private plunge pool, personal butler, and a thatched beach banda on the sand. This is adults-only, ultra-luxury, with gourmet dining and premium beverages included. With a maximum of 14 guests at any time, The Palms offers a level of privacy unmatched on the island. <a href='/properties/the-palms-zanzibar'>Explore The Palms →</a>
</p>
`,
      `<h3>Bwejuu — Zanzibar's Most Coveted Beach</h3>
<p>
<img src='/images/baraza-beach.jpg' alt='Baraza Resort & Spa beach' style='width:100%' />
</p>
<p>Bwejuu Beach on the southeast coast is recognised by Condé Nast Traveller as one of the top 30 beaches in the world. Powder-white sand, shallow turquoise water, and a horizon that melts into the Indian Ocean — this is the postcard Zanzibar, and it is where the island's most romantic resorts make their home. <a href='/properties/baraza-resort-spa'>Explore Baraza Resort & Spa →</a>
</p>
`,
    ],
    [
      `<h3>Kendwa — Kilindi Zanzibar</h3>
<p>On the north-west coast, Kilindi Zanzibar's fifteen white-domed Pavilion villas are set within 50 acres of tropical garden. Each villa has its own private plunge pool and a separate rainfall shower room with spectacular ocean views. Originally designed for ABBA's Benny Andersson, the property achieves the perfect marriage between Scandinavian minimalism and Middle Eastern architectural drama. A dedicated butler is assigned to every villa. <a href='/properties/kilindi-zanzibar'>Explore Kilindi →</a>
</p>
`,
      `<h3>Kendwa & Nungwi — The North Coast</h3>
<p>On the north-west coast, Kendwa and Nungwi are famous for their wide, powder-white beaches that stay swimmable at every tide — a rarity on Zanzibar. The sunsets here are legendary, with locals and travellers alike gathering on the sand as the sky ignites. For couples, it is the perfect day trip for a taste of the island's liveliest shore.</p>
`,
    ],
    [
      "The resort sits on the same stretch of award-winning Bwejuu Beach as The Palms, with access to shared facilities including a PADI dive centre, gym, and tennis court.",
      "The resort sits on the award-winning stretch of Bwejuu Beach, with access to shared facilities including a PADI dive centre, gym, and tennis court.",
    ],
    [
      `<h3>Kizimkazi — The Residence Zanzibar</h3>
<p>
<img src='/images/residence-hero.jpg' alt='The Residence Zanzibar beach' style='width:100%' />
</p>
<p>On Zanzibar's tranquil southern coast, The Residence offers sixty-six sprawling villas set within 32 hectares of tropical gardens. Each villa has its own private pool, outdoor shower, and a terrace that opens onto pristine beach. The overwater spa crowns the experience — treatment rooms suspended above the Indian Ocean where the rhythm of the waves becomes part of your restoration. <a href='/properties/the-residence-zanzibar'>Explore The Residence →</a>
</p>
`,
      `<h3>Kizimkazi — Dolphin Bay</h3>
<p>
<img src='/images/zanzibar-dhow.jpg' alt='Dhow cruise off the Zanzibar coast' style='width:100%' />
</p>
<p>On the tranquil southern coast, Kizimkazi is where the island's wild dolphins gather in the bay. A morning boat trip to watch spinner and bottlenose dolphins at play is one of Zanzibar's most magical experiences — best followed by a lazy afternoon on the region's quiet, unspoiled beaches.</p>
`,
    ],
    [
      "The Palms' gourmet dining is included and changes daily. Kilindi's all-inclusive package covers three meals daily plus drinks and sundowners. At Baraza, the Stone & Spice Cafe serves Swahili fusion in a garden setting.",
      "At Baraza, the Stone & Spice Cafe serves Swahili fusion in a garden setting, while Xanadu's private chefs prepare bespoke menus in each villa.",
    ],
  ],
  "walking-safari-south-luangwa": [
    ["<img src='/images/lrc-walking.jpg' alt='Walking safari in South Luangwa'", "<img src='/images/pr-walking.jpg' alt='Walking safari in South Luangwa'"],
    [
      `<h3>Shawa Luangwa Camp</h3>
<p>
<img src='/images/shawa-plunge-pool.jpg' alt='Shawa Luangwa Camp plunge pool' style='width:100%' />
</p>
<p>Named after legendary Zambian guide Jacob Shawa, this intimate eco-camp features just five raised A-frame canvas tents. Each tent opens on three sides to offer 270-degree views over the river and its pods of snorting hippo. Shawa is a pioneer of silent safaris, using solar-powered electric Land Cruisers that traverse the wilderness quietly.</p>
<p>The rooftop starbed on each tent offers a place to sleep beneath the African sky - an experience that will redefine your understanding of romance.</p>
`,
      `<h3>The Star Bed Experience</h3>
<p>
<img src='/images/pr-starbed.jpg' alt='Star bed under the African sky' style='width:100%' />
</p>
<p>No moment captures South Luangwa's romance quite like the star bed. At Puku Ridge, a four-poster bed is rolled onto a private tower above the floodplain, where you fall asleep beneath the Milky Way to the soundtrack of the valley — the grunt of hippo, the distant call of hyena. It is an experience that will redefine your understanding of romance.</p>
`,
    ],
    [
      `<h3>Luangwa River Camp</h3>
<p>
<img src='/images/lrc-river-view.jpg' alt='Luangwa River Camp river view' style='width:100%' />
</p>
<p>Set beneath an ancient ebony grove on the banks of the Luangwa River, this intimate camp offers just five thatched bush suites for a maximum of ten guests. Operated by the renowned Robin Pope Safaris, the camp's sunken stone bathtubs gazing out onto the river are an experience in themselves.</p>
`,
      `<h3>Walking With South Luangwa's Finest Guides</h3>
<p>Both Chinzombo and Puku Ridge operate with some of the most experienced guides in Africa — many have walked these paths for decades. Each morning, your guide reads the bush like a book: the imprint of a leopard's paw in the damp sand, the musky scent of a buffalo herd bedded down in the thicket. This is knowledge passed down through generations, and it is yours for the morning.</p>
`,
    ],
    ["Plan your safari ?", "Plan your safari →"],
  ],
  "why-lake-malawi": [
    [
      "four extraordinary properties offer the most intimate escapes on the continent.",
      "three extraordinary properties offer the most intimate escapes on the continent.",
    ],
    [
      `<h2>Blue Zebra Island Lodge — Exclusive Island Escape</h2>
<p><img src='/images/bl-wetu-00.jpg' alt='Blue Zebra Island Lodge' style='width:100%' />
</p>
<p>Set on its own private island within the UNESCO-listed Lake Malawi National Park, Blue Zebra Island Lodge offers the ultimate in romantic isolation. With just twelve rooms — from Executive Chalets with panoramic lake views to Lake Safari Tents nestled along the shoreline — this is intimacy by design.</p>
<p>Snorkel together in the crystal-clear waters among cichlid fish found nowhere else on earth. Kayak along deserted coves. Dine on a private beach beneath the stars. The island is a sanctuary not just for the birdlife that fills the canopy, but for couples seeking a world where time stands still.</p>
<p>The island spa offers treatments on a deck suspended above the water, the infinity pool gazes across the lake to the mountains of Mozambique, and the nature trails wind through some of the most biodiverse freshwater ecosystems on the planet.</p>
`,
      "",
    ],
    [
      "the barefoot intimacy of Kaya Mawa, the hillside grandeur of Pumulani, the island solitude of Blue Zebra, or the lakeside elegance of Makokola",
      "the barefoot intimacy of Kaya Mawa, the hillside grandeur of Pumulani, or the lakeside elegance of Makokola Retreat",
    ],
  ],
};

const BLOG_IMAGE_FIXES = {
  "zanzibar-spice-island": "/images/baraza-beach.jpg",
  "walking-safari-south-luangwa": "/images/pr-walking.jpg",
};

const STALE_TOKENS = [
  "blue-zebra",
  "Blue Zebra",
  "shawa",
  "Shawa",
  "the-palms",
  "The Palms",
  "the-residence",
  "The Residence",
  "kilindi",
  "Kilindi",
  "lrc-",
  "residence-hero",
  "the-makokola",
];

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"} (use --apply to write)`);
  console.log(`Supabase: ${url}`);

  // 1. Properties
  console.log("\n── Properties ──");
  for (const slug of STALE_PROPERTIES) {
    console.log(`  deactivate ${slug}`);
    if (APPLY) await req("PATCH", "properties", `slug=eq.${slug}`, { is_active: false });
  }
  // Rename live DB slug to match curated constants, then the curated loop below
  // activates + features it under the canonical slug.
  console.log(`  rename ${MAKOKOLA_RENAME.from} → ${MAKOKOLA_RENAME.to}`);
  if (APPLY) await req("PATCH", "properties", `slug=eq.${MAKOKOLA_RENAME.from}`, { slug: MAKOKOLA_RENAME.to });
  for (const slug of CURATED_PROPERTIES) {
    console.log(`  activate + feature ${slug}`);
    if (APPLY) await req("PATCH", "properties", `slug=eq.${slug}`, { is_active: true, is_featured: true });
  }

  // 2. Packages
  console.log("\n── Packages ──");
  for (const slug of STALE_PACKAGES) {
    console.log(`  deactivate ${slug}`);
    if (APPLY) await req("PATCH", "packages", `slug=eq.${slug}`, { is_active: false });
  }
  for (const slug of CURATED_PACKAGES) {
    console.log(`  activate ${slug}`);
    if (APPLY) await req("PATCH", "packages", `slug=eq.${slug}`, { is_active: true });
  }

  // 3. Blog posts
  console.log("\n── Blog posts ──");
  const res = await fetch(`${BASE}/blog_posts?select=slug,title,excerpt,content,image&is_published=eq.true`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const posts = await res.json();

  for (const post of posts) {
    const replacements = BLOG_REPLACEMENTS[post.slug];
    const newImage = BLOG_IMAGE_FIXES[post.slug];
    let content = post.content;
    let image = post.image;
    let changed = false;

    if (replacements) {
      for (const [from, to] of replacements) {
        const fromN = norm(from);
        const toN = norm(to);
        if (content.includes(fromN)) {
          content = content.split(fromN).join(toN);
          changed = true;
        } else {
          console.log(`  ⚠ ${post.slug}: replacement NOT FOUND: ${fromN.slice(0, 70).replace(/\n/g, " ")}...`);
        }
      }
      const leftovers = STALE_TOKENS.filter((t) => content.includes(t));
      if (leftovers.length) {
        console.log(`  ⚠ ${post.slug}: stale tokens remain after scrub: ${leftovers.join(", ")}`);
      }
    }
    if (newImage && image !== newImage) {
      image = newImage;
      changed = true;
    }

    if (changed) {
      console.log(`  ✎ ${post.slug}: content ${post.content.length} → ${content.length} chars, image ${post.image} → ${image}`);
      if (APPLY) {
        await req("PATCH", "blog_posts", `slug=eq.${post.slug}`, { content, image });
      }
    }
  }

  // 4. Unpublish stub posts
  console.log("\n── Stub posts (unpublish) ──");
  for (const slug of STUB_POSTS) {
    console.log(`  unpublish ${slug}`);
    if (APPLY) await req("PATCH", "blog_posts", `slug=eq.${slug}`, { is_published: false });
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
