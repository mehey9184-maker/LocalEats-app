import { useState, useEffect, useCallback } from "react";

export interface Coordinates {
  lat: number;
  lng: number;
}

export type LocationSource = "ip-fallback" | "gps-precise" | "default-tembisa";

export interface GuestLocationState {
  location: Coordinates;
  locationSource: LocationSource;
  isLoading: boolean;
  isTracking: boolean;
  error: string | null;
  requestGPSLocation: (onSuccess?: (coords: Coordinates) => void) => Promise<void>;
  setGuestLocation: (coords: Coordinates) => void;
}

const TEMBISA_COORDS: Coordinates = { lat: -26.009012, lng: 28.192455 };

/**
 * Custom React Hook: useGuestLocation
 * Implements POPIA-compliant ephemeral location coordination.
 * Features a dual-stage fallback flow:
 *   Stage 1: Fast IP-based geo-lookup (or instant township fallback) to serve regional default joints.
 *   Stage 2: Precision browser GPS coordinates prompted on user engagement.
 * Strictly guarantees ephemeral client containment (never stores guest location in permanent database tables).
 */
export function useGuestLocation(): GuestLocationState {
  const [location, setLocation] = useState<Coordinates>(() => {
    try {
      const stored = sessionStorage.getItem("localeats_guest_coords");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("SessionStorage not available:", e);
    }
    return TEMBISA_COORDS;
  });

  const [locationSource, setLocationSource] = useState<LocationSource>(() => {
    try {
      const storedSource = sessionStorage.getItem("localeats_guest_coords_source");
      if (storedSource) {
        return storedSource as LocationSource;
      }
    } catch {}
    return "default-tembisa";
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Stage 1 - Fast IP Lookup with instant timeout safety
  useEffect(() => {
    // If we already loaded coordinates from session memory, keep them (ephemeral preservation)
    try {
      if (sessionStorage.getItem("localeats_guest_coords")) {
        return;
      }
    } catch {}

    const runIPLookup = async () => {
      setIsLoading(true);
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout safety

      try {
        // Querying a lightweight public geolocator with safe catch handler
        const response = await fetch("https://ip-api.com/json/?fields=status,lat,lon,countryCode", {
          signal: controller.signal
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (response && response.ok) {
          const data = await response.json().catch(() => null);
          if (data && data.status === "success" && typeof data.lat === "number" && typeof data.lon === "number") {
            const ipCoords: Coordinates = { lat: data.lat, lng: data.lon };
            
            // Validate if location lies reasonably in or close to South Africa (latitude between -20 and -35)
            if (data.countryCode === "ZA" || (data.lat < -20 && data.lat > -36)) {
              setLocation(ipCoords);
              setLocationSource("ip-fallback");
              try {
                sessionStorage.setItem("localeats_guest_coords", JSON.stringify(ipCoords));
                sessionStorage.setItem("localeats_guest_coords_source", "ip-fallback");
              } catch {}
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        console.log("Fast IP location lookup bypassed or timed out. Falling back to default Tembisa anchor.");
      }

      // Quick fallback to South African Township default (Tembisa)
      setLocation(TEMBISA_COORDS);
      setLocationSource("default-tembisa");
      try {
        sessionStorage.setItem("localeats_guest_coords", JSON.stringify(TEMBISA_COORDS));
        sessionStorage.setItem("localeats_guest_coords_source", "default-tembisa");
      } catch {}
      setIsLoading(false);
    };

    runIPLookup();
  }, []);

  // Stage 2: Precision GPS Coordinates on active user engagement
  const requestGPSLocation = useCallback(async (onSuccess?: (coords: Coordinates) => void) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gpsCoords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        setLocation(gpsCoords);
        setLocationSource("gps-precise");
        setIsTracking(false);

        try {
          // Absolute privacy: Stored ONLY in active browser sessionStorage, NEVER in database logs
          sessionStorage.setItem("localeats_guest_coords", JSON.stringify(gpsCoords));
          sessionStorage.setItem("localeats_guest_coords_source", "gps-precise");
        } catch {}

        if (onSuccess) {
          onSuccess(gpsCoords);
        }
      },
      (err) => {
        console.warn("GPS request rejected or timed out:", err);
        setIsTracking(false);
        let errMsg = "Unable to fetch precise location. Continuing with regional default.";
        if (err.code === err.PERMISSION_DENIED) {
          errMsg = "Location permission denied. Please search or set address manually.";
        }
        setError(errMsg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const setGuestLocation = useCallback((coords: Coordinates) => {
    setLocation(coords);
    setLocationSource("gps-precise"); // Manually chosen or pinned exact coordinate
    try {
      sessionStorage.setItem("localeats_guest_coords", JSON.stringify(coords));
      sessionStorage.setItem("localeats_guest_coords_source", "gps-precise");
    } catch {}
  }, []);

  return {
    location,
    locationSource,
    isLoading,
    isTracking,
    error,
    requestGPSLocation,
    setGuestLocation
  };
}
