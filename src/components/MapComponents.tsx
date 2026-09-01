import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useMap, useMapEvents, MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle, MapPin, AlertTriangle, AlertCircle, ExternalLink, Maximize2, Minimize2, Layers, Compass, Crosshair, Phone, Heart, Star } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { calculateDistance, DEFAULT_COORDS } from '../utils';
import { MapLegend } from './MapLegend';


export const userMapIcon = L.divIcon({
  html: `<div class="relative w-12 h-12 flex flex-col items-center justify-center">
    <span class="absolute inset-0 rounded-full bg-blue-500/30 animate-ping"></span>
    <div class="bg-blue-600 p-2.5 rounded-full border-3 border-white shadow-2xl text-white flex items-center justify-center relative z-10 ring-4 ring-blue-400/50">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
    <div class="w-2 h-2 bg-blue-600 rounded-full mt-1 border border-white"></div>
  </div>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});

export const createShopMapIcon = (isOpen: boolean = true) => {
  if (isOpen) {
    return L.divIcon({
      html: `<div class="relative w-12 h-12 flex flex-col items-center justify-center">
        <div class="bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 rounded-xl border-2 border-white shadow-xl text-white flex items-center justify-center relative z-10 ring-4 ring-emerald-500/90">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
          </svg>
          <span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-md flex items-center justify-center text-[10px] whitespace-nowrap font-black text-white">✓</span>
        </div>
        <div class="w-1.5 h-1.5 bg-amber-600 rounded-full mt-1"></div>
      </div>`,
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 48],
      popupAnchor: [0, -48]
    });
  }
  return L.divIcon({
    html: `<div class="relative w-12 h-12 flex flex-col items-center justify-center opacity-75">
      <div class="bg-slate-700 p-2.5 rounded-xl border-2 border-slate-300 shadow-md text-slate-300 flex items-center justify-center relative z-10 ring-2 ring-slate-400/50 grayscale">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
        </svg>
        <span class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-500 border-2 border-white rounded-full shadow flex items-center justify-center text-[10px] whitespace-nowrap font-black text-white">✕</span>
      </div>
      <div class="w-1.5 h-1.5 bg-slate-600 rounded-full mt-1"></div>
    </div>`,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });
};

export const storeMapIcon = createShopMapIcon(true);

export const createRiderMapIcon = (vehicleType?: string) => {
  const vType = (vehicleType || '').toLowerCase();
  let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
  </svg>`;

  if (vType === 'car') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.2 1 12 1 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>
    </svg>`;
  } else if (vType === 'motorbike' || vType === 'motorcycle') {
    iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="5" cy="16" r="3"/><circle cx="19" cy="16" r="3"/><path d="M12 17h4l2-5h-3l-2 3H8l-2-4H3"/><path d="M13 6l2 3h3"/>
    </svg>`;
  }

  return L.divIcon({
    html: `<div class="relative w-12 h-12 drop-shadow-xl flex flex-col items-center justify-center">
      <span class="absolute inset-0 rounded-full bg-indigo-500/25 animate-ping"></span>
      <div class="bg-indigo-600 p-2 rounded-full border-3 border-white shadow-lg text-white flex items-center justify-center relative z-10 ring-4 ring-indigo-400/50">
        ${iconSvg}
      </div>
      <div class="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-1 border border-white"></div>
    </div>`,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48]
  });
};

export const riderMapIcon = createRiderMapIcon();

const mapStyleUrls = {
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
};

const mapStyleAttributions = {
  street: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  dark: '&copy; <a href="https://carto.com/attributions">CARTO</a> contributors'
};

export function RecenterMap({ coords }: { coords: { lat: number, lng: number } }) {
  const map = useMap();
  const lat = coords?.lat;
  const lng = coords?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.setView({ lat, lng }, map.getZoom());
      map.invalidateSize();
    }
  }, [lat, lng, map]);
  return null;
}

