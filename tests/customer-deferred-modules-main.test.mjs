import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const pickup = readFileSync(new URL("../src/services/customerPickup.ts",import.meta.url),"utf8");

test("QR scanner is loaded only while optional scanner modal is open",()=>{
  assert.match(app,/import type \{ Html5Qrcode \} from "html5-qrcode"/);
  assert.doesNotMatch(app,/^import \{ Html5Qrcode \} from "html5-qrcode"/m);
  const start = app.indexOf("function QRScannerModal(");
  const end = app.indexOf("function ",start+30);
  assert.ok(start>0 && end>start);
  const modal=app.slice(start,end);
  assert.match(modal,/if \(!isOpen\) return;/);
  assert.match(modal,/const \{ Html5Qrcode \} = await import\("html5-qrcode"\)/);
  assert.match(modal,/if \(!isMounted\) return;/);
  assert.match(modal,/scannerRef\.current = html5QrCode/);
  assert.match(modal,/!isMounted && html5QrCode\.isScanning/);
  assert.match(modal,/html5QrCode\.stop\(\)/);
  assert.match(modal,/manualCode\.trim\(\)/);
});

test("profile editor is lazy and preserves the existing cropper behavior",()=>{
  assert.doesNotMatch(app,/import Cropper from "react-easy-crop"/);
  assert.match(app,/const DeferredProfileCropper = lazy\(\(\) => import\("react-easy-crop"\)\)/);
  const cropBlock=app.slice(app.indexOf("{/* Cropper Modal */}"),app.indexOf("{/* Cropper Modal */}")+1800);
  assert.match(cropBlock,/showCropper && imageToCrop/);
  assert.match(cropBlock,/<Suspense fallback=/);
  assert.match(cropBlock,/<DeferredProfileCropper/);
  for(const prop of ["image","crop","zoom","aspect","cropShape","showGrid","onCropChange","onZoomChange","onCropComplete"])
    assert.match(cropBlock,new RegExp("\\b"+prop+"="));
  assert.match(cropBlock,/<\/Suspense>/);
});

test("shop UI and safety gates remain untouched by optional module delivery",()=>{
  assert.match(app,/readPickupCatalog\(userLocation/);
  assert.match(app,/const sameLocation=!!key && key===displayedCatalogKeyRef\.current/);
  assert.match(app,/import \{ ShopCard, MenuItemSkeleton, MenuItemCard \}/);
  assert.match(pickup,/VITE_PICKUP_ORDERING_ENABLED === "true"/);
  assert.match(pickup,/blockPickupSubmission\(\)/);
});
