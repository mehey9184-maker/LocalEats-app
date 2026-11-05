import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const canvases=readFileSync(new URL("../src/components/OptionalMapCanvases.tsx",import.meta.url),"utf8");
const checkout=readFileSync(new URL("../src/screens/CheckoutScreen.tsx",import.meta.url),"utf8");

test("Home/Discover entry module no longer eagerly evaluates the map engine",()=>{
  assert.doesNotMatch(app,/^import .* from ["']react-leaflet["']/m);
  assert.doesNotMatch(app,/^import .* from ["']leaflet["']/m);
  assert.doesNotMatch(app,/^import .* from ["']react-leaflet-cluster["']/m);
  assert.doesNotMatch(app,/^import .* from ["']\.\/components\/MapComponents["']/m);
  assert.doesNotMatch(app,/<MapContainer\b/);
  assert.match(app,/const DiscoverMapCanvas = lazy\(\(\) => import\("\.\/components\/OptionalMapCanvases"\)/);
  assert.match(app,/const AddressPickerMapCanvas = lazy\(\(\) => import\("\.\/components\/OptionalMapCanvases"\)/);
  assert.match(app,/const ExploreMapCanvas = lazy\(\(\) => import\("\.\/components\/OptionalMapCanvases"\)/);
});

test("existing map interaction canvas, markers, clustering and map validation remain intact",()=>{
  assert.match(canvases,/import \{MapContainer,TileLayer,Marker,Popup,Circle,useMap\} from "react-leaflet"/);
  for(const component of ["DiscoverMapCanvas","AddressPickerMapCanvas","ExploreMapCanvas"])
    assert.match(canvases,new RegExp("export function "+component+"\\("));
  assert.match(canvases,/createShopMapIcon\(status\.isOpen\)/);
  assert.match(canvases,/onSelectShop\(shop\.id\)/);
  assert.match(canvases,/function DraggableMarker/);
  assert.match(canvases,/onLocationChange\(newPos\.lat, newPos\.lng\)/);
  assert.match(canvases,/markerPos=\{markerPos\}/);
  assert.match(canvases,/MarkerClusterGroup/);
  assert.match(canvases,/activeProximityRiders/);
  assert.match(canvases,/legendFilter === 'all'/);
  assert.match(canvases,/radius=\{maxDistance \* 1000\}/);
  assert.match(canvases,/MemoizedShopMarker/);
  assert.match(canvases,/MemoizedCustomerMarker/);
  assert.match(canvases,/MemoizedRiderMarker/);
  assert.match(canvases,/InvalidateMapSize trigger=\{isMapFullscreen\}/);
  assert.match(canvases,/L\.Marker\.prototype\.options\.icon = DefaultIcon/);
});

test("unchanged app layout, saved-shop menus, profile address, and checkout stay gated",()=>{
  assert.match(app,/const visibleShops=userLocation && nearbyCatalogKey\(userLocation\)===displayedCatalogKeyRef\.current/);
  assert.match(app,/import \{ ShopCard, MenuItemSkeleton, MenuItemCard \}/);
  assert.match(app,/<DiscoverMapCanvas userLocation=\{userLocation\}/);
  assert.match(app,/<ExploreMapCanvas mapCenter=\{mapCenter\}/);
  assert.match(app,/<AddressPickerMapCanvas markerPos=\{markerPos\}/);
  assert.match(app,/<AddressSearch/);
  assert.match(app,/const AddressSearch = lazy\(\(\) => import\("\.\/components\/MapComponents"\)/);
  assert.match(app,/currentScreen === "checkout"/);
  assert.match(checkout,/await handlePickupAction\(\); return;/);
  assert.match(checkout,/if \(!pickupOrderingEnabled\(\) \|\| quoteLock\.current\) return;/);
});

test("map views keep their original offline UX and explicit loading fallback",()=>{
  assert.match(app,/Map Unavailable Offline/);
  assert.match(app,/Maps Unavailable/);
  assert.match(app,/Loading nearby map/);
  assert.match(app,/Loading address map/);
  assert.match(app,/Loading explore map/);
  assert.match(app,/View List Instead/);
  assert.match(app,/Switch to List View/);
});


test("registration location maps remain usable but no longer load Leaflet at app startup",()=>{
  const completeProfile=readFileSync(new URL("../src/screens/auth/CompleteProfileScreen.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(completeProfile,/^import \{ AddressSearch, LocationPickerMap \} from "\.\.\/\.\.\/components\/MapComponents"/m);
  assert.match(completeProfile,/const AddressSearch = lazy\(\(\) => import\("\.\.\/\.\.\/components\/MapComponents"\)/);
  assert.match(completeProfile,/const LocationPickerMap = lazy\(\(\) => import\("\.\.\/\.\.\/components\/MapComponents"\)/);
  assert.match(completeProfile,/WidgetErrorBoundary fallbackName="Location Search"/);
  assert.match(completeProfile,/WidgetErrorBoundary fallbackName="Location Picker"/);
  assert.match(completeProfile,/<Suspense/);
  assert.match(completeProfile,/<AddressSearch/);
  assert.match(completeProfile,/<LocationPickerMap/);
  assert.match(completeProfile,/setLatitude\(data\.lat\)/);
  assert.match(completeProfile,/setLongitude\(data\.lng\)/);
});
