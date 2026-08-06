import { createBrowserClient } from "@supabase/ssr";

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Lazily creates (and memoizes) the browser Supabase client.
 * Throws a descriptive error only when actually used without env vars,
 * so importing this module never crashes the build.
 */
export function createClient() {
  if (!cachedClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error(
        "Missing env: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
    }

    cachedClient = createBrowserClient(url, key);
  }
  return cachedClient;
}
