import { useState, useRef, useEffect, useCallback } from 'react';
import { useMap, MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle, MapPin, AlertTriangle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { calculateDistance, DEFAULT_COORDS } from '../utils';

function RecenterMap({ coords }: { coords: { lat: number, lng: number } }) {
  const map = useMap();
  const lat = coords?.lat;
  const lng = coords?.lng;
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.setView({ lat, lng }, map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

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
        setQuery("Location from Google Maps Link");
        setIsConfirmed(false);
        setShowResults(false);
        
        // Reverse geocode to get a pretty address name
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const geoData = await res.json();
          if (geoData && geoData.display_name) {
            setQuery(geoData.display_name);
          }
        } catch (err) {
          console.error("Reverse geocode failed, using direct coordinates:", err);
        }
        
        toast.success("Google Maps coordinates detected!", {
          description: `Located at ${lat.toFixed(5)}, ${lng.toFixed(5)}. Click confirm button below.`
        });
        return;
      } else if (val.startsWith('http')) {
        // Short URL redirect resolution fallback (client-side attempt)
        try {
          setLoading(true);
          const response = await fetch(val, { method: 'HEAD', redirect: 'follow' });
          if (response.url) {
            const redirectMatch = response.url.match(coordsRegex) || response.url.match(llRegex) || response.url.match(qRegex) || response.url.match(plainCoordsRegex);
            if (redirectMatch) {
              const lat = parseFloat(redirectMatch[1]);
              const lng = parseFloat(redirectMatch[2]);
              setMarkerPos({ lat, lng });
              setQuery("Location from Google Maps Link");
              setIsConfirmed(false);
              setShowResults(false);
              
              const resGeo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
              const geoData = await resGeo.json();
              if (geoData && geoData.display_name) {
                setQuery(geoData.display_name);
              }
              
              toast.success("Shortlink resolved successfully!");
              return;
            }
          }
        } catch (corsErr) {
          console.warn("CORS/network blocked Google Maps short URL resolution, prompting user:", corsErr);
          toast.info("Google Maps shortlink detected!", {
            description: "CORS blocks shortlink expansion. Try pasting the coordinates (e.g., -25.9961, 28.2258) or search manually!"
          });
        } finally {
          setLoading(false);
        }
      }
    }

    if (val.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + ' South Africa')}&limit=5`);
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error('Nominatim error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const address = data.display_name;
          setQuery(address);
          setMarkerPos({ lat: latitude, lng: longitude });
          setIsConfirmed(false);
          setShowResults(false);
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          setMarkerPos({ lat: latitude, lng: longitude });
          setQuery(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setIsConfirmed(false);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Could not get your location. Please ensure location services are enabled.');
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelect = (res: any) => {
    setQuery(res.display_name);
    setMarkerPos({ lat: parseFloat(res.lat), lng: parseFloat(res.lon) });
    setShowResults(false);
    setIsConfirmed(false);
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
          setIsConfirmed(false);
        }
      },
    }), []);

    return markerPos === null ? null : (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers()}
        position={markerPos}
        ref={markerRef}
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

  const shopIcon = L.divIcon({
    html: `<div class="bg-orange-600 p-2 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  function ShopMarker() {
    if (!shopCoords) return null;
    return (
      <Marker position={shopCoords} icon={shopIcon}>
        <Popup>
          <p className="font-black text-xs uppercase tracking-tight text-center">Store Location</p>
        </Popup>
      </Marker>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative z-10" ref={searchRef}>
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

      <div className="h-56 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0 shadow-lg">
        <MapContainer 
          center={markerPos || DEFAULT_COORDS} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap coords={markerPos || DEFAULT_COORDS} />
          <DraggableMarker />
          <ShopMarker />
        </MapContainer>
        {!markerPos && (
          <div className="absolute inset-0 bg-slate-900/5 dark:bg-slate-950/20 backdrop-blur-[2px] flex items-center justify-center p-4 text-center z-[1000]">
            <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-relaxed max-w-[180px]">Select your address to confirm delivery point on map</p>
          </div>
        )}
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
        }
      },
    }), [onCoordsChange]);

    return (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers()}
        position={coords}
        ref={markerRef}
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

  const shopIcon = L.divIcon({
    html: `<div class="bg-orange-600 p-2 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="h-48 w-full rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 relative z-10 shadow-inner">
        <MapContainer center={coords} zoom={16} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker />
          
          {shopCoords && (
            <>
              <Marker position={shopCoords} icon={shopIcon}>
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
        
        <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-lg text-white text-[9px] text-center z-[1000] pointer-events-none font-bold uppercase tracking-wider">
          📍 Drag the red pin to select your exact door location
        </div>
        
        <div className="absolute top-2 right-12 z-[1000] flex gap-2">
          <a 
            href={`https://www.openstreetmap.org/edit#map=16/${coords.lat}/${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/95 dark:bg-slate-800/95 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-colors flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            title="Open in OpenStreetMap (Fallback)"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">OSM Edit</span>
          </a>
        </div>
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
