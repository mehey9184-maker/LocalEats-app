import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const screen=readFileSync(new URL("../src/screens/auth/CompleteProfileScreen.tsx",import.meta.url),"utf8");
const app=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");

test("pickup profile accepts name and phone without requiring rider coordinates",()=>{
  assert.match(screen,/if \(!fullName \|\| !phone\) \{/);
  assert.doesNotMatch(screen,/if \(!latitude \|\| !longitude\)/);
  assert.doesNotMatch(screen,/if \(!fullName \|\| !phone \|\| !city \|\| !address\)/);
  assert.match(screen,/validateSAPhone\(phone\)/);
  assert.match(screen,/await commitProfileChange\(patch, submitted\)/);
});

test("the original location search remains optional, without rider instructions",()=>{
  assert.match(screen,/Optional Home Location/);
  assert.match(screen,/Nearby shops use your device location/);
  assert.doesNotMatch(screen,/pin for the rider/);
  assert.doesNotMatch(screen,/provide delivery coordinates/);
  assert.match(screen,/<AddressSearch/);
  assert.match(screen,/<LocationPickerMap/);
});

test("pickup discovery and registered account editor guard remain unchanged",()=>{
  assert.match(app,/currentScreen === "complete-profile" && canManageCustomerProfile/);
  assert.match(app,/navigateToProfile\("complete-profile"\)/);
  assert.match(app,/nearbyCatalogKey\(userLocation\)/);
  assert.doesNotMatch(screen,/await.*updateFirestoreOrder\(/);
});
