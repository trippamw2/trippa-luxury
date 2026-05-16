import { createAdminClient } from "@/lib/supabase/admin";
import {
  PROPERTIES as CONSTANT_PROPERTIES,
  JOURNAL_POSTS as CONSTANT_POSTS,
  PACKAGES as CONSTANT_PACKAGES,
} from "@/lib/constants";

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

/** Merge constant properties with Supabase overrides */
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

    return CONSTANT_PROPERTIES.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      return {
        ...constant,
        name: dbRecord.name || constant.name,
        description: dbRecord.description || constant.description,
        tagline: dbRecord.tagline || constant.tagline,
        location: dbRecord.location || constant.location,
        priceRange: dbRecord.priceRange || constant.priceRange,
        rating: dbRecord.rating ?? constant.rating,
        heroImage: dbRecord.heroImage || constant.heroImage,
      };
    });
  } catch (err) {
    console.warn("Error merging properties, using constants:", err);
    return CONSTANT_PROPERTIES;
  }
}

/** Merge constant blog posts with Supabase overrides */
export async function getMergedBlogPosts() {
  try {
    const supabase = createAdminClient();
    const { data: dbPosts, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error || !dbPosts) {
      console.warn("Failed to fetch blog posts from DB, using constants:", error?.message);
      return CONSTANT_POSTS;
    }

    const dbMap = new Map<string, Record<string, any>>();
    for (const item of dbPosts) {
      const camel = mapKeysToCamel<Record<string, any>>(item);
      dbMap.set(camel.slug || camel.id, camel);
    }

    const merged = CONSTANT_POSTS.map((constant) => {
      const dbRecord = dbMap.get(constant.id);
      if (!dbRecord) return constant;
      return {
        ...constant,
        title: dbRecord.title || constant.title,
        excerpt: dbRecord.excerpt || constant.excerpt,
        category: dbRecord.category || constant.category,
        image: dbRecord.image || constant.image,
        author: dbRecord.author || constant.author,
        readTime: dbRecord.readTime || constant.readTime,
      };
    });

    // Add any DB-only posts
    for (const [slug, dbRecord] of dbMap) {
      const exists = CONSTANT_POSTS.find((c) => c.id === slug);
      if (!exists) {
        const newPost: Record<string, any> = {
          id: slug,
          title: dbRecord.title || "Untitled",
          excerpt: dbRecord.excerpt || "",
          content: dbRecord.content || "",
          category: dbRecord.category || "Travel",
          image: dbRecord.image || "/images/hero-poster.jpg",
          author: dbRecord.author || "Kivara Team",
          readTime: dbRecord.readTime || "5 min read",
          date: dbRecord.publishedAt?.split("T")[0] || "",
          slug,
        };
        merged.push(newPost as any);
      }
    }

    return merged;
  } catch (err) {
    console.warn("Error merging blog posts, using constants:", err);
    return CONSTANT_POSTS;
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
        subtitle: dbRecord.subtitle || constant.subtitle,
        description: dbRecord.description || constant.description,
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
          title: dbRecord.title || "Untitled Package",
          subtitle: dbRecord.subtitle || "",
          description: dbRecord.description || "",
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
