// Trippa Luxury Travel - Seed Script
// Populates all Supabase tables with initial data
// Run: node scripts/seed.mjs

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://lgpdnmtauvkpkgmyyjcr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncGRubXRhdXZrcGtnbXl5amNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc1OTU3MSwiZXhwIjoyMDk0MzM1NTcxfQ.RA9HjDmuBxB-X6y0NjAO8LIGnBfr2fYQiNg1qAvDG-U",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("🌱 Seeding Trippa Luxury Travel database...\n");

  // ─── PROPERTIES ────────────────────────────────────────────────
  const { error: errProps } = await supabase.from("properties").upsert([
    { slug: "kaya-mawa", name: "Kaya Mawa", destination: "lake-malawi", location: "Likoma Island, Lake Malawi", tagline: "Where barefoot luxury meets the Lake of Stars", description: "Kaya Mawa sits on the shores of Likoma Island like a secret waiting to be discovered.", hero_image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80", gallery: ["https://images.unsplash.com/photo-1540972501202-c4389992159f?w=800&q=80", "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80"], price_range: "$800 - $2,500 per night", rating: 4.9, is_featured: true, is_active: true },
    { slug: "pumulani-lodge", name: "Pumulani Lodge", destination: "lake-malawi", location: "Cape Maclear, Lake Malawi", tagline: "Romance carved into the lakeshore", description: "Pumulani Lodge perches on a hillside above the crystal waters of Lake Malawi.", hero_image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80", price_range: "$600 - $1,800 per night", rating: 4.7, is_active: true },
    { slug: "blue-zebra-island-lodge", name: "Blue Zebra Island Lodge", destination: "lake-malawi", location: "Mumbo Island, Lake Malawi", tagline: "An island sanctuary of unparalleled serenity", description: "Blue Zebra Island Lodge occupies its own private island.", hero_image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80", price_range: "$500 - $1,500 per night", rating: 4.6, is_active: true },
    { slug: "puku-ridge-camp", name: "Puku Ridge Camp", destination: "south-luangwa", location: "South Luangwa National Park", tagline: "Where the wilderness comes to you", description: "Puku Ridge Camp occupies one of the most sought-after positions in South Luangwa.", hero_image: "https://images.unsplash.com/photo-1544957992-20514f595d6f?w=800&q=80", price_range: "$900 - $2,800 per night", rating: 4.9, is_featured: true, is_active: true },
    { slug: "luangwa-safari-house", name: "Luangwa Safari House", destination: "south-luangwa", location: "South Luangwa National Park", tagline: "The ultimate private safari residence", description: "Luangwa Safari House is a private, exclusive-use property.", hero_image: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&q=80", price_range: "$2,000 - $5,000 per night", rating: 5.0, is_active: true },
    { slug: "luangwa-river-camp", name: "Luangwa River Camp", destination: "south-luangwa", location: "South Luangwa National Park", tagline: "Intimate elegance on the river's edge", description: "Luangwa River Camp offers an intimate safari experience.", hero_image: "https://images.unsplash.com/photo-1571003123894-1f0594d2d5d9?w=800&q=80", price_range: "$700 - $2,000 per night", rating: 4.7, is_active: true },
    { slug: "xanadu-villas", name: "Xanadu Villas", destination: "zanzibar", location: "East Coast, Zanzibar", tagline: "Where every villa tells a love story", description: "Xanadu Villas offers the pinnacle of private villa living.", hero_image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80", price_range: "$1,000 - $3,500 per night", rating: 4.8, is_active: true },
    { slug: "zanzibar-white-sand-villas", name: "Zanzibar White Sand Villas", destination: "zanzibar", location: "Michamvi Peninsula, Zanzibar", tagline: "Barefoot elegance on the Spice Island", description: "Zanzibar White Sand Villas combines Swahili architecture with contemporary luxury.", hero_image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80", price_range: "$600 - $2,000 per night", rating: 4.6, is_active: true },
    { slug: "the-residence-zanzibar", name: "The Residence Zanzibar", destination: "zanzibar", location: "South Coast, Zanzibar", tagline: "The definitive Zanzibar luxury experience", description: "The Residence Zanzibar is a sprawling beachfront resort.", hero_image: "https://images.unsplash.com/photo-1561501900-3701fa6a0864?w=800&q=80", price_range: "$800 - $2,500 per night", rating: 4.8, is_featured: true, is_active: true },
  ], { onConflict: "slug" });
  if (errProps) console.error("❌ PROPERTIES:", errProps.message);
  else console.log("✅ Properties seeded");

  // ─── TOURS ──────────────────────────────────────────────────────
  const { error: errTours } = await supabase.from("tours").upsert([
    { slug: "walking-safari-adventure", title: "Walking Safari Adventure", category: "Safari", destination: "south-luangwa", duration_days: 3, pricing_from: 1200, currency: "USD", is_active: true, is_featured: true, description: "Experience the birthplace of walking safaris.", hero_image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", included: ["All meals", "Professional guide", "Park fees", "Transfers"], difficulty: "moderate", min_pax: 2, max_pax: 8 },
    { slug: "sunset-dhow-cruise", title: "Sunset Dhow Cruise & Beach Dinner", category: "Romance", destination: "zanzibar", duration_days: 1, pricing_from: 350, currency: "USD", is_active: true, is_featured: true, description: "Romantic sunset cruise with private beach dinner.", hero_image: "https://images.unsplash.com/photo-1578099139121-68fc7f86ca09?w=800&q=80", difficulty: "easy" },
    { slug: "private-island-picnic", title: "Private Island Picnic Experience", category: "Romance", destination: "lake-malawi", duration_days: 1, pricing_from: 450, currency: "USD", is_active: true, is_featured: false, description: "Private picnic on a deserted island.", hero_image: "https://images.unsplash.com/photo-1540972501202-c4389992159f?w=800&q=80", difficulty: "easy" },
    { slug: "full-day-safari", title: "Full-Day Safari Game Drive", category: "Safari", destination: "south-luangwa", duration_days: 1, pricing_from: 400, currency: "USD", is_active: true, is_featured: false, description: "Full day game viewing.", hero_image: "https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80", difficulty: "easy" },
    { slug: "spice-tour-stone-town", title: "Spice Plantation & Stone Town Tour", category: "Cultural", destination: "zanzibar", duration_days: 1, pricing_from: 200, currency: "USD", is_active: true, is_featured: false, description: "Discover Zanzibar's spices and history.", hero_image: "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6d5?w=800&q=80", difficulty: "easy" },
    { slug: "couples-spa-wellness", title: "Couples Spa & Wellness Retreat", category: "Wellness", destination: "zanzibar", duration_days: 3, pricing_from: 1800, currency: "USD", is_active: true, is_featured: true, description: "Indulgent spa treatments for couples.", hero_image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80", difficulty: "easy" },
    { slug: "kayak-snorkel-expedition", title: "Guided Kayak & Snorkel Expedition", category: "Adventure", destination: "lake-malawi", duration_days: 1, pricing_from: 180, currency: "USD", is_active: false, is_featured: false, description: "Explore Lake Malawi's crystal waters.", hero_image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80", difficulty: "moderate" },
    { slug: "stargazing-sleepout", title: "Stargazing Sleepout on the Floodplain", category: "Romance", destination: "south-luangwa", duration_days: 1, pricing_from: 600, currency: "USD", is_active: true, is_featured: true, description: "Sleep under African stars.", hero_image: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80", difficulty: "easy" },
  ], { onConflict: "slug" });
  if (errTours) console.error("❌ TOURS:", errTours.message);
  else console.log("✅ Tours seeded");

  // ─── PACKAGES ──────────────────────────────────────────────────
  const { error: errPkg } = await supabase.from("packages").upsert([
    { slug: "beach-bush-escape", title: "Beach & Bush Escape", subtitle: "The ultimate African romance itinerary", description: "Begin on the shores of Lake Malawi then venture into the wild heart of South Luangwa.", duration: "10 days / 9 nights", price: "From $15,000 per couple", destinations: ["lake-malawi", "south-luangwa"], inclusions: ["Luxury accommodation", "Private transfers", "All meals", "Safari activities"], itinerary: [{ day: 1, title: "Arrival at Lake Malawi", description: "Private transfer to Kaya Mawa" }, { day: 2, title: "Lake Exploration", description: "Dhow cruise and snorkeling" }, { day: 3, title: "Island Picnic", description: "Private picnic on Mumbo Island" }, { day: 4, title: "Transfer to South Luangwa", description: "Scenic flight to the valley" }, { day: 5, title: "Walking Safari", description: "Guided bush walk" }, { day: 6, title: "Game Drives", description: "Full day safari" }, { day: 7, title: "Night Safari", description: "After dark game viewing" }, { day: 8, title: "Departure", description: "Morning game drive and transfer" }], is_active: true },
    { slug: "romance-zanzibar", title: "Romance in Zanzibar", subtitle: "Seven days of spice island enchantment", description: "Experience the magic of Zanzibar with this handcrafted romantic itinerary.", duration: "7 days / 6 nights", price: "From $8,500 per couple", destinations: ["zanzibar"], inclusions: ["Luxury villa", "Private transfers", "Half-board", "Spice tour", "Sunset dhow cruise"], itinerary: [{ day: 1, title: "Arrival", description: "Welcome to Zanzibar" }, { day: 2, title: "Stone Town", description: "Guided heritage walk" }, { day: 3, title: "Spice Tour", description: "Aromatic plantation visit" }, { day: 4, title: "Beach Day", description: "Relaxation and water sports" }, { day: 5, title: "Dhow Cruise", description: "Champagne at sea" }, { day: 6, title: "Spa & Relaxation", description: "Couples wellness day" }, { day: 7, title: "Departure", description: "Farewell breakfast" }], is_active: true },
    { slug: "safari-adventure", title: "Safari Adventure", subtitle: "Five days in the birthplace of walking safaris", description: "An immersive safari experience in South Luangwa.", duration: "5 days / 4 nights", price: "From $6,500 per person", destinations: ["south-luangwa"], inclusions: ["Luxury camp", "All meals", "Game drives", "Walking safaris", "Park fees"], itinerary: [{ day: 1, title: "Arrival", description: "Transfer to camp" }, { day: 2, title: "Game Drive", description: "Full day safari" }, { day: 3, title: "Walking Safari", description: "Guided bush walk" }, { day: 4, title: "Night Safari", description: "Sundowner and night drive" }, { day: 5, title: "Departure", description: "Morning game drive" }], is_active: true },
  ], { onConflict: "slug" });
  if (errPkg) console.error("❌ PACKAGES:", errPkg.message);
  else console.log("✅ Packages seeded");

  // ─── BLOG POSTS ─────────────────────────────────────────────────
  const { error: errBlog } = await supabase.from("blog_posts").upsert([
    { slug: "romance-lake-malawi", title: "Why Lake Malawi is Africa's Most Romantic Destination", category: "Romance", excerpt: "Discover why the Lake of Stars is capturing hearts.", content: "Lake Malawi is not merely a destination. It is a benediction...", author: "Trippa Concierge", image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80", is_published: true, published_at: "2026-04-15" },
    { slug: "walking-safari-guide", title: "The Complete Guide to Walking Safaris in South Luangwa", category: "Safari", excerpt: "Everything you need to know about walking safaris.", content: "South Luangwa is the birthplace of the walking safari...", author: "Trippa Concierge", image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", is_published: true, published_at: "2026-04-10" },
    { slug: "zanzibar-honeymoon", title: "Zanzibar Honeymoon: The Ultimate Couples Guide", category: "Travel", excerpt: "From spice-scented alleys to powder-soft beaches.", content: "Zanzibar exists at the intersection of culture and paradise...", author: "Trippa Concierge", image: "https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=800&q=80", is_published: true, published_at: "2026-04-05" },
    { slug: "luxury-travel-trends-2026", title: "Luxury Travel Trends Reshaping African Safaris", category: "Travel", excerpt: "The future of luxury travel in Africa is intimate and immersive.", content: "The landscape of luxury travel is evolving...", author: "Trippa Team", image: "https://images.unsplash.com/photo-1499750310159-5b5f096fd68b?w=800&q=80", is_published: true, published_at: "2026-03-28" },
    { slug: "sustainable-tourism", title: "How Trippa Supports Sustainable Tourism in Africa", category: "Sustainability", excerpt: "Our commitment to preserving Africa's heritage.", content: "At Trippa, we believe luxury travel should leave a positive footprint...", author: "Trippa Team", image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80", is_published: true, published_at: "2026-03-20" },
    { slug: "best-time-to-visit", title: "The Best Time to Visit Each Destination", category: "Travel Guide", excerpt: "Plan your perfect African escape.", content: "Timing is everything when planning your African adventure...", author: "Trippa Concierge", image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", is_published: true, published_at: "2026-03-15" },
  ], { onConflict: "slug" });
  if (errBlog) console.error("❌ BLOG:", errBlog.message);
  else console.log("✅ Blog posts seeded");

  // ─── INQUIRIES ─────────────────────────────────────────────────
  const { error: errInq } = await supabase.from("inquiries").upsert([
    { full_name: "Sarah & James Mitchell", email: "sarah@example.com", phone: "+44 20 7123 4567", destination: "Lake Malawi & Zanzibar", preferred_dates: "June 2026", guests: 2, message: "We are dreaming of a honeymoon combining Lake Malawi and Zanzibar.", status: "new", source: "website" },
    { full_name: "Alexander Petrov", email: "alex@example.com", phone: "+47 123 45 678", destination: "Zanzibar", preferred_dates: "July 2026", guests: 2, message: "Interested in our anniversary at The Residence Zanzibar.", status: "new", source: "website" },
    { full_name: "David Mueller", email: "david@example.com", phone: "+49 30 1234 5678", destination: "Lake Malawi", preferred_dates: "August 2026", guests: 2, message: "Considering Kaya Mawa for our anniversary.", status: "read", source: "website" },
    { full_name: "Emma Chen", email: "emma@example.com", phone: "+61 2 1234 5678", destination: "South Luangwa", preferred_dates: "September 2026", guests: 2, message: "Booking babymoon - want luxury safari experience.", status: "contacted", source: "website" },
    { full_name: "Michael Barnes", email: "michael@example.com", phone: "+1 212 555 0198", destination: "Lake Malawi & South Luangwa", preferred_dates: "October 2026", guests: 2, message: "Interested in Beach and Bush Escape package.", status: "qualified", source: "website" },
    { full_name: "Sophie Leclerc", email: "sophie@example.com", phone: "+33 1 23 45 67 89", destination: "South Luangwa", preferred_dates: "June 2026", guests: 2, message: "Finalizing Romantic Safari Journey for June 2026.", status: "booked", source: "website" },
  ], { onConflict: "id" });
  if (errInq) console.error("❌ INQUIRIES:", errInq.message);
  else console.log("✅ Inquiries seeded");

  // ─── BOOKINGS ──────────────────────────────────────────────────
  // Use valid statuses from booking_statuses table: provisional, confirmed, deposit_paid, balance_due, paid, in_progress, completed, cancelled, refunded
  const { error: errBook } = await supabase.from("bookings").upsert([
    { client_name: "Sarah & James Mitchell", client_email: "sarah@example.com", client_phone: "+44 20 7123 4567", destination: "lake-malawi", start_date: "2026-06-15", end_date: "2026-06-22", guests_count: 2, total_amount: 12500, currency: "USD", deposit_amount: 6250, status: "confirmed", special_requests: "Anniversary celebration" },
    { client_name: "Alexander Petrov", client_email: "alex@example.com", client_phone: "+47 123 45 678", destination: "zanzibar", start_date: "2026-07-01", end_date: "2026-07-08", guests_count: 2, total_amount: 8200, currency: "USD", deposit_amount: 4100, status: "provisional", special_requests: "Ocean view suite" },
    { client_name: "Emma Chen", client_email: "emma@example.com", client_phone: "+61 2 1234 5678", destination: "south-luangwa", start_date: "2026-08-10", end_date: "2026-08-17", guests_count: 2, total_amount: 9800, currency: "USD", deposit_amount: 4900, status: "confirmed" },
    { client_name: "Michael Barnes", client_email: "michael@example.com", client_phone: "+1 212 555 0198", destination: "lake-malawi", start_date: "2026-09-05", end_date: "2026-09-15", guests_count: 2, total_amount: 15000, currency: "USD", deposit_amount: 7500, status: "confirmed", special_requests: "Honeymoon" },
  ], { onConflict: "id" });
  if (errBook) console.error("❌ BOOKINGS:", errBook.message);
  else console.log("✅ Bookings seeded");

  // ─── MEDIA ASSETS ──────────────────────────────────────────────
  const { error: errMedia } = await supabase.from("media_assets").upsert([
    { filename: "homepage-hero.jpg", url: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80", type: "image", category: "homepage", alt_text: "Lake Malawi aerial view" },
    { filename: "homepage-featured1.jpg", url: "https://images.unsplash.com/photo-1540972501202-c4389992159f?w=800&q=80", type: "image", category: "homepage", alt_text: "Lake Malawi" },
    { filename: "homepage-featured2.jpg", url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80", type: "image", category: "homepage", alt_text: "South Luangwa safari" },
    { filename: "lake-malawi-hero.jpg", url: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80", type: "image", category: "destinations", alt_text: "Lake Malawi hero" },
    { filename: "south-luangwa-hero.jpg", url: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1920&q=80", type: "image", category: "destinations", alt_text: "South Luangwa hero" },
    { filename: "zanzibar-hero.jpg", url: "https://images.unsplash.com/photo-1586861203927-800a5acdcc4d?w=1920&q=80", type: "image", category: "destinations", alt_text: "Zanzibar hero" },
  ], { onConflict: "id" });
  if (errMedia) console.error("❌ MEDIA:", errMedia.message);
  else console.log("✅ Media assets seeded");

  // ─── INVOICES ──────────────────────────────────────────────────
  // Valid statuses: draft, sent, paid, overdue, cancelled, refunded
  const { error: errInv } = await supabase.from("invoices").upsert([
    { invoice_type: "deposit", issue_date: "2026-04-01", due_date: "2026-04-15", subtotal: 6250, total_amount: 6250, currency: "USD", status: "paid", line_items: [{ description: "Deposit for Beach & Bush Escape", quantity: 1, unit_price: 6250, total: 6250 }] },
    { invoice_type: "final", issue_date: "2026-04-10", due_date: "2026-05-10", subtotal: 6250, total_amount: 6250, currency: "USD", status: "sent", line_items: [{ description: "Balance for Beach & Bush Escape", quantity: 1, unit_price: 6250, total: 6250 }] },
    { invoice_type: "deposit", issue_date: "2026-04-05", due_date: "2026-04-20", subtotal: 4100, total_amount: 4100, currency: "USD", status: "draft", line_items: [{ description: "Deposit for Romance in Zanzibar", quantity: 1, unit_price: 4100, total: 4100 }] },
    { invoice_type: "final", issue_date: "2026-03-15", due_date: "2026-04-15", subtotal: 4900, total_amount: 4900, currency: "USD", status: "overdue", line_items: [{ description: "Balance for Safari Adventure", quantity: 1, unit_price: 4900, total: 4900 }] },
  ], { onConflict: "id" });
  if (errInv) console.error("❌ INVOICES:", errInv.message);
  else console.log("✅ Invoices seeded");

  // ─── EXPENSES ──────────────────────────────────────────────────
  const { error: errExp } = await supabase.from("expenses").upsert([
    { description: "Accommodation cost - Kaya Mawa", amount: 3200, currency: "USD", expense_date: "2026-04-01", is_reimbursable: false },
    { description: "Guide fees - Walking Safari", amount: 800, currency: "USD", expense_date: "2026-04-03", is_reimbursable: false },
    { description: "Transfer costs - ProFlight", amount: 1200, currency: "USD", expense_date: "2026-04-05", is_reimbursable: false },
    { description: "Marketing - Google Ads", amount: 500, currency: "USD", expense_date: "2026-04-07", is_reimbursable: false },
    { description: "Office rent (monthly)", amount: 2000, currency: "USD", expense_date: "2026-04-01", is_reimbursable: false },
  ], { onConflict: "id" });
  if (errExp) console.error("❌ EXPENSES:", errExp.message);
  else console.log("✅ Expenses seeded");

  console.log("\n🎉 Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
