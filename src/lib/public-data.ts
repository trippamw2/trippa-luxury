import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROPERTIES as CONSTANT_PROPERTIES,
  PACKAGES as CONSTANT_PACKAGES,
  EXPERIENCES as CONSTANT_EXPERIENCES,
  DESTINATIONS as CONSTANT_DESTINATIONS,
} from "@/lib/constants";
import { luxury } from "@/lib/voice/transform";

function mapKeysToCamel<T = Record<string, unknown>>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map((item) => mapKeysToCamel(item)) as unknown as T;
  if (obj === null || typeof obj !== "object") return obj as unknown as T;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = mapKeysToCamel((obj as Record<string, unknown>)[key]);
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

    const dbMap = new Map<string, Record<string, unknown>>();
    for (const item of dbProperties) {
      const camel = mapKeysToCamel<Record<string, unknown>>(item);
      dbMap.set(String(camel.slug || camel.id), camel);
    }

    // Merge constants with selective DB overrides (skip null/undefined DB fields)
    const merged = CONSTANT_PROPERTIES.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      const result: Record<string, unknown> = { ...constant };
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
          tagline: luxury(String(dbRecord.tagline || "")),
          description: luxury(String(dbRecord.description || "")),
          longDescription: luxury(String(dbRecord.longDescription || "")),
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
        } as unknown as (typeof CONSTANT_PROPERTIES)[number]);
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

    return dbPosts.map((post: Record<string, unknown>) => ({
      id: String(post.slug || ""),
      slug: String(post.slug || ""),
      title: luxury(String(post.title || "Untitled")),
      excerpt: luxury(String(post.excerpt || "")),
      content: String(post.content || ""),
      category: String(post.category || "Travel"),
      image: String(post.image || "/images/hero-poster.jpg"),
      author: String(post.author || "Kivara Team"),
      readTime: String(post.read_time || "5 min read"),
      date: post.published_at
        ? new Date(String(post.published_at)).toLocaleDateString("en-US", {
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

    const dbMap = new Map<string, Record<string, unknown>>();
    for (const item of dbPackages) {
      const camel = mapKeysToCamel<Record<string, unknown>>(item);
      dbMap.set(String(camel.slug || camel.id), camel);
    }

    const merged = CONSTANT_PACKAGES.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      return {
        ...constant,
        title: String(dbRecord.title || constant.title),
        subtitle: luxury(String(dbRecord.subtitle || constant.subtitle)),
        description: luxury(String(dbRecord.description || constant.description)),
        duration: String(dbRecord.duration || constant.duration),
        price: String(dbRecord.price || constant.price),
        destinations: (dbRecord.destinations as string[]) || constant.destinations,
        properties: (dbRecord.properties as string[]) || constant.properties,
        inclusions: (dbRecord.inclusions as string[]) || constant.inclusions,
        excludes: (dbRecord.excludes as string[]) || constant.excludes,
        itinerary: (dbRecord.itinerary as (typeof constant)["itinerary"]) || constant.itinerary,
        collection: String(dbRecord.collection || constant.collection),
        image: String(dbRecord.image || constant.image),
      };
    });

    // Add any DB-only packages
    for (const [slug, dbRecord] of dbMap) {
      const exists = CONSTANT_PACKAGES.find((c) => c.id === slug);
      if (!exists) {
        merged.push({
          id: slug,
          title: luxury(String(dbRecord.title || "Untitled Package")),
          subtitle: luxury(String(dbRecord.subtitle || "")),
          description: luxury(String(dbRecord.description || "")),
          duration: String(dbRecord.duration || ""),
          price: String(dbRecord.price || ""),
          destinations: (dbRecord.destinations as string[]) || [],
          properties: (dbRecord.properties as string[]) || [],
          inclusions: (dbRecord.inclusions as string[]) || [],
          excludes: (dbRecord.excludes as string[]) || [],
          itinerary: (dbRecord.itinerary as { day: number; title: string; description: string }[]) || [],
          collection: String(dbRecord.collection || "bespoke"),
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

    const dbMap = new Map<string, Record<string, unknown>>();
    for (const item of dbItems) {
      const camel = mapKeysToCamel<Record<string, unknown>>(item);
      dbMap.set(String(camel.slug || camel.id), camel);
    }

    const merged = CONSTANT_EXPERIENCES.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      return {
        ...constant,
        title: String(dbRecord.title || constant.title),
        description: luxury(String(dbRecord.description || constant.description)),
        image: String(dbRecord.image || constant.image),
        category: String(dbRecord.category || constant.category),
      };
    });

    // Add any DB-only experiences
    for (const [slug, dbRecord] of dbMap) {
      const exists = CONSTANT_EXPERIENCES.find((c) => c.id === slug);
      if (!exists) {
        merged.push({
          id: slug,
          title: luxury(String(dbRecord.title || "Untitled")),
          description: luxury(String(dbRecord.description || "")),
          image: String(dbRecord.image || ""),
          category: String(dbRecord.category || "Romance"),
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

    const dbMap = new Map<string, Record<string, unknown>>();
    for (const item of dbItems) {
      const camel = mapKeysToCamel<Record<string, unknown>>(item);
      dbMap.set(String(camel.slug || camel.id), camel);
    }

    // Merge constants with selective DB overrides (skip null/undefined DB fields)
    const merged = CONSTANT_DESTINATIONS.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      const result: Record<string, unknown> = { ...constant };
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
          description: luxury(String(dbRecord.description || "")),
          positioning: luxury(String(dbRecord.positioning || "")),
          heroImage: dbRecord.heroImage || "",
          gallery: dbRecord.gallery || [],
          experiences: dbRecord.experiences || [],
          highlights: dbRecord.highlights || [],
          seasons: dbRecord.seasons || null,
          isFeatured: dbRecord.isFeatured || false,
          properties: [],
          propertyCount: 0,
        } as unknown as (typeof CONSTANT_DESTINATIONS)[number]);
      }
    }

    return merged;
  } catch (err) {
    console.warn("Error merging destinations, using constants:", err);
    return CONSTANT_DESTINATIONS;
  }
}
