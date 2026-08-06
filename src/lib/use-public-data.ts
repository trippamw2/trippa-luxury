"use client";

import { useState, useEffect } from "react";
import { PROPERTIES, PACKAGES, EXPERIENCES, DESTINATIONS } from "@/lib/constants";

interface UsePublicDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

function attachMeta<T>(arr: T[], loading: boolean, error: string | null): T[] & UsePublicDataResult<T> {
  const result = arr as T[] & UsePublicDataResult<T>;
  result.data = arr;
  result.loading = loading;
  result.error = error;
  return result;
}

function usePublicData<T>(
  endpoint: string,
  fallback: T[]
): T[] & UsePublicDataResult<T> {
  const [data, setData] = useState<T[]>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `loading` starts `true`, so the initial effect-triggered fetch needs no
  // synchronous setState. All state updates happen in async callbacks.
  useEffect(() => {
    fetch(endpoint)
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [endpoint]);
  return attachMeta(data, loading, error);
}

export function useProperties() {
  return usePublicData("/api/data/properties", PROPERTIES);
}

export type BlogPost = {
  id: string; title: string; excerpt: string; content: string;
  category: string; image: string; author: string; readTime: string; date: string;
};

export function useBlogPosts() {
  return usePublicData<BlogPost>("/api/data/blog", []);
}

export function usePackages() {
  return usePublicData("/api/data/packages", PACKAGES);
}

export function useExperiences() {
  return usePublicData("/api/data/experiences", EXPERIENCES);
}

export function useDestinations() {
  return usePublicData("/api/data/destinations", DESTINATIONS);
}
