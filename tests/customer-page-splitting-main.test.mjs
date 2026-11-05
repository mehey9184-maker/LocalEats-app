import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const checkout=readFileSync(new URL("../src/screens/CheckoutScreen.tsx",import.meta.url),"utf8");
const pickup=readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");
const tracking=readFileSync(new URL("../src/screens/PickupTrackingScreen.tsx",import.meta.url),"utf8");

test("checkout and order tracking use real named exports through lazy route imports",()=>{
  assert.doesNotMatch(app,/^import\s*\{\s*CheckoutScreen\s*\}\s*from/m);
  assert.doesNotMatch(app,/^import\s*\{\s*PickupTrackingScreen\s*\}\s*from/m);
  assert.match(app,/const CheckoutScreen = lazy\(\(\) =>\s*import\("\.\/screens\/CheckoutScreen"\)\.then\(\(\{ CheckoutScreen \}\) => \(\{ default: CheckoutScreen \}\)\)\s*\)/);
  assert.match(app,/const PickupTrackingScreen = lazy\(\(\) =>\s*import\("\.\/screens\/PickupTrackingScreen"\)\.then\(\(\{ PickupTrackingScreen \}\) => \(\{ default: PickupTrackingScreen \}\)\)\s*\)/);
  assert.match(checkout,/export function CheckoutScreen/);
  assert.match(tracking,/export function PickupTrackingScreen/);
});

test("existing page-level errors and loading UX remain in place",()=>{
  const checkoutEntry=app.indexOf('currentScreen === "checkout"');
  const trackingEntry=app.indexOf('{currentScreen === "order-tracking" && (');
  assert.ok(checkoutEntry>0&&trackingEntry>0);
  const checkoutMarkup=app.slice(checkoutEntry,checkoutEntry+1600);
  const trackingMarkup=app.slice(trackingEntry,trackingEntry+900);
  assert.match(checkoutMarkup,/WidgetErrorBoundary fallbackName="Checkout"/);
  assert.match(checkoutMarkup,/<Suspense fallback=\{<div className=/);
  assert.match(checkoutMarkup,/<CheckoutScreen\s/);
  assert.match(trackingMarkup,/WidgetErrorBoundary fallbackName="Order Tracking"/);
  assert.match(trackingMarkup,/Loading pickup status…/);
  assert.match(trackingMarkup,/<PickupTrackingScreen\s/);
});

test("pickup remains review-only and map discovery plus QR and cropper lazy paths survive",()=>{
  assert.match(checkout,/await handlePickupAction\(\); return;/);
  assert.match(checkout,/if \(!pickupOrderingEnabled\(\) \|\| quoteLock\.current\) return;/);
  assert.match(pickup,/VITE_PICKUP_ORDERING_ENABLED === "true"/);
  assert.match(app,/const sameLocation=!!key && key===displayedCatalogKeyRef\.current/);
  assert.match(app,/const visibleShops=userLocation && nearbyCatalogKey\(userLocation\)===displayedCatalogKeyRef\.current/);
  assert.match(app,/<ShopCard\b/);
  assert.match(app,/<MenuItemCard\b/);
  assert.match(app,/const DeferredProfileCropper = lazy\(/);
  assert.match(app,/await import\("html5-qrcode"\)/);
  // The MapContainer stays in the deferred map module instead of forcing Leaflet
  // into the initial Home/Discover JavaScript bundle.
  const optionalMaps=readFileSync(new URL("../src/components/OptionalMapCanvases.tsx",import.meta.url),"utf8");
  assert.match(app,/const DiscoverMapCanvas = lazy\(/);
  assert.match(app,/const ExploreMapCanvas = lazy\(/);
  assert.match(optionalMaps,/<MapContainer/);
});
