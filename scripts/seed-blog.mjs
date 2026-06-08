/**
 * Seed blog posts — run with: node --env-file=.env.local scripts/seed-blog.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase env vars. Run with: node --env-file=.env.local scripts/seed-blog.mjs");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const POSTS = [
  {
    slug: "ultimate-guide-to-lake-malawi",
    title: "The Ultimate Guide to Lake Malawi: Africa's Lake of Stars",
    excerpt:
      "Discover everything you need to know about Lake Malawi — from the best time to visit and how to get there, to the most romantic luxury lodges and unforgettable experiences for couples. Your complete travel guide to Africa's most intimate freshwater paradise.",
    content: [
      "<h3>Introduction: The Lake of Stars</h3>",
      "<p>Lake Malawi, known as the Lake of Stars, is Africa's third-largest lake and one of the continent's most extraordinary natural wonders. Stretching over 580 kilometres through the Great Rift Valley, this ancient freshwater sea has been cradling lovers for centuries with its crystal-clear waters, pristine beaches, and deserted islands.</p>",
      "<p>For couples seeking an intimate escape that combines barefoot luxury with genuine adventure, Lake Malawi offers something no other African destination can: complete seclusion on a freshwater paradise where the only decision is whether to snorkel with tropical fish, kayak at golden hour, or do nothing at all.</p>",
      "<h3>Best Time to Visit Lake Malawi</h3>",
      "<p>The dry season from May to October is the optimal time to visit, offering warm, sunny days and calm lake conditions. June through August provides the clearest skies for the famous 'Lake of Stars' effect — the Milky Way reflecting off the lake's surface is a sight that defines romantic travel in Africa.</p>",
      "<p>The green season (November to April) transforms the landscape into a lush paradise. While afternoon showers are common, you'll enjoy fewer crowds, lower rates, and a more intimate experience.</p>",
      "<h3>How to Get to Lake Malawi</h3>",
      "<p>International visitors fly into Lilongwe (LLW) via Johannesburg, Nairobi, or Addis Ababa. From Lilongwe, it's a scenic 45-minute light aircraft charter to Likoma Island or a 4-hour drive to the lakeshore resorts. Kivara arranges all transfers including private charters, road transfers, and connections from your international flight.</p>",
      "<h3>Where to Stay: Luxury Lodges</h3>",
      "<p>Kivara curates five exceptional Lake Malawi properties, each offering a distinct expression of lakeside luxury: <strong>Kaya Mawa</strong> (the iconic barefoot luxury resort on Likoma Island), <strong>Pumulani</strong> (colonial-chic lakeside villas with private plunge pools), <strong>Blue Zebra Island Lodge</strong> (private island escape), <strong>Makokola Retreat</strong> (intimate lakehouse elegance), and the soon-to-launch Bua River Lodge.</p>",
      "<h3>Romantic Experiences for Couples</h3>",
      "<p>Lake Malawi offers extraordinary couples' experiences: snorkelling with tropical cichlids, sunset dhow cruises, kayaking through golden hour light, private picnics on deserted islands, scuba diving, and paddleboarding on the mirror-still lake. For the ultimate romantic experience, arrange a private beach dinner under the Lake of Stars.</p>",
      "<h3>How Many Days Should You Spend?</h3>",
      "<p>We recommend 5-7 nights at a single property, or 7-10 nights to combine two lodges. Most couples find that a week allows the perfect balance of adventure, relaxation, and romance.</p>",
    ].join("\n"),
    category: "Travel Guide",
    image: "/images/kaya-mawa-beach-swing.jpg",
    author: "Kivara Team",
    read_time: "8 min read",
  },
  {
    slug: "south-luangwa-romantic-safari-guide",
    title: "South Luangwa Romantic Safari Guide: Where Love Meets the Wild",
    excerpt:
      "Planning a romantic safari in South Luangwa National Park? Our complete guide covers the best luxury camps, walking safaris for couples, wildlife highlights, and everything you need to plan the ultimate romantic wilderness escape in Zambia's most famous park.",
    content: [
      "<h3>Introduction: The Valley of the Leopard</h3>",
      "<p>South Luangwa National Park is not merely a safari destination — it is the birthplace of the walking safari and one of Africa's most intimate wildlife experiences. For couples, it offers something increasingly rare in African travel: the feeling of having the wilderness entirely to yourselves.</p>",
      "<p>With a maximum of six to twelve suites per camp and vast private concessions, South Luangwa delivers an exclusivity that larger parks cannot match. Here, a lion's roar at dawn becomes your shared alarm clock, and elephants wander through camp at dusk as if welcoming you into their world.</p>",
      "<h3>Best Time for a Romantic Safari</h3>",
      "<p>The dry season from May to October is prime time for wildlife viewing. June through August offers exceptional game viewing with cool mornings and mild days — perfect for walking safaris. The emerald season (November to April) transforms the valley into a lush paradise with fewer visitors.</p>",
      "<h3>Why South Luangwa is Special for Couples</h3>",
      "<p>Walking safaris allow you to experience the bush on foot — holding hands as you follow elephant paths. Night drives reveal a nocturnal world of leopards, hyenas, and genet cats. The camps themselves are designed for romance: private plunge pools, star bed sleepouts, candlelit bush dinners, and outdoor bathtubs overlooking the floodplain.</p>",
      "<h3>Best Luxury Camps</h3>",
      "<p><strong>Time+Tide Chinzombo</strong> — Six avant-garde riverfront villas with private plunge pools. <strong>Puku Ridge Camp</strong> — Six hilltop suites with star bed towers overlooking the floodplain. <strong>Shawa Luangwa Camp</strong> — Six eco-luxury tented suites with silent solar-powered safaris. <strong>Luangwa River Camp</strong> — Five intimate riverside suites with personalised service.</p>",
      "<h3>Getting to South Luangwa</h3>",
      "<p>Fly into Lusaka (LUN), then a 1.5-hour light aircraft flight to Mfuwe Airport. From Mfuwe, it's a 30-60 minute game-drive transfer to your camp.</p>",
    ].join("\n"),
    category: "Travel Guide",
    image: "/images/puku-ridge-3.jpg",
    author: "Kivara Team",
    read_time: "9 min read",
  },
  {
    slug: "zanzibar-romantic-getaway-guide",
    title: "Zanzibar for Couples: The Ultimate Romantic Getaway Guide",
    excerpt:
      "From spice tours and Stone Town heritage walks to private sandbank dining and luxury beach resorts — discover everything you need to plan the perfect romantic escape to Zanzibar, the Spice Island of dreams.",
    content: [
      "<h3>Introduction: The Spice Island</h3>",
      "<p>Zanzibar is a love letter to the senses. The scent of cloves and cinnamon drifts through the air, the turquoise Indian Ocean lazes against powder-soft beaches, and the ancient alleyways of Stone Town whisper stories of centuries past. For couples, Zanzibar offers an intoxicating blend of pristine beaches, world-class luxury, and rich cultural heritage.</p>",
      "<h3>Best Time to Visit</h3>",
      "<p>June to October is the dry season with sunny days and lower humidity. January and February offer hot, dry weather with excellent beach conditions. The rainy seasons bring fewer crowds and lower rates — ideal for couples seeking solitude.</p>",
      "<h3>Why Zanzibar is Perfect for Couples</h3>",
      "<p>Explore ancient Stone Town alleyways hand in hand, sail on a traditional dhow at sunset, enjoy private sandbank dining, and indulge in couples' spa treatments using indigenous Zanzibari ingredients. The island's spice plantations, world-class resorts, and powder-soft beaches create an atmosphere of pure romance.</p>",
      "<h3>Best Luxury Resorts</h3>",
      "<p><strong>Baraza Resort & Spa</strong> — Zanzibar's most awarded Swahili palace. <strong>Xanadu Villas</strong> — Private villa sanctuary with personal butlers. <strong>Kilindi Zanzibar</strong> — Iconic white-domed pavilions by Elewana. <strong>The Palms</strong> — Intimate six-villa hideaway. <strong>The Residence Zanzibar</strong> — Sprawling beachfront estate with private pools.</p>",
      "<h3>Things to Do for Couples</h3>",
      "<p>Spice plantation tours, Stone Town heritage walks, sunset dhow cruises, sandbank dining, snorkelling at Mnemba Atoll, deep-sea fishing, couples spa rituals, Swahili cooking classes, and Jozani Forest visits.</p>",
      "<h3>How Many Days to Spend</h3>",
      "<p>We recommend 5-7 nights for a pure beach escape, or 7-10 nights to combine two properties. A beach resort on the northeast coast paired with a Stone Town heritage stay offers the perfect balance.</p>",
    ].join("\n"),
    category: "Travel Guide",
    image: "/images/zanzibar-beach.jpg",
    author: "Kivara Team",
    read_time: "8 min read",
  },
  {
    slug: "africa-honeymoon-lake-malawi-zanzibar",
    title: "The Ultimate Africa Honeymoon: Combining Lake Malawi and Zanzibar",
    excerpt:
      "The ultimate bush-and-beach honeymoon: combine the intimate freshwater paradise of Lake Malawi with the tropical island luxury of Zanzibar. A complete guide to planning the most romantic African journey for two.",
    content: [
      "<h3>The Perfect Africa Honeymoon Combination</h3>",
      "<p>The bush-and-beach combination is the world's most requested honeymoon format. Starting with the intimate wilderness of Lake Malawi, then flying to the tropical paradise of Zanzibar creates a journey of extraordinary contrast and romance.</p>",
      "<p>Lake Malawi offers seclusion, freshwater adventures, and the Lake of Stars. Zanzibar delivers spice-scented air, white-sand beaches, and world-class luxury. Together, they form Africa's most underrated honeymoon combination.</p>",
      "<h3>Why This Combination Works</h3>",
      "<p>Both destinations are accessible from the same international gateway and offer year-round warm weather. The contrast — deep tranquility followed by vibrant island culture — creates a honeymoon journey that feels like two extraordinary trips in one.</p>",
      "<h3>Sample Itinerary: 12 Nights</h3>",
      "<p><strong>Days 1-7:</strong> Lake Malawi — 6 nights at Kaya Mawa on Likoma Island. Snorkelling, kayaking, exploring deserted islands, dining under the Lake of Stars.</p>",
      "<p><strong>Days 7-8:</strong> Travel day — Charter to Lilongwe, connect to Zanzibar.</p>",
      "<p><strong>Days 8-12:</strong> Zanzibar — 5 nights at Baraza Resort & Spa or Xanadu Villas. Spice tours, sunset dhow cruises, sandbank dining, and pure beach bliss.</p>",
      "<h3>Best Time for This Combination</h3>",
      "<p>June to October offers the best weather for both destinations. May and November are excellent shoulder months with fewer crowds.</p>",
      "<h3>Why Book with Kivara</h3>",
      "<p>We handle all logistics: international flights, internal charters, transfers, lodge bookings, and activity planning. Your personal concierge ensures seamless connections so you can focus on each other.</p>",
    ].join("\n"),
    category: "Romance",
    image: "/images/zanzibar-dhow.jpg",
    author: "Kivara Team",
    read_time: "7 min read",
  },
];

async function main() {
  for (const post of POSTS) {
    console.log(`Inserting: ${post.slug}...`);

    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", post.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  ↳ Already exists, skipping.`);
      continue;
    }

    const { error } = await supabase.from("blog_posts").insert({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      image: post.image,
      author: post.author,
      read_time: post.read_time,
      published_at: new Date().toISOString(),
      is_published: true,
    });

    if (error) {
      console.error(`  ✗ Error: ${error.message}`);
    } else {
      console.log(`  ✓ Done`);
    }
  }

  console.log("\nSeeding complete!");
}

main().catch(console.error);
