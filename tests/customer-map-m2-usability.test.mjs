import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const map=app.slice(app.indexOf("function ExploreScreen("));
const legend=readFileSync(new URL("../src/components/MapLegend.tsx",import.meta.url),"utf8");
const components=readFileSync(new URL("../src/components/MapComponents.tsx",import.meta.url),"utf8");

test("Original map/list design retains M1 privacy and location guards",()=>{
 assert.match(map,/layoutMode === "list"/);
 assert.match(map,/MapContainer/);
 assert.match(map,/MemoizedShopMarker/);
 assert.match(map,/mapShopCoordinates\(shop\)!==null/);
 assert.match(map,/showQuickReorder=\{false\}/);
 assert.match(map,/showRiders=\{false\}/);
 assert.doesNotMatch(map,/rider_profiles|activeProximityRiders|MemoizedRiderMarker|hashString\(/);
 assert.match(map,/homeRating\(shop\)/);
 assert.match(map,/Number\.isFinite\(mapShopDistance\(activeShop,userLocation\)\)/);
});

test("Map focuses selected shop coordinates and can return to device location",()=>{
 assert.match(map,/coords=\{activeShop \? mapShopCoordinates\(activeShop\) : null\}/);
 assert.match(map,/setSelectedShopId\(id\)/);
 assert.match(map,/setSelectedShopId\(null\);\s*onRequestLocation\(\)/);
 assert.match(components,/const destination = userLocation \|\| activeCoords/);
 assert.match(components,/map\.flyTo\(\{ lat: destination\.lat, lng: destination\.lng \}/);
 assert.match(map,/onFocusClosedShop=\{\(\) =>/);
 assert.match(map,/setSelectedShopId\(closedMappedShops\[0\]\.id\)/);
 assert.match(map,/setSelectedShopId\(openMappedShops\[0\]\.id\)/);
});

test("Legend displays real open/closed counts and keyboard accessible selections",()=>{
 assert.match(map,/openMappedShops=mappedShops\.filter\(shop=>getShopStatus\(shop\)\.isOpen\)/);
 assert.match(map,/closedMappedShops=mappedShops\.filter\(shop=>!getShopStatus\(shop\)\.isOpen\)/);
 assert.match(map,/shopCount=\{openMappedShops\.length\}/);
 assert.match(map,/closedShopCount=\{closedMappedShops\.length\}/);
 assert.match(legend,/showRiders=false/);
 assert.match(legend,/action: onFocusClosedShop/);
 assert.match(legend,/aria-expanded=\{isOpen\}/);
 assert.match(legend,/aria-pressed=\{isSelected\}/);
 assert.match(legend,/aria-controls="localeats-map-legend-options"/);
 assert.match(legend,/type="button"\s+aria-pressed=\{isSelected\}/);
});

test("Map list supports keyboard, search and consistent filter clearing",()=>{
 assert.match(map,/id="localeats-map-list-search"/);
 assert.match(map,/aria-controls="localeats-map-list-filters"/);
 assert.match(map,/aria-expanded=\{isFilterOpen\}/);
 assert.match(map,/inert=\{!isFilterOpen\}/);
 assert.match(map,/aria-label="Show shops on map"/);
 assert.match(map,/aria-label="Locate me on the map"/);
 assert.match(map,/activeFiltersCount=Number\(/);
 assert.match(map,/clearMapFilters=\(\)=>/);
 assert.match(map,/clearMapFilters\(\);triggerHaptic/);
 assert.match(map,/selectedCategory==="Nearby" \? "Nearest First"/);
});

test("Map modal search is accessible and displays actual shop pin counts",()=>{
 assert.match(map,/role="dialog"/);
 assert.match(map,/aria-modal="true"/);
 assert.match(map,/aria-labelledby="localeats-map-filter-title"/);
 assert.match(map,/event\.target===event\.currentTarget/);
 assert.match(map,/event\.key==="Escape"/);
 assert.match(map,/id="localeats-map-dialog-search"/);
 assert.match(map,/aria-pressed=\{selectedCategory===cat\}/);
 assert.match(map,/aria-pressed=\{maxDistance===dist\}/);
 assert.match(map,/aria-pressed=\{showOnlyOpen\}/);
 assert.match(map,/aria-pressed=\{minRating>0\}/);
 assert.match(map,/Clear all filters/);
 assert.match(map,/View Map Results \(\{mappedShops\.length\}/);
});

test("Selected shop can open its legitimate menu without bypassing checkout",()=>{
 assert.match(map,/aria-label="Close shop details"/);
 assert.match(map,/aria-pressed=\{favorites\.includes\(activeShop\.id\)\}/);
 assert.match(map,/onClick=\{\(\) => onStoreInfo\(activeShop\.id\)\}/);
 assert.match(map,/View Menu/);
 assert.doesNotMatch(map,/createPickup\(|customerPickupApi\.create|addToCart\(/);
 assert.match(app,/readPickupCatalog\(userLocation\)/);
});
