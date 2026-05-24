"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ApiResponse<T> {
  data: T[];
  count: number;
}

interface UseApiDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (item: any) => Promise<T | null>;
  update: (id: string, item: any) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

/**
 * Generic hook for CRUD operations against admin API routes.
 * Maps between the admin page's local format and the API's camelCase DB column format.
 */
export function useApiData<T extends { id: string }>(
  resource: string,
  options?: {
    mapFromApi?: (item: any) => T;
    mapToApi?: (item: Partial<T>) => any;
    initialData?: T[];
  }
): UseApiDataResult<T> {
  const [data, setData] = useState<T[]>(options?.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/admin/${resource}`;

  // Use refs for mapper functions so inline arrows from consumers don't
  // trigger infinite re-fetch loops via useCallback dependency changes.
  const mapFromApiRef = useRef<(item: any) => T>(
    options?.mapFromApi || ((item: any) => item as T)
  );
  mapFromApiRef.current = options?.mapFromApi || ((item: any) => item as T);

  const mapToApiRef = useRef<(item: any) => any>(
    options?.mapToApi || ((item: any) => item)
  );
  mapToApiRef.current = options?.mapToApi || ((item: any) => item);

  const fetchData = useCallback(async () => {
    const mapFrom = mapFromApiRef.current;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(baseUrl);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const json: ApiResponse<any> = await res.json();
      setData((json.data || []).map(mapFrom));
    } catch (err: any) {
      console.error(`Error fetching ${resource}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, resource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const create = useCallback(async (item: any): Promise<T | null> => {
    const mapFrom = mapFromApiRef.current;
    const mapTo = mapToApiRef.current;
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapTo(item)),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Create failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      const mapped = mapFrom(result);
      setData((prev) => [mapped, ...prev]);
      return mapped;
    } catch (err: any) {
      console.error(`Error creating ${resource}:`, err);
      setError(err.message);
      return null;
    }
  }, [baseUrl, resource]);

  const update = useCallback(async (id: string, item: any): Promise<T | null> => {
    const mapFrom = mapFromApiRef.current;
    const mapTo = mapToApiRef.current;
    try {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapTo(item)),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      const mapped = mapFrom(result);
      setData((prev) => prev.map((d) => (d.id === id ? mapped : d)));
      return mapped;
    } catch (err: any) {
      console.error(`Error updating ${resource}:`, err);
      setError(err.message);
      return null;
    }
  }, [baseUrl, resource]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${baseUrl}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Delete failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      setData((prev) => prev.filter((d) => d.id !== id));
      return true;
    } catch (err: any) {
      console.error(`Error deleting ${resource}:`, err);
      setError(err.message);
      return false;
    }
  }, [baseUrl, resource]);

  return { data, loading, error, refresh: fetchData, create, update, remove };
}
