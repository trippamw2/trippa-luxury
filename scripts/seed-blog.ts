/**
 * Seed blog posts for SEO content — destination guides and romance content.
 *
 * Run with: npx tsx scripts/seed-blog.ts
 */
import { createAdminClient } from "../src/lib/supabase/admin";

const POSTS = [
  {
    slug: "ultimate-guide-to-lake-malawi",
    title: "The Ultimate Guide to Lake Malawi: Africa's Lake of Stars",
    excerpt:
      "Discover everything you need to know about Lake Malawi — from the best time to visit and how to get there, to the most romantic luxury lodges and unforgettable experiences for couples. Your complete travel guide to Africa's most intimate freshwater paradise.",
    content: `
      <h3>Introduction: The Lake of Stars</h3>
      <p>Lake Malawi, known as the Lake of Stars, is Africa's third-largest lake and one of the continent's most extraordinary natural wonders. Stretching over 580 kilometres through the Great Rift Valley, this ancient freshwater sea has been cradling lovers for centuries with its crystal-clear waters, pristine beaches, and deserted islands.</p>
      <p>For couples seeking an intimate escape that combines barefoot luxury with genuine adventure, Lake Malawi offers something no other African destination can: complete seclusion on a freshwater paradise where the only decision is whether to snorkel with tropical fish, kayak at golden hour, or do nothing at all.</p>

      <h3>Best Time to Visit Lake Malawi</h3>
      <p>The dry season from May to October is the optimal time to visit, offering warm, sunny days and calm lake conditions. June through August provides the clearest skies for the famous "Lake of Stars" effect — the Milky Way reflecting off the lake's surface is a sight that defines romantic travel in Africa.</p>
      <p>The green season (November to April) transforms the landscape into a lush paradise. While afternoon showers are common, you'll enjoy fewer crowds, lower rates, and a more intimate experience. January and February can be hot and humid but offer exceptional birdwatching and dramatic skies.</p>

      <h3>How to Get to Lake Malawi</h3>
      <p>International visitors fly into Lilongwe (LLW), the capital of Malawi, via Johannesburg (South Africa), Nairobi (Kenya), or Addis Ababa (Ethiopia). From Lilongwe, it's a scenic 45-minute light aircraft charter to Likoma Island or a 4-hour drive to the lakeshore resorts around Salima and Mangochi.</p>
      <p>Kivara arranges all transfers including private charters, road transfers in luxury vehicles, and seamless connections from your international flight. Your journey from arrival to your suite is handled entirely by our concierge team.</p>

      <h3>Where to Stay: Luxury Lodges on Lake Malawi</h3>
      <p>Kivara curates five exceptional Lake Malawi properties, each offering a distinct expression of lakeside luxury:</p>
      <p><strong>Kaya Mawa</strong> — The iconic barefoot luxury resort on Likoma Island. 10 handcrafted stone-and-thatch suites scattered along a rocky peninsula, each with private access to the lake. The definition of romantic seclusion.</p>
      <p><strong>Pumulani</strong> — Colonial-chic lakeside villas on the mainland shore. Ten spacious villas with private plunge pools, a stunning infinity pool overlooking the lake, and the best spa on Lake Malawi.</p>
      <p><strong>Blue Zebra Island Lodge</strong> — A private island escape in the Lake Malawi National Park. 10 eco-chic rooms with breathtaking views of the surrounding islands. Perfect for active couples who love snorkelling and kayaking.</p>
      <p><strong>Makokola Retreat</strong> — An intimate lakehouse with nine elegant rooms, exceptional dining, and a relaxed atmosphere. Ideal for couples seeking understated elegance.</p>

      <h3>Romantic Experiences for Couples</h3>
      <p>Lake Malawi offers an extraordinary range of couples' experiences: snorkelling with tropical cichlids in crystal-clear coves, sunset dhow cruises, kayaking through golden hour light, private picnics on deserted islands, scuba diving on untouched reefs, and paddleboarding on the mirror-still lake.</p>
      <p>For the ultimate romantic experience, arrange a private beach dinner on a deserted stretch of sand, lit by lanterns with the Lake of Stars glittering overhead. It is, without exaggeration, one of the most romantic experiences Africa offers.</p>

      <h3>How Many Days Should You Spend?</h3>
      <p>We recommend 5-7 nights at a single property to fully immerse in the Lake Malawi rhythm, or 7-10 nights to combine two lodges (e.g., Kaya Mawa on Likoma Island followed by Pumulani on the mainland shore). Most couples find that a week allows the perfect balance of adventure, relaxation, and romance.</p>
    `,
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
    content: `
      <h3>Introduction: The Valley of the Leopard</h3>
      <p>South Luangwa National Park is not merely a safari destination — it is the birthplace of the walking safari and one of Africa's most intimate wildlife experiences. For couples, it offers something increasingly rare in African travel: the feeling of having the wilderness entirely to yourselves.</p>
      <p>With a maximum of six to twelve suites per camp and vast private concessions, South Luangwa delivers an exclusivity that larger parks cannot match. Here, a lion's roar at dawn becomes your shared alarm clock, and elephants wander through camp at dusk as if welcoming you into their world.</p>

      <h3>Best Time for a Romantic Safari</h3>
      <p>The dry season from May to October is prime time for wildlife viewing, as animals concentrate around the Luangwa River. June through August offers exceptional game viewing with cool mornings and mild days — perfect for walking safaris.</p>
      <p>The emerald season (November to April) transforms the valley into a lush paradise. While some camps close during January and February, the shoulder months of November and March offer extraordinary beauty, fewer visitors, and excellent value.</p>

      <h3>Why South Luangwa is Special for Couples</h3>
      <p>South Luangwa's magic lies in its intimacy. Walking safaris allow you to experience the bush on foot — holding hands as you follow elephant paths, stopping to examine tracks, feeling the raw energy of Africa. Night drives reveal a nocturnal world of leopards, hyenas, and genet cats that vehicle-based parks cannot offer.</p>
      <p>The camps themselves are designed for romance: private plunge pools overlooking the floodplain, star bed sleepouts under the Milky Way, candlelit bush dinners set for two, and outdoor bathtubs where you can soak while elephants drink from the river below.</p>

      <h3>Best Luxury Camps in South Luangwa</h3>
      <p><strong>Time+Tide Chinzombo</strong> — Six avant-garde riverfront villas with private plunge pools, indoor-outdoor bathrooms, and a superb infinity pool overlooking the Luangwa River. Award-winning architecture meets safari chic.</p>
      <p><strong>Puku Ridge Camp</strong> — Six hilltop suites with star bed towers overlooking the vast Kakumbi floodplain. The panoramas are breathtaking, the suites are spectacular, and the star bed experience is unforgettable.</p>
      <p><strong>Shawa Luangwa Camp</strong> — Six eco-luxury tented suites powered by solar energy. Silent game vehicles mean you hear the bush, not the engine. An intimate, eco-conscious safari experience.</p>
      <p><strong>Luangwa River Camp</strong> — Five intimate riverside suites with the most personalised service in the valley. The ultimate choice for couples seeking privacy and genuine warmth.</p>

      <h3>Getting to South Luangwa</h3>
      <p>Fly into Kenneth Kaunda International Airport in Lusaka (LUN), then take a 1.5-hour light aircraft flight to Mfuwe Airport. From Mfuwe, it's a scenic 30-60 minute game-drive transfer to your camp — your safari begins the moment you land.</p>

      <h3>Wildlife in South Luangwa</h3>
      <p>South Luangwa is renowned for extraordinary leopard sightings (many consider it Africa's best), large herds of elephants, Thornicroft's giraffe (found only here), lions, wild dogs, hippos, crocodiles, and over 400 bird species. Night drives reveal a completely different world of nocturnal wildlife.</p>
    `,
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
    content: `
      <h3>Introduction: The Spice Island</h3>
      <p>Zanzibar is a love letter to the senses. The scent of cloves and cinnamon drifts through the air, the turquoise Indian Ocean lazes against powder-soft beaches, and the ancient alleyways of Stone Town whisper stories of centuries past. For couples, Zanzibar offers an intoxicating blend of pristine beaches, world-class luxury, and rich cultural heritage that few destinations can match.</p>

      <h3>Best Time to Visit Zanzibar</h3>
      <p>Zanzibar enjoys year-round tropical weather. June to October is the dry season with sunny days and lower humidity — the most popular time for visitors. January and February offer hot, dry weather with excellent beach conditions. The short rains (November-December) and long rains (March-May) bring fewer crowds and lower rates, ideal for couples seeking solitude.</p>

      <h3>Why Zanzibar is Perfect for Couples</h3>
      <p>Zanzibar's romance lies in its extraordinary variety. In a single trip, you can explore the ancient alleyways of Stone Town hand in hand, sail on a traditional dhow at sunset with champagne, enjoy a private dinner on a sandbank surrounded by turquoise waters, and indulge in couples' spa treatments using indigenous Zanzibari ingredients like cloves, cinnamon, and coconut.</p>
      <p>The island's spice plantations offer immersive tours where you taste fresh vanilla, cardamom, and nutmeg. Cooking classes teach you to prepare Swahili cuisine together. And the beaches — endless stretches of white sand fringed by palm trees — are among the most beautiful in the world.</p>

      <h3>Best Luxury Resorts in Zanzibar</h3>
      <p><strong>Baraza Resort & Spa</strong> — Zanzibar's most awarded Swahili palace. 30 lavish villas with private pools, set in arabesque gardens on the southeast coast. The service is exceptional, the spa is world-class, and the architecture is breathtaking.</p>
      <p><strong>Xanadu Villas</strong> — An exclusive collection of private villas with personal butlers, private pools, and direct beach access. The ultimate choice for couples who want complete privacy and personalised service.</p>
      <p><strong>Kilindi Zanzibar</strong> — Elewana's iconic white-domed pavilions set within 50 acres of tropical gardens. Each pavilion has a private plunge pool and the most romantic outdoor bathrooms on the island.</p>
      <p><strong>The Palms</strong> — An intimate six-villa hideaway on the northeast coast. Barefoot luxury at its finest, with a superb beach, exceptional dining, and genuine Swahili hospitality.</p>

      <h3>Things to Do for Couples</h3>
      <p>Zanzibar offers extraordinary variety: spice plantation tours, Stone Town heritage walks, sunset dhow cruises with champagne, private sandbank dining, world-class snorkelling and diving at Mnemba Atoll, deep-sea fishing, couples spa rituals, Swahili cooking classes, and visits to Jozani Forest to see red colobus monkeys.</p>

      <h3>How Many Days to Spend</h3>
      <p>We recommend 5-7 nights for a pure beach escape at a single resort, or 7-10 nights to combine two properties. A beach resort on the northeast coast paired with a heritage stay in Stone Town offers the perfect balance of relaxation and cultural exploration.</p>
    `,
    category: "Travel Guide",
    image: "/images/zanzibar-beach.jpg",
    author: "Kivara Team",
    read_time: "8 min read",
  },
  {
    slug: "africa-honeymoon-safari-lake-malawi-zanzibar",
    title: "The Ultimate Africa Honeymoon: Combining Lake Malawi and Zanzibar",
    excerpt:
      "The ultimate bush-and-beach honeymoon: combine the intimate freshwater paradise of Lake Malawi with the tropical island luxury of Zanzibar. Our complete guide to planning the most romantic African journey for two.",
    content: `
      <h3>Introduction: The Perfect Africa Honeymoon</h3>
      <p>The bush-and-beach combination is the world's most requested honeymoon format — and for good reason. Starting with the intimate wilderness of Lake Malawi, then flying to the tropical paradise of Zanzibar creates a journey of extraordinary contrast and romance.</p>
      <p>Lake Malawi offers seclusion, freshwater adventures, and the famous Lake of Stars. Zanzibar delivers spice-scented air, white-sand beaches, and world-class luxury resorts. Together, they form Africa's most underrated honeymoon combination.</p>

      <h3>Why Lake Malawi + Zanzibar Works</h3>
      <p>Both destinations are accessible from the same international gateway (fly into Lilongwe for Lake Malawi, then connect via Dar es Salaam or Nairobi to Zanzibar). Both offer year-round warm weather. And both specialize in the kind of intimate, couples-focused luxury that defines a truly memorable honeymoon.</p>
      <p>The contrast is what makes it magical: the deep tranquility of Lake Malawi sets the tone for relaxation, while Zanzibar's vibrant culture and stunning beaches provide the perfect finale.</p>

      <h3>Sample Itinerary: 12 Nights</h3>
      <p><strong>Days 1-7: Lake Malawi</strong> — 6 nights at Kaya Mawa on Likoma Island. Days spent snorkelling, kayaking, exploring deserted islands, and dining under the stars. The ultimate unwind.</p>
      <p><strong>Days 7-8: Travel Day</strong> — Charter flight from Likoma to Lilongwe, connecting flight to Zanzibar via Nairobi or Dar es Salaam. Overnight at a Stone Town hotel to break the journey.</p>
      <p><strong>Days 8-12: Zanzibar</strong> — 5 nights at Baraza Resort & Spa or Xanadu Villas. Spice tours, sunset dhow cruises, sandbank dining, and pure beach bliss.</p>

      <h3>Best Time for This Combination</h3>
      <p>June to October offers the best weather for both destinations. May and November are excellent shoulder months with fewer crowds. The long rains (March-April) are best avoided for this multi-destination itinerary.</p>

      <h3>Why Book with Kivara</h3>
      <p>We handle all logistics: international flights, internal charters, road transfers, lodge bookings, and activity planning. Your personal concierge ensures seamless connections between destinations so you can focus on each other, not the logistics. Every detail, from the champagne on arrival to the surprise honeymoon amenity in your suite, is crafted to make your journey unforgettable.</p>
    `,
    category: "Romance",
    image: "/images/zanzibar-dhow.jpg",
    author: "Kivara Team",
    read_time: "7 min read",
  },
];

async function main() {
  const supabase = createAdminClient();

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