export function MapFocusTracker({
  coords,
  userLocation,
  center,
  onRecenter,
}: {
  coords?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  center?: [number, number];
  onRecenter?: () => void;
}) {
  const activeCoords = coords || userLocation || (center ? { lat: center[0], lng: center[1] } : null);
  const map = useMap();
  const [hasPanned, setHasPanned] = useState(false);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Automatically focus the map view on user's current location immediately upon successful geolocation
  useEffect(() => {
    if (activeCoords && activeCoords.lat !== undefined && activeCoords.lng !== undefined) {
      const prev = prevCoordsRef.current;
      const isNew = !prev || Math.abs(prev.lat - activeCoords.lat) > 0.0001 || Math.abs(prev.lng - activeCoords.lng) > 0.0001;
      if (isNew) {
        map.flyTo({ lat: activeCoords.lat, lng: activeCoords.lng }, Math.max(15, map.getZoom()), {
          animate: true,
          duration: 1.0,
        });
        prevCoordsRef.current = activeCoords;
        setHasPanned(false);
      }
    }
  }, [activeCoords?.lat, activeCoords?.lng, map]);

  useMapEvents({
    dragstart: () => {
      setHasPanned(true);
    },
    zoomend: () => {
      if (activeCoords) {
        const currentCenter = map.getCenter();
        const dist = Math.sqrt(
          Math.pow(currentCenter.lat - activeCoords.lat, 2) + Math.pow(currentCenter.lng - activeCoords.lng, 2)
        );
        if (dist > 0.0015) {
          setHasPanned(true);
        }
      }
    },
  });

  const handleReturnToLocation = () => {
    if (activeCoords) {
      map.flyTo({ lat: activeCoords.lat, lng: activeCoords.lng }, 16, {
        animate: true,
        duration: 0.8,
      });
      setHasPanned(false);
      if (onRecenter) onRecenter();
    }
  };

  if (!activeCoords || !hasPanned) return null;

  return (
    <div className="absolute top-14 left-3 z-[1000] animate-in fade-in slide-in-from-top-2 duration-200">
      <button
        type="button"
        onClick={handleReturnToLocation}
        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer border border-white/80 dark:border-slate-800"
      >
        <Crosshair className="w-3.5 h-3.5 text-white animate-spin duration-[4000ms]" />
        <span>Return to My Spot</span>
      </button>
    </div>
  );
}

export const ExploreMapUserTracker = MapFocusTracker;

export function InvalidateMapSize({ trigger }: { trigger?: any }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map, trigger]);
  return null;
}

// Memoized Customer Location Pin (Guaranteed top z-index to prevent being obscured by shops)
export const MemoizedCustomerMarker = React.memo(
  function MemoizedCustomerMarker({ lat, lng }: { lat: number; lng: number }) {
    return (
      <Marker position={[lat, lng]} icon={userMapIcon} zIndexOffset={2000}>
        <Popup>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.2 }}
            className="p-1 min-w-[140px]"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <p className="font-extrabold text-xs text-blue-600 dark:text-blue-400">Your Location</p>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Verified customer delivery spot</p>
          </motion.div>
        </Popup>
      </Marker>
    );
  },
  (prev, next) => prev.lat === next.lat && prev.lng === next.lng
);

// Memoized Rider / Courier Marker
export const MemoizedRiderMarker = React.memo(
  function MemoizedRiderMarker({
    rider,
    distVal,
  }: {
    rider: {
      id: string;
      latitude: number;
      longitude: number;
      full_name?: string;
      vehicle_type?: string;
      phone?: string;
      current_order_id?: string;
    };
    distVal?: number;
  }) {
    const vehicleIcon =
      rider.vehicle_type === "car"
        ? "🚗"
        : rider.vehicle_type === "motorbike" || rider.vehicle_type === "motorcycle"
          ? "🏍️"
          : "🛵";

    const customRiderIcon = useMemo(() => createRiderMapIcon(rider.vehicle_type), [rider.vehicle_type]);

    return (
      <Marker position={[rider.latitude, rider.longitude]} icon={customRiderIcon}>
        <Popup>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.2 }}
            className="p-1 min-w-[170px]"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-extrabold text-xs text-indigo-700 dark:text-indigo-300">
                {rider.full_name || `Courier #${rider.id.slice(0, 4)}`} {vehicleIcon}
              </p>
              {distVal !== undefined && (
                <span className="text-[10px] whitespace-nowrap font-black uppercase px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {distVal.toFixed(1)} km away
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mb-2">
              {rider.current_order_id
                ? `Delivering Order #${rider.current_order_id.slice(0, 5)}`
                : "Active & Available for Dispatch"}
            </p>
            {rider.phone && (
              <button
                type="button"
                onClick={() => window.open(`tel:${rider.phone}`)}
                className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Phone className="w-3 h-3" />
                <span>Call Courier ({rider.phone.slice(-4)})</span>
              </button>
            )}
          </motion.div>
        </Popup>
      </Marker>
    );
  },
  (prev, next) =>
    prev.rider.id === next.rider.id &&
    prev.rider.latitude === next.rider.latitude &&
    prev.rider.longitude === next.rider.longitude &&
    prev.rider.full_name === next.rider.full_name &&
    prev.rider.current_order_id === next.rider.current_order_id &&
    Math.abs(prev.distVal - next.distVal) < 0.05
);

