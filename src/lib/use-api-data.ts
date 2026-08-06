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
  create: (item: object) => Promise<T | null>;
  update: (id: string, item: object) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

/**
 * Generic hook for CRUD operations against admin API routes.
 * Maps between the admin page's local format and the API's camelCase DB column format.
 *
 * `T` / `From` / `To` are inferred from the `mapFromApi` / `mapToApi` mappers at
 * each call site. The `From` / `To` defaults only apply to pass-through callers
 * that use the raw API shape without mappers (e.g. `useApiData<ApiDestination>`).
 */
export function useApiData<
  T extends { id: string },
  From = Record<string, unknown>,
  To = Record<string, unknown>,
>(
  resource: string,
  options?: {
    mapFromApi?: (item: From) => T;
    mapToApi?: (item: Partial<T>) => To;
    initialData?: T[];
  }
): UseApiDataResult<T> {
  const [data, setData] = useState<T[]>(options?.initialData || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `/api/admin/${resource}`;

  // Use refs for mapper functions so inline arrows from consumers don't
  // trigger infinite re-fetch loops via useCallback dependency changes.
  // Refs are synced in an effect (never written during render).
  const mapFromApiRef = useRef<(item: From) => T>(
    options?.mapFromApi || ((item: From) => item as unknown as T)
  );
  const mapToApiRef = useRef<(item: Partial<T>) => To>(
    options?.mapToApi || ((item: Partial<T>) => item as unknown as To)
  );

  useEffect(() => {
    mapFromApiRef.current = options?.mapFromApi || ((item: From) => item as unknown as T);
    mapToApiRef.current = options?.mapToApi || ((item: Partial<T>) => item as unknown as To);
  });

  const fetchData = useCallback(async () => {
    const mapFrom = mapFromApiRef.current;
    try {
      const res = await fetch(baseUrl);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const json: ApiResponse<From> = await res.json();
      setData((json.data || []).map(mapFrom));
    } catch (err: unknown) {
      console.error(`Error fetching ${resource}:`, err);
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, resource]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Manual refresh from event handlers may show the loading state again.
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await fetchData();
  }, [fetchData]);

  const create = useCallback(async (item: object): Promise<T | null> => {
    const mapFrom = mapFromApiRef.current;
    const mapTo = mapToApiRef.current;
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapTo(item as Partial<T>)),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Create failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      const mapped = mapFrom(result as From);
      setData((prev) => [mapped, ...prev]);
      return mapped;
    } catch (err: unknown) {
      console.error(`Error creating ${resource}:`, err);
      setError(err instanceof Error ? err.message : "Create failed");
      return null;
    }
  }, [baseUrl, resource]);

  const update = useCallback(async (id: string, item: object): Promise<T | null> => {
    const mapFrom = mapFromApiRef.current;
    const mapTo = mapToApiRef.current;
    try {
      const res = await fetch(`${baseUrl}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapTo(item as Partial<T>)),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      const mapped = mapFrom(result as From);
      setData((prev) => prev.map((d) => (d.id === id ? mapped : d)));
      return mapped;
    } catch (err: unknown) {
      console.error(`Error updating ${resource}:`, err);
      setError(err instanceof Error ? err.message : "Update failed");
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
    } catch (err: unknown) {
      console.error(`Error deleting ${resource}:`, err);
      setError(err instanceof Error ? err.message : "Delete failed");
      return false;
    }
  }, [baseUrl, resource]);

  return { data, loading, error, refresh, create, update, remove };
}
