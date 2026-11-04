/**
 * Optional map canvases. Loaded only when a user opens a map view.
 * The existing Leaflet marker styling, pins and actions are preserved.
 */
import React, {useEffect, useMemo, useRef} from "react";
import L from "leaflet";
import {MapContainer,TileLayer,Marker,Popup,Circle,useMap} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import iconRetina from "leaflet/dist/images/marker-icon-2x.png";
import {
  userMapIcon,createShopMapIcon,MemoizedCustomerMarker,MemoizedShopMarker,
  MemoizedRiderMarker,InvalidateMapSize,ExploreMapUserTracker,RecenterMap,
} from "./MapComponents";
import {hashString,calculateDistance,getShopStatus,DEFAULT_COORDS} from "../utils";
import type {Shop} from "../types";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconRetinaUrl: iconRetina,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;
const userIcon = L.divIcon({
  html: `<div class="relative w-12 h-12 drop-shadow-xl flex flex-col items-center justify-center">
    <div class="bg-blue-600 p-2 rounded-full border-4 border-white shadow-lg text-white flex items-center justify-center relative z-10 animate-bounce">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
    <div class="w-1.5 h-1.5 bg-blue-600 rounded-full mt-1"></div>
  </div>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});

const shopIcon = L.divIcon({
  html: `<div class="relative w-12 h-12 drop-shadow-xl flex flex-col items-center justify-center">
    <div class="bg-orange-600 p-2.5 rounded-xl border-2 border-white shadow-lg text-white flex items-center justify-center relative z-10">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
      </svg>
    </div>
    <div class="w-1.5 h-1.5 bg-orange-600 rounded-full mt-1"></div>
  </div>`,
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});


function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

type Point={lat:number;lng:number};

export function DiscoverMapCanvas({userLocation,sortedShops,onSelectShop,triggerHaptic}:{
  userLocation:Point|null;sortedShops:Shop[];
  onSelectShop:(id:string)=>void;triggerHaptic:(pattern?:number|number[])=>void;
}) {
 return (
<MapContainer
                center={userLocation || DEFAULT_COORDS}
                zoom={14}
                scrollWheelZoom={true}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {userLocation && (
                  <Marker position={userLocation} icon={userMapIcon}>
                    <Popup>
                      <p className="font-extrabold text-xs text-blue-600 text-center m-0">
                        Your Spot
                      </p>
                    </Popup>
                  </Marker>
                )}

                {sortedShops.map((shop) => {
                  const sLat =
                    shop.latitude ||
                    -25.9964 + (hashString(shop.id) % 10) * 0.005;
                  const sLng =
                    shop.longitude ||
                    28.2268 + (hashString(shop.id) % 10) * 0.005;
                  const dist = userLocation
                    ? calculateDistance(
                        sLat,
                        sLng,
                        userLocation.lat,
                        userLocation.lng,
                      )
                    : null;
                  const status = getShopStatus(shop);

                  return (
                    <Marker
                      key={shop.id}
                      position={{ lat: sLat, lng: sLng }}
                      icon={createShopMapIcon(status.isOpen)}
                    >
                      <Popup minWidth={200}>
                        <div className="p-1">
                          <p className="font-black text-xs text-slate-800 m-0 mb-1">
                            {shop.name}
                          </p>
                          <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                            {shop.description}
                          </p>
                          <div className="flex items-center justify-between text-[10px] mb-2.5 border-t pt-1.5 border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-amber-500">
                              ★ {shop.rating}
                            </span>
                            {dist !== null && (
                              <span className="text-slate-500 font-semibold">
                                {dist.toFixed(1)} km
                              </span>
                            )}
                            <span
                              className={`font-extrabold ${status.isOpen ? "text-green-600" : "text-slate-400"}`}
                            >
                              {status.isOpen ? "Open Now" : "Closed"}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              triggerHaptic();
                              onSelectShop(shop.id);
                            }}
                            className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase tracking-widest text-[9px] rounded-lg transition-colors cursor-pointer text-center block"
                          >
                            Open Menu
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}

                <MapRecenter
                  center={[
                    userLocation?.lat || -25.9964,
                    userLocation?.lng || 28.2268,
                  ]}
                />
              </MapContainer>
 );
}

function DraggableMarker({markerPos,setMarkerPos,onLocationChange}:{
  markerPos:Point|null;setMarkerPos:(p:Point)=>void;onLocationChange:(lat:number,lng:number)=>void;
}) {

    const markerRef = useRef<any>(null);
    const eventHandlers = useMemo(
      () => ({
        dragend() {
          const marker = markerRef.current;
          if (marker != null) {
            const newPos = marker.getLatLng();
            setMarkerPos(newPos);
            onLocationChange(newPos.lat, newPos.lng);
          }
        },
      }),
      [],
    );

    return markerPos ? (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={markerPos}
        ref={markerRef}
        icon={userMapIcon}
      >
        <Popup minWidth={90}>
          <div className="text-center p-0.5">
            <p className="font-extrabold text-xs text-blue-600">Delivery Point</p>
            <p className="text-[10px] text-slate-500 font-medium">Drag blue pin to exact door</p>
          </div>
        </Popup>
      </Marker>
    ) : null;
}

export function AddressPickerMapCanvas({markerPos,setMarkerPos,onLocationChange}:{
  markerPos:Point|null;setMarkerPos:(p:Point)=>void;onLocationChange:(lat:number,lng:number)=>void;
}) {
 return (
<MapContainer
          center={markerPos || DEFAULT_COORDS}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap coords={markerPos || DEFAULT_COORDS} />
          <DraggableMarker markerPos={markerPos} setMarkerPos={setMarkerPos} onLocationChange={onLocationChange} />
        </MapContainer>
 );
}

export function ExploreMapCanvas({mapCenter,isMapFullscreen,userLocation,maxDistance,
  activeProximityRiders,legendFilter,filteredShops,favorites,setSelectedShopId,triggerHaptic}:{
  mapCenter:[number,number];isMapFullscreen:boolean;userLocation:Point|null;maxDistance:number|null;
  activeProximityRiders:any[]|null|undefined;legendFilter:string;filteredShops:Shop[];favorites:string[];
  setSelectedShopId:(id:string|null)=>void;triggerHaptic:(pattern?:number|number[])=>void;
}) {
 return (
<MapContainer
            center={mapCenter}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full z-0"
          >
            {/* Auto invalidates map layout on fullscreen state change */}
            <InvalidateMapSize trigger={isMapFullscreen} />

            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Auto-focus on geolocation & Return to My Location button */}
            <ExploreMapUserTracker userLocation={userLocation} center={mapCenter} />

            {/* Distance Radius Filter Circle */}
            {userLocation && maxDistance !== null && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={maxDistance * 1000}
                pathOptions={{
                  color: "#f97316",
                  fillColor: "#f97316",
                  fillOpacity: 0.08,
                  weight: 2,
                  dashArray: "6, 6",
                }}
              />
            )}

            {/* Active Couriers / Riders Pins (Memoized Riders) */}
            {(legendFilter === 'all' || legendFilter === 'rider') && (activeProximityRiders || []).map((rider) => {
              const dist = userLocation ? calculateDistance(rider.latitude, rider.longitude, userLocation.lat, userLocation.lng) : 0;
              return (
                <MemoizedRiderMarker
                  key={rider.id}
                  rider={rider}
                  distVal={dist}
                />
              );
            })}

            {/* Shop Pins Cluster (Memoized Shops) */}
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={40}
              spiderfyOnMaxZoom={true}
            >
              {filteredShops
                .filter((shop) => {
                  const status = getShopStatus(shop);
                  if (legendFilter === 'all') return true;
                  if (legendFilter === 'shop') return status.isOpen;
                  if (legendFilter === 'closed_shop') return !status.isOpen;
                  return false;
                })
                .map((shop) => {
                  const isFollowed = favorites.includes(shop.id);
                  const status = getShopStatus(shop);

                  return (
                    <MemoizedShopMarker
                      key={shop.id}
                      shop={shop}
                      isFollowed={isFollowed}
                      isOpen={status.isOpen}
                      onSelectShop={(id) => {
                        setSelectedShopId(id);
                        triggerHaptic(10);
                      }}
                    />
                  );
                })}
            </MarkerClusterGroup>

            {/* Customer Location Pin (Always rendered on top with top z-index) */}
            {userLocation && (legendFilter === 'all' || legendFilter === 'customer') && (
              <MemoizedCustomerMarker
                lat={userLocation.lat}
                lng={userLocation.lng}
              />
            )}
          </MapContainer>
 );
}