// Memoized Shop / Kitchen Marker
export const MemoizedShopMarker = React.memo(
  function MemoizedShopMarker({
    shop,
    isFollowed,
    isOpen,
    onSelectShop,
  }: {
    shop: {
      id: string;
      name: string;
      rating: number;
      latitude?: number;
      longitude?: number;
    };
    isFollowed: boolean;
    isOpen: boolean;
    onSelectShop: (id: string) => void;
  }) {
    const shopIcon = useMemo(() => createShopMapIcon(isOpen), [isOpen]);

    return (
      <Marker
        position={[
          shop.latitude || -25.9964,
          shop.longitude || 28.2268,
        ]}
        icon={shopIcon}
        eventHandlers={{
          click: () => onSelectShop(shop.id),
        }}
      >
        <Popup>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            transition={{ duration: 0.2 }}
            className="p-1.5 min-w-[160px]"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{shop.name}</p>
              {isFollowed && (
                <Heart className="w-3 h-3 text-red-500 fill-current" />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-black">{shop.rating}</span>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                isOpen
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              }`}>
                {isOpen ? "Open Now" : "Closed"}
              </span>
            </div>
          </motion.div>
        </Popup>
      </Marker>
    );
  },
  (prev, next) =>
    prev.shop.id === next.shop.id &&
    prev.shop.latitude === next.shop.latitude &&
    prev.shop.longitude === next.shop.longitude &&
    prev.shop.name === next.shop.name &&
    prev.shop.rating === next.shop.rating &&
    prev.isFollowed === next.isFollowed &&
    prev.isOpen === next.isOpen
);

export function AddressSearch({ onSelect, initialAddress, initialCoords, shopCoords }: { 
  onSelect: (data: { address: string, lat: number, lng: number }) => void, 
  initialAddress?: string,
  initialCoords?: { lat: number, lng: number },
  shopCoords?: { lat: number, lng: number }
}) {
  const [query, setQuery] = useState(initialAddress || '');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [markerPos, setMarkerPos] = useState<{lat: number, lng: number} | null>(initialCoords || null);
  const [isConfirmed, setIsConfirmed] = useState(true);
  const searchRef = useRef<HTMLDivElement>(null);

  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'dark'>('street');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const [isManuallyDragged, setIsManuallyDragged] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const accuracyDetails = useMemo(() => {
    if (!markerPos) {
      return { pct: 0, src: "Unselected", color: "text-slate-400", desc: "No coordinate selected" };
    }
    
    if (isManuallyDragged) {
      return { pct: 100, src: "Manual Rooftop Pin", color: "text-emerald-500", desc: "Manually customized exact spot" };
    }
    
    // GPS Tracking Active or Location set from GPS
    if (isTracking && gpsAccuracy !== null) {
      const displayPct = gpsAccuracy <= 10 ? 99 : gpsAccuracy <= 20 ? 97 : gpsAccuracy <= 50 ? 92 : gpsAccuracy <= 100 ? 85 : 75;
      return { pct: displayPct, src: `GPS Active (±${Math.round(gpsAccuracy)}m)`, color: "text-emerald-500", desc: `Estimated precision radius: ${Math.round(gpsAccuracy)}m` };
    }
    
    if (gpsAccuracy !== null) {
      const displayPct = gpsAccuracy <= 10 ? 99 : gpsAccuracy <= 20 ? 97 : gpsAccuracy <= 50 ? 92 : gpsAccuracy <= 100 ? 85 : 75;
      return { pct: displayPct, src: `GPS Fixed (±${Math.round(gpsAccuracy)}m)`, color: "text-emerald-500", desc: `Estimated accuracy: ${Math.round(gpsAccuracy)} meters` };
    }
    
    if (isTracking) {
      return { pct: 98, src: "Live GPS Active", color: "text-emerald-500", desc: "Tracking active with high-accuracy query" };
    }
    
    const addr = query.toLowerCase();
    
    // Direct link or manual GPS coordinate insertion
    if (addr.includes("google maps") || addr.startsWith("location from") || addr.includes("gps:") || addr.includes("maps.app")) {
      return { pct: 99, src: "Verified Precise GPS", color: "text-emerald-500", desc: "Coordinates parsed directly" };
    }
    
    const partsCount = query.split(',').length;
    if (partsCount >= 6) {
      return { pct: 95, src: "Street-level Rooftop Info", color: "text-emerald-500", desc: "Detailed address with high-precision street info" };
    } else if (partsCount >= 4) {
      return { pct: 88, src: "Street-level Accuracy", color: "text-amber-550", desc: "Street level geographic match" };
    } else if (partsCount >= 2) {
      return { pct: 75, src: "Neighborhood Match", color: "text-amber-400", desc: "Zone neighborhood alignment" };
    }
    return { pct: 60, src: "Township Approximation", color: "text-rose-500", desc: "Sub-optimal wide lookup" };
  }, [query, markerPos, isTracking, isManuallyDragged, gpsAccuracy]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      toast.info("Real-time GPS tracking disabled");
    } else {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return;
      }
      setIsTracking(true);
      toast.success("Real-time movement tracking active!", {
        description: "Moving will automatically update your marker location on the map."
      });
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newCoords = { lat: latitude, lng: longitude };
          setMarkerPos(newCoords);
          setGpsAccuracy(accuracy);
          onSelect({ address: `Live tracking: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("watchPosition error:", error);
          toast.error("Tracking unavailable: location access denied or timeout");
          setIsTracking(false);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
  };

  // Sync state if initial prop coordinates change from outside
  useEffect(() => {
    if (initialCoords) {
      setMarkerPos(initialCoords);
    }
  }, [initialCoords?.lat, initialCoords?.lng]);

  // Sync state if initial prop address changes from outside (e.g. from user profile load)
  useEffect(() => {
    if (initialAddress !== undefined) {
      setQuery(initialAddress);
    }
  }, [initialAddress]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirm = () => {
    if (markerPos) {
      onSelect({ address: query, lat: markerPos.lat, lng: markerPos.lng });
      setIsConfirmed(true);
      toast.success("Location confirmed!");
    }
  };

  const handleSearch = async (val: string) => {
    setQuery(val);
    
    // Check if it's a URL or contains coordinates
    const googleMapsUrlDetected = val.includes('maps.google.com') || val.includes('goo.gl/maps') || val.includes('maps.app.goo.gl') || val.includes('maps.google.co.za');
    const plainCoordsRegex = /(-?\d{1,2}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/; // Match numeric coordinates with minimum 4 decimal place precision
    const matchPlain = val.match(plainCoordsRegex);

    if (googleMapsUrlDetected || matchPlain) {
      const coordsRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const llRegex = /ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const qRegex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const dirRegex = /dir\/(-?\d+\.\d+),(-?\d+\.\d+)/;
      
      const match = val.match(coordsRegex) || val.match(llRegex) || val.match(qRegex) || val.match(dirRegex) || matchPlain;
      
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        setMarkerPos({ lat, lng });
        const textFromGmaps = "Location from Google Maps Link";
        setQuery(textFromGmaps);
        setIsConfirmed(true);
        setShowResults(false);
        onSelect({ address: textFromGmaps, lat, lng });
        
        // Reverse geocode to get a pretty address name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`).catch(() => null);
          if (res && res.ok) {
            const geoData = await res.json().catch(() => null);
            if (geoData && geoData.display_name) {
              setQuery(geoData.display_name);
              onSelect({ address: geoData.display_name, lat, lng });
            }
          }
        } catch (err: any) {
          console.info("Reverse geocode notice, using direct coordinates:", err?.message || err);
        }
        
        toast.success("Google Maps coordinates detected!", {
          description: `Located at ${lat.toFixed(5)}, ${lng.toFixed(5)}.`
        });
        return;
      }
    }

    if (val.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' South Africa')}&limit=5`).catch(() => null);
      if (response && response.ok) {
        const data = await response.json().catch(() => []);
        setResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      }
    } catch (error: any) {
      console.info('Nominatim search notice:', error?.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser. Please search and select your location manually!');
      return;
    }

    setLoading(true);
    setIsManuallyDragged(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsAccuracy(accuracy);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`).catch(() => null);
          if (response && response.ok) {
            const data = await response.json().catch(() => null);
            const address = data?.display_name || `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setQuery(address);
            setMarkerPos({ lat: latitude, lng: longitude });
            setIsConfirmed(true);
            setShowResults(false);
            onSelect({ address, lat: latitude, lng: longitude });
          } else {
            throw new Error("Location service unavailable");
          }
        } catch (error: any) {
          console.info('Reverse geocoding notice:', error?.message || error);
          setMarkerPos({ lat: latitude, lng: longitude });
          const gpsAddr = `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setQuery(gpsAddr);
          setIsConfirmed(true);
          onSelect({ address: gpsAddr, lat: latitude, lng: longitude });
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.info('Geolocation notice:', error?.message || error);
        toast.error('Could not auto-retrieve your current location. Please type and search your address manually!', {
          duration: 5000,
          description: "Location services may be disabled or blocked by your browser container."
        });
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelect = (res: any) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    setIsManuallyDragged(false);
    setQuery(res.display_name);
    setMarkerPos({ lat, lng });
    setShowResults(false);
    setIsConfirmed(true);
    onSelect({ address: res.display_name, lat, lng });
  };

  const currentDistance = markerPos && shopCoords ? calculateDistance(markerPos.lat, markerPos.lng, shopCoords.lat, shopCoords.lng) : null;

  function DraggableMarker() {
    const markerRef = useRef<any>(null);
    const eventHandlers = useCallback(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          setMarkerPos({ lat: newPos.lat, lng: newPos.lng });
          setIsConfirmed(true);
          setIsManuallyDragged(true);
          
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newPos.lat}&lon=${newPos.lng}`)
            .then(res => res ? res.json() : null)
            .then(data => {
              const address = data?.display_name || `GPS: ${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`;
              setQuery(address);
              onSelect({ address, lat: newPos.lat, lng: newPos.lng });
            })
            .catch(() => {
              const gpsAddr = `GPS: ${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`;
              setQuery(gpsAddr);
              onSelect({ address: gpsAddr, lat: newPos.lat, lng: newPos.lng });
            });
        }
      },
    }), [onSelect]);

    return markerPos === null ? null : (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers()}
        position={markerPos}
        ref={markerRef}
        icon={userMapIcon}
      >
        <Popup minWidth={90}>
           <div className="text-center">
            <p className="font-bold text-xs text-slate-850">Delivery Point</p>
            <p className="text-[10px] text-slate-500 font-medium">Drag pin to exact door</p>
          </div>
        </Popup>
      </Marker>
    );
  }

  function ShopMarker() {
    if (!shopCoords) return null;
    return (
      <Marker position={shopCoords} icon={storeMapIcon}>
        <Popup>
          <p className="font-black text-xs uppercase tracking-tight text-center">Store Location</p>
        </Popup>
      </Marker>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative z-30" ref={searchRef}>
        <div className="flex gap-2 relative z-50">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Start typing your address or paste GPS Maps link..."
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 pl-12 text-[15px] focus:outline-none focus:ring-2 focus:ring-orange-500/50 shadow-sm transition-all text-slate-900 dark:text-white"
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              {loading ? <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-orange-600 rounded-full animate-spin"></div> : <MapPin className="w-5 h-5" />}
            </div>
          </div>
          <button
            onClick={handleCurrentLocation}
            className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all active:scale-95 flex items-center justify-center group"
            title="Use current location"
          >
            <div className="w-5 h-5 border-2 border-current rounded-full flex items-center justify-center group-hover:text-orange-600 transition-colors">
              <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
            </div>
          </button>
        </div>

        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl mt-2 overflow-hidden shadow-2xl z-50">
            {results.map((res: any, index: number) => (
              <button
                key={index}
                onClick={() => handleSelect(res)}
                className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors flex items-start gap-3 cursor-pointer"
              >
                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg shrink-0">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight mb-1">{res.display_name.split(',')[0]}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2 uppercase tracking-widest">{res.display_name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={`${
        isFullscreen 
          ? "fixed inset-0 z-[99999] bg-white dark:bg-slate-950 p-4 md:p-6 flex flex-col animate-in fade-in duration-200"
          : "relative h-56 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 z-0 shadow-lg"
      }`}>
        {isFullscreen && (
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                Interactive Map Explorer
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Double-click or drag marker, swipe map, or toggle layers to browse local clusters
              </p>
            </div>
            <button 
              onClick={() => setIsFullscreen(false)}
              className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5 text-orange-500" />
              Minimize
            </button>
          </div>
        )}

        <div className="relative w-full h-full flex-1">
          <MapContainer 
            center={markerPos || DEFAULT_COORDS} 
            zoom={15} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer 
              url={mapStyleUrls[mapStyle]} 
              attribution={mapStyleAttributions[mapStyle]}
              key={mapStyle}
            />
            <RecenterMap coords={markerPos || DEFAULT_COORDS} />
            <InvalidateMapSize trigger={isFullscreen} />
            <DraggableMarker />
            <ShopMarker />

            {/* Visual Delivery Range circles */}
            {shopCoords && (
              <>
                <Circle 
                  center={shopCoords}
                  radius={3000}
                  pathOptions={{
                    color: '#fb923c',
                    dashArray: '5, 5',
                    fillColor: '#fb923c',
                    fillOpacity: 0.05,
                    weight: 1.5
                  }}
                />
                <Circle 
                  center={shopCoords}
                  radius={6000}
                  pathOptions={{
                    color: '#ef4444',
                    dashArray: '8, 8',
                    fillColor: '#ef4444',
                    fillOpacity: 0.03,
                    weight: 2
                  }}
                />
              </>
            )}
          </MapContainer>

          {/* Map Precision Meter Widget */}
          {markerPos && (
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-2 max-w-[195px] backdrop-blur-md animate-in fade-in zoom-in duration-200">
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-9 h-9" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={accuracyDetails.color}
                    strokeDasharray={`${Math.min(100, accuracyDetails.pct)}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[9px] font-black leading-none text-slate-800 dark:text-slate-100">
                  {Math.min(100, accuracyDetails.pct)}%
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] whitespace-nowrap font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">Map Accuracy</p>
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight uppercase tracking-tight">{accuracyDetails.src}</p>
              </div>
            </div>
          )}

          {/* Real-time Floating Overlay Controls inside the Map container wrapper */}
          <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
            {!isFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Toggle Fullscreen representation"
              >
                <Maximize2 className="w-4 h-4 text-orange-500" />
              </button>
            )}

            <button
              onClick={toggleTracking}
              className={`p-2 rounded-xl border shadow-md transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
                isTracking 
                  ? "bg-orange-600 text-white border-orange-600 animate-pulse" 
                  : "bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              title={isTracking ? "Disable live movement tracking" : "Enable live movement tracking (watchPosition)"}
            >
              <Compass className={`w-4 h-4 ${isTracking ? 'animate-spin' : 'text-orange-500'}`} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                className="bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Select map style layers"
              >
                <Layers className="w-4 h-4 text-orange-500" />
              </button>
              
              {showStyleDropdown && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-150 z-50">
                  <div className="p-1 flex flex-col gap-0.5">
                    {(['street', 'satellite', 'dark'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setMapStyle(style);
                          setShowStyleDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          mapStyle === style
                            ? "bg-orange-600 text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850"
                        }`}
                      >
                        {style === 'street' ? '🗺️ Street' : style === 'satellite' ? '🛰️ Satellite' : '🌒 Dark'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!markerPos && (
            <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center p-4 text-center z-[1000]">
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-relaxed max-w-[180px]">Select your address to confirm delivery point on map</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center animate-pulse mt-[-4px]">
        📍 Drag the pin to your door for perfect deliveries
      </p>

      {markerPos && !isConfirmed && (
        <button
          onClick={handleConfirm}
          className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-[0.1em] shadow-xl shadow-orange-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 animate-in slide-in-from-bottom-4 mt-2"
        >
          <CheckCircle className="w-5 h-5 text-white" />
          Confirm Selected Location
        </button>
      )}
    </div>
  );
}

export function LocationPickerMap({ coords, onCoordsChange, shopCoords }: { coords: { lat: number, lng: number }, onCoordsChange: (c: { lat: number, lng: number }) => void, shopCoords?: { lat: number, lng: number } }) {
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite' | 'dark'>('street');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const [isManuallyDragged, setIsManuallyDragged] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isConfirmedByPin, setIsConfirmedByPin] = useState(true);

  useEffect(() => {
    if (!coords) return;
    setIsAddressLoading(true);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`;
    
    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data && data.display_name) {
          setResolvedAddress(data.display_name);
        } else {
          setResolvedAddress(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.info("Reverse geocoding notice, using coordinates fallback:", err?.message || err);
          setResolvedAddress(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
      })
      .finally(() => {
        setIsAddressLoading(false);
      });
      
    return () => controller.abort();
  }, [coords.lat, coords.lng]);

  const accuracyDetails = useMemo(() => {
    if (isManuallyDragged) {
      return { pct: 100, src: "Manual Calibrated Pin", color: "text-emerald-500", desc: "Manually calibrated of doorway" };
    }
    
    if (isTracking && gpsAccuracy !== null) {
      const displayPct = gpsAccuracy <= 10 ? 99 : gpsAccuracy <= 20 ? 97 : gpsAccuracy <= 50 ? 92 : gpsAccuracy <= 100 ? 85 : 75;
      return { pct: displayPct, src: `Live GPS (±${Math.round(gpsAccuracy)}m)`, color: "text-emerald-500", desc: `Estimated accuracy is ±${Math.round(gpsAccuracy)}m` };
    }
    
    if (gpsAccuracy !== null) {
      const displayPct = gpsAccuracy <= 10 ? 99 : gpsAccuracy <= 20 ? 97 : gpsAccuracy <= 50 ? 92 : gpsAccuracy <= 100 ? 85 : 75;
      return { pct: displayPct, src: `GPS Fixed (±${Math.round(gpsAccuracy)}m)`, color: "text-emerald-500", desc: `Estimated precision is ±${Math.round(gpsAccuracy)}m` };
    }
    
    if (isTracking) {
      return { pct: 98, src: "Live GPS Active", color: "text-emerald-500", desc: "Live signal tracking" };
    }
    
    return { pct: 92, src: "Geocoordinate Precision", color: "text-emerald-500", desc: "Standard position geometry" };
  }, [isTracking, isManuallyDragged, gpsAccuracy]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      toast.info("Real-time GPS tracking disabled");
    } else {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return;
      }
      setIsTracking(true);
      toast.success("Real-time movement tracking active!", {
        description: "Moving will automatically update your marker location on the map."
      });
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          onCoordsChange({ lat: latitude, lng: longitude });
          setGpsAccuracy(accuracy);
          setIsManuallyDragged(false);
          setIsConfirmedByPin(false); // Make user re-verify spot
        },
        (error) => {
          console.error("watchPosition error:", error);
          toast.error("Tracking unavailable: location access denied or timeout");
          setIsTracking(false);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }
  };

  const currentDistance = shopCoords 
    ? calculateDistance(coords.lat, coords.lng, shopCoords.lat, shopCoords.lng) 
    : null;

  function DraggableMarker() {
    const markerRef = useRef<any>(null);
    const eventHandlers = useCallback(() => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newPos = marker.getLatLng();
          onCoordsChange({ lat: newPos.lat, lng: newPos.lng });
          setIsManuallyDragged(true);
          setIsConfirmedByPin(false); // Must re-verify new spot
        }
      },
    }), [onCoordsChange]);

    return (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers()}
        position={coords}
        ref={markerRef}
        icon={userMapIcon}
      >
        <Popup minWidth={90}>
          <div className="text-center">
            <p className="font-bold text-xs text-slate-850">Delivery Point</p>
            <p className="text-[10px] text-slate-500 font-medium">Drag pin to your exact door or building</p>
          </div>
        </Popup>
      </Marker>
    );
  }

  function ChangeView({ center, shopCenter }: { center: any, shopCenter?: any }) {
    const map = useMap();
    
    useEffect(() => {
      if (shopCenter) {
        const bounds = L.latLngBounds([center, shopCenter]);
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
      } else {
        map.setView(center, 15);
        map.panTo(center);
      }
    }, [center, shopCenter, map]);
    
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className={`${
        isFullscreen 
          ? "fixed inset-0 z-[99999] bg-white dark:bg-slate-950 p-4 md:p-6 flex flex-col animate-in fade-in duration-200"
          : "relative h-48 w-full rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 z-10 shadow-inner"
      }`}>
        {isFullscreen && (
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                Interactive Location Pinpointer
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                Browse detailed shops clusters and calibrate precise door delivery points
              </p>
            </div>
            <button 
              onClick={() => setIsFullscreen(false)}
              className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5 text-orange-500" />
              Minimize
            </button>
          </div>
        )}

        <div className="relative w-full h-full flex-1">
          <MapContainer center={coords} zoom={16} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer
              attribution={mapStyleAttributions[mapStyle]}
              url={mapStyleUrls[mapStyle]}
              key={mapStyle}
            />
            <InvalidateMapSize trigger={isFullscreen} />
            <DraggableMarker />
            
            {gpsAccuracy && coords && (
              <Circle
                center={coords}
                radius={gpsAccuracy}
                pathOptions={{
                  color: '#fb923c',
                  fillColor: '#fb923c',
                  fillOpacity: 0.1,
                  stroke: true,
                  weight: 1,
                  dashArray: '3, 5'
                }}
              />
            )}
            
            {shopCoords && (
              <>
                <Marker position={shopCoords} icon={storeMapIcon}>
                  <Popup>
                    <p className="font-black text-xs uppercase tracking-tight text-center">Collection / Store Basis</p>
                  </Popup>
                </Marker>
                
                {/* Radius Circle 1: 3km Standard Delivery Zone A */}
                <Circle 
                  center={shopCoords}
                  radius={3000}
                  pathOptions={{
                    color: '#fb923c',
                    dashArray: '5, 5',
                    fillColor: '#fb923c',
                    fillOpacity: 0.05,
                    weight: 1.5
                  }}
                />
                
                {/* Radius Circle 2: 6km Max Delivery Zone B */}
                <Circle 
                  center={shopCoords}
                  radius={6000}
                  pathOptions={{
                    color: '#ef4444',
                    dashArray: '8, 8',
                    fillColor: '#ef4444',
                    fillOpacity: 0.03,
                    weight: 2
                  }}
                />
              </>
            )}
            
            <ChangeView center={coords} shopCenter={shopCoords} />
          </MapContainer>
          
          {/* Map Precision Meter Widget */}
          <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center gap-2 backdrop-blur-md animate-in fade-in zoom-in duration-200">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-7 h-7" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={accuracyDetails.color}
                  strokeDasharray={`${accuracyDetails.pct}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[10px] whitespace-nowrap font-black leading-none text-slate-800 dark:text-slate-100">
                {accuracyDetails.pct}%
              </span>
            </div>
            <div className="min-w-0 pr-1">
              <p className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-0.5">accuracy</p>
              <p className="text-[9px] font-extrabold text-slate-800 dark:text-slate-200 truncate leading-tight uppercase tracking-tight">{accuracyDetails.src}</p>
              {accuracyDetails.desc && (
                <p className="text-[7px] text-slate-500 dark:text-slate-400 font-bold truncate leading-none mt-0.5">{accuracyDetails.desc}</p>
              )}
            </div>
          </div>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 max-w-[85%] bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full text-white text-[9px] text-center z-[1000] pointer-events-none font-bold uppercase tracking-wider shadow-md whitespace-nowrap">
            📍 Drag the blue pin to select your exact door location
          </div>

          {/* Real-time Floating Overlay Controls inside the Map container wrapper */}
          <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-2">
            {!isFullscreen && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4 text-orange-500" />
              </button>
            )}

            <button
              onClick={toggleTracking}
              className={`p-2 rounded-xl border shadow-md transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
                isTracking 
                  ? "bg-orange-600 text-white border-orange-600 animate-pulse" 
                  : "bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              title={isTracking ? "Disable live movement tracking" : "Enable live movement tracking (watchPosition)"}
            >
              <Compass className={`w-4 h-4 ${isTracking ? 'animate-spin' : 'text-orange-500'}`} />
            </button>

            <a 
              href={`https://www.openstreetmap.org/edit#map=16/${coords.lat}/${coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
              title="Open in OpenStreetMap (Fallback)"
            >
              <ExternalLink className="w-4 h-4 text-orange-500" />
            </a>

            <div className="relative">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                className="bg-white/95 dark:bg-slate-900/95 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Select map style layers"
              >
                <Layers className="w-4 h-4 text-orange-500" />
              </button>
              
              {showStyleDropdown && (
                <div className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-150 z-50">
                  <div className="p-1 flex flex-col gap-0.5">
                    {(['street', 'satellite', 'dark'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setMapStyle(style);
                          setShowStyleDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          mapStyle === style
                            ? "bg-orange-600 text-white"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850"
                        }`}
                      >
                        {style === 'street' ? '🗺️ Street' : style === 'satellite' ? '🛰️ Satellite' : '🌒 Dark'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Selected Address & Manual Lock Steps Verification */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl text-orange-600 dark:text-orange-400 shrink-0 mt-0.5">
            <MapPin className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">
              Pinpointer Address Lookup
            </p>
            {isAddressLoading ? (
              <div className="h-4 bg-slate-200/50 dark:bg-slate-800 animate-pulse rounded w-3/4 mt-1"></div>
            ) : (
              <p className="text-xs font-bold text-slate-850 dark:text-slate-100 mt-1 leading-relaxed">
                {resolvedAddress || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`}
              </p>
            )}
          </div>
        </div>

        {!isConfirmedByPin ? (
          <button
            type="button"
            onClick={() => {
              setIsConfirmedByPin(true);
              toast.success("Delivery Spot Confirmed!", {
                description: "Map pinpoint has been manually verified and locked."
              });
            }}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-550 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md shadow-orange-600/10 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-white" />
            Lock & Confirm Spot Accuracy
          </button>
        ) : (
          <div className="bg-emerald-500/5 border border-emerald-500/20 px-3 py-2.5 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-400">
            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Coordinates Secured
            </span>
            <button
              type="button"
              onClick={() => setIsConfirmedByPin(false)}
              className="text-[10px] font-black underline uppercase tracking-tight text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
            >
              Adjust Pin Spot
            </button>
          </div>
        )}
      </div>

      {/* Visual Delivery Range Feedback and Warnings */}
      {currentDistance !== null && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-300">
          {currentDistance > 6 ? (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-4 py-3 rounded-2xl flex items-start gap-2.5 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 animate-bounce" />
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-wider">OUTSIDE DELIVERY RANGE</p>
                <p className="text-[10px] leading-relaxed font-semibold mt-0.5">
                  Your delivery pin is <span className="underline font-black">{currentDistance.toFixed(2)}km</span> from the store. High-speed bike delivery is strictly capped at 6.0km to safeguard quality. Please select another address or pick up.
                </p>
              </div>
            </div>
          ) : currentDistance > 3 ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 px-4 py-3 rounded-2xl flex items-start gap-2.5 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-wider">ZONE B DISTANCE SURCHARGE APPLIES</p>
                <p className="text-[10px] leading-relaxed font-semibold mt-0.5">
                  Your delivery pin is <span className="font-bold">{currentDistance.toFixed(2)}km</span> from the store. A small surcharge of +R5 is added (R10 total delivery fee) to support high-range delivery.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 px-4 py-3 rounded-2xl flex items-start gap-2.5 text-green-700 dark:text-green-400">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-wider">STANDARD ZONE A LOCATION SECURED</p>
                <p className="text-[10px] leading-relaxed font-semibold mt-0.5">
                  Your delivery pin is <span className="font-bold">{currentDistance.toFixed(2)}km</span> from the store inside our standard service radius. Flat-rate delivery fee of only R5.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
