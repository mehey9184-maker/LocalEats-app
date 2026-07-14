"use client";

import { useState, useEffect, useRef } from "react";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface UseDebouncedMapQueryOptions<T> {
  /**
   * The active center coordinates from Mapbox map center pan events
   */
  coordinates: Coordinates;
  /**
   * Database search callback (e.g. querying stores via ST_DWithin)
   */
  queryFn: (coords: Coordinates) => Promise<T[]>;
  /**
   * Debounce duration in milliseconds (default: 800ms)
   */
  debounceMs?: number;
  /**
   * Conditional guard to toggle querying (default: true)
   */
  enabled?: boolean;
}

/**
 * Custom React Hook: useDebouncedMapQuery
 * Protects API budgets and prevents UI freeze by debouncing map center coordinates
 * on continuous center-pan events before executing high-load geospatial query operations.
 */
export function useDebouncedMapQuery<T>({
  coordinates,
  queryFn,
  debounceMs = 800,
  enabled = true,
}: UseDebouncedMapQueryOptions<T>) {
  const [debouncedCoordinates, setDebouncedCoordinates] = useState<Coordinates>(coordinates);
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Preserve callback referential integrity
  const queryFnRef = useRef(queryFn);
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  // Debounce map coordinates by the specified window (e.g., 800ms)
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      setDebouncedCoordinates(coordinates);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [coordinates.latitude, coordinates.longitude, debounceMs, enabled]);

  // Execute the geospatial database search query once coordinates stabilize
  useEffect(() => {
    let isCurrent = true;

    async function fetchMapData() {
      // Prevent fetching on default zero-coordinates
      if (debouncedCoordinates.latitude === 0 && debouncedCoordinates.longitude === 0) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await queryFnRef.current(debouncedCoordinates);
        if (isCurrent) {
          setResults(data);
        }
      } catch (err: any) {
        if (isCurrent) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }

    fetchMapData();

    return () => {
      isCurrent = false;
    };
  }, [debouncedCoordinates.latitude, debouncedCoordinates.longitude]);

  return {
    debouncedCoordinates,
    results,
    loading,
    error,
    setResults,
  };
}
