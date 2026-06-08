import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROPERTIES as CONSTANT_PROPERTIES,
  PACKAGES as CONSTANT_PACKAGES,
  EXPERIENCES as CONSTANT_EXPERIENCES,
  DESTINATIONS as CONSTANT_DESTINATIONS,
} from "@/lib/constants";
import { luxury } from "@/lib/voice";

type SupabaseClient = ReturnType<typeof createAdminClient>;

function mapKeysToCamel<T = any>(obj: Record<string, any>): T {
  if (Array.isArray(obj)) return obj.map((item) => mapKeysToCamel(item)) as any;
  if (obj === null || typeof obj !== "object") return obj as any;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = mapKeysToCamel(obj[key]);
  }
  return result as T;
}

/** Fields on a Property that can be overridden by the DB */
const PROPERTY_MERGE_FIELDS = [
  "name", "destination", "location", "tagline", "description",
  "longDescription", "priceRange", "rating", "heroImage", "gallery",
  "roomTypes", "rooms", "amenities", "romanticHighlights", "awards",
  "reviews", "isFeatured", "isActive",
] as const;

/** Merge constant properties with Supabase overrides : DB wins on all fields */
export async function getMergedProperties() {
  try {
    const supabase = createAdminClient();
    const { data: dbProperties, error } = await supabase
      .from("properties")
      .select("*")
      .order("name");

    if (error || !dbProperties) {
      console.warn("Failed to fetch properties from DB, using constants:", error?.message);
      return CONSTANT_PROPERTIES;
    }

    const dbMap = new Map<string, Record<string, any>>();
    for (const item of dbProperties) {
      const camel = mapKeysToCamel<Record<string, any>>(item);
      dbMap.set(camel.slug || camel.id, camel);
    }

    // Merge constants with selective DB overrides (skip null/undefined DB fields)
    const merged = CONSTANT_PROPERTIES.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      const result: Record<string, any> = { ...constant };
      for (const field of PROPERTY_MERGE_FIELDS) {
        if (dbRecord[field] !== null && dbRecord[field] !== undefined) {
          result[field] = dbRecord[field];
        }
      }
      // Preserve constant id (DB id is a UUID, we use the slug)
      result.id = constant.id;
      // Apply luxury voice formatting to text fields
      if (result.description) result.description = luxury(String(result.description));
      if (result.longDescription) result.longDescription = luxury(String(result.longDescription));
      if (result.tagline) result.tagline = luxury(String(result.tagline));
      return result as typeof constant;
    });

    // Add any DB-only properties (created in admin, no constant counterpart)
    for (const [slug, dbRecord] of dbMap) {
      const exists = CONSTANT_PROPERTIES.find((c) => c.id === slug);
      if (!exists) {
        merged.push({
          id: slug,
          name: dbRecord.name || slug,
          destination: dbRecord.destination || "",
          location: dbRecord.location || "",
          tagline: luxury(dbRecord.tagline || ""),
          description: luxury(dbRecord.description || ""),
          longDescription: luxury(dbRecord.longDescription || ""),
          heroImage: dbRecord.heroImage || "",
          gallery: dbRecord.gallery || [],
          priceRange: dbRecord.priceRange || "",
          roomTypes: dbRecord.roomTypes || [],
          amenities: dbRecord.amenities || [],
          rating: dbRecord.rating ?? 0,
          reviews: dbRecord.reviews || [],
          romanticHighlights: dbRecord.romanticHighlights || [],
          rooms: dbRecord.rooms || [],
          awards: dbRecord.awards || [],
        } as any);
      }
    }

    return merged;
  } catch (err) {
    console.warn("Error merging properties, using constants:", err);
    return CONSTANT_PROPERTIES;
  }
}

/** Fetch published blog posts from the database */
export async function getMergedBlogPosts() {
  try {
    const supabase = createAdminClient();
    const { data: dbPosts, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error || !dbPosts) {
      console.warn("Failed to fetch blog posts from DB:", error?.message);
      return [];
    }

    return dbPosts.map((post: Record<string, any>) => ({
      id: post.slug,
      slug: post.slug,
      title: luxury(post.title || "Untitled"),
      excerpt: luxury(post.excerpt || ""),
      content: post.content || "",
      category: post.category || "Travel",
      image: post.image || "/images/hero-poster.jpg",
      author: post.author || "Kivara Team",
      readTime: post.read_time || "5 min read",
      date: post.published_at
        ? new Date(post.published_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "",
    }));
  } catch (err) {
    console.warn("Error fetching blog posts:", err);
    return [];
  }
}

/** Merge constant packages with Supabase overrides */
export async function getMergedPackages() {
  try {
    const supabase = createAdminClient();
    const { data: dbPackages, error } = await supabase
      .from("packages")
      .select("*")
      .eq("is_active", true)
      .order("title");

    if (error || !dbPackages) {
      console.warn("Failed to fetch packages from DB, using constants:", error?.message);
      return CONSTANT_PACKAGES;
    }

    const dbMap = new Map<string, Record<string, any>>();
    for (const item of dbPackages) {
      const camel = mapKeysToCamel<Record<string, any>>(item);
      dbMap.set(camel.slug || camel.id, camel);
    }

    const merged = CONSTANT_PACKAGES.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      return {
        ...constant,
        title: dbRecord.title || constant.title,
        subtitle: luxury(dbRecord.subtitle || constant.subtitle),
        description: luxury(dbRecord.description || constant.description),
        duration: dbRecord.duration || constant.duration,
        price: dbRecord.price || constant.price,
        destinations: dbRecord.destinations || constant.destinations,
        image: dbRecord.image || constant.image,
      };
    });

    // Add any DB-only packages
    for (const [slug, dbRecord] of dbMap) {
      const exists = CONSTANT_PACKAGES.find((c) => c.id === slug);
      if (!exists) {
        merged.push({
          id: slug,
          title: luxury(dbRecord.title || "Untitled Package"),
          subtitle: luxury(dbRecord.subtitle || ""),
          description: luxury(dbRecord.description || ""),
          duration: dbRecord.duration || "",
          price: dbRecord.price || "",
          destinations: dbRecord.destinations || [],
          properties: [],
          inclusions: [],
          itinerary: [],
          image: "",
        });
      }
    }

    return merged;
  } catch (err) {
    console.warn("Error merging packages, using constants:", err);
    return CONSTANT_PACKAGES;
  }
}

