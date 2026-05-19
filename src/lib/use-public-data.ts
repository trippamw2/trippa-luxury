"use client";

import { useState, useEffect } from "react";
import { PROPERTIES, JOURNAL_POSTS, PACKAGES } from "@/lib/constants";

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

export function useProperties() {
  const [data, setData] = useState(PROPERTIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/data/properties")
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  return attachMeta(data, loading, error);
}

export function useBlogPosts() {
  const [data, setData] = useState(JOURNAL_POSTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/data/blog")
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  return attachMeta(data, loading, error);
}

export function usePackages() {
  const [data, setData] = useState(PACKAGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/data/packages")
      .then((r) => r.json())
      .then((json) => { if (json.data) setData(json.data); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  return attachMeta(data, loading, error);
}