/** Merge constant experiences with Supabase overrides */
export async function getMergedExperiences() {
  try {
    const supabase = createAdminClient();
    const { data: dbItems, error } = await supabase
      .from("experiences")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (error || !dbItems) {
      console.warn("Failed to fetch experiences from DB, using constants:", error?.message);
      return CONSTANT_EXPERIENCES;
    }

    const dbMap = new Map<string, Record<string, any>>();
    for (const item of dbItems) {
      const camel = mapKeysToCamel<Record<string, any>>(item);
      dbMap.set(camel.slug || camel.id, camel);
    }

    const merged = CONSTANT_EXPERIENCES.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      return {
        ...constant,
        title: dbRecord.title || constant.title,
        description: luxury(dbRecord.description || constant.description),
        image: dbRecord.image || constant.image,
        category: dbRecord.category || constant.category,
      };
    });

    // Add any DB-only experiences
    for (const [slug, dbRecord] of dbMap) {
      const exists = CONSTANT_EXPERIENCES.find((c) => c.id === slug);
      if (!exists) {
        merged.push({
          id: slug,
          title: luxury(dbRecord.title || "Untitled"),
          description: luxury(dbRecord.description || ""),
          image: dbRecord.image || "",
          category: dbRecord.category || "Romance",
        });
      }
    }

    return merged;
  } catch (err) {
    console.warn("Error merging experiences, using constants:", err);
    return CONSTANT_EXPERIENCES;
  }
}

/** Fields on a Destination that can be overridden by the DB */
const DESTINATION_MERGE_FIELDS = [
  "name", "subtitle", "tagline", "description", "positioning",
  "heroImage", "gallery", "experiences", "highlights", "seasons",
  "isFeatured",
] as const;

/** Merge constant destinations with Supabase overrides : DB wins on all fields */
export async function getMergedDestinations() {
  try {
    const supabase = createAdminClient();
    const { data: dbItems, error } = await supabase
      .from("destinations")
      .select("*")
      .order("sort_order");

    if (error || !dbItems) {
      console.warn("Failed to fetch destinations from DB, using constants:", error?.message);
      return CONSTANT_DESTINATIONS;
    }

    const dbMap = new Map<string, Record<string, any>>();
    for (const item of dbItems) {
      const camel = mapKeysToCamel<Record<string, any>>(item);
      dbMap.set(camel.slug || camel.id, camel);
    }

    // Merge constants with selective DB overrides (skip null/undefined DB fields)
    const merged = CONSTANT_DESTINATIONS.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      const result: Record<string, any> = { ...constant };
      for (const field of DESTINATION_MERGE_FIELDS) {
        if (dbRecord[field] !== null && dbRecord[field] !== undefined) {
          result[field] = dbRecord[field];
        }
      }
      // Preserve constant id/slug/relation fields
      result.id = constant.id;
      result.slug = constant.slug;
      result.properties = constant.properties;
      // DB may store name instead of title
      if (dbRecord.name) result.title = dbRecord.name;
      // Apply luxury voice formatting
      if (result.description) result.description = luxury(String(result.description));
      if (result.positioning) result.positioning = luxury(String(result.positioning));
      return result as typeof constant;
    });

    // Add any DB-only destinations
    for (const [slug, dbRecord] of dbMap) {
      const exists = CONSTANT_DESTINATIONS.find((c) => c.id === slug);
      if (!exists) {
        merged.push({
          id: slug,
          slug,
          title: dbRecord.name || slug,
          subtitle: dbRecord.subtitle || "",
          tagline: dbRecord.tagline || "",
          description: luxury(dbRecord.description || ""),
          positioning: luxury(dbRecord.positioning || ""),
          heroImage: dbRecord.heroImage || "",
          gallery: dbRecord.gallery || [],
          experiences: dbRecord.experiences || [],
          highlights: dbRecord.highlights || [],
          seasons: dbRecord.seasons || null,
          isFeatured: dbRecord.isFeatured || false,
          properties: [],
          propertyCount: 0,
        } as any);
      }
    }

    return merged;
  } catch (err) {
    console.warn("Error merging destinations, using constants:", err);
    return CONSTANT_DESTINATIONS;
  }
}
