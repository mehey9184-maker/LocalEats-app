import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {pickupReminderDue, schedulePickupReminder} from "../src/services/pickupReminder.ts";

const minute = 60_000;
const readyAt = 1_000_000;

test("a verified Ready event allows one automatic reminder after 12 minutes", () => {
  assert.equal(pickupReminderDue({}, readyAt, readyAt + 12 * minute - 1), false);
  assert.equal(pickupReminderDue({}, readyAt, readyAt + 12 * minute), true);
  assert.equal(pickupReminderDue({automaticShown:true}, readyAt, readyAt + 13 * minute), false);
  assert.equal(pickupReminderDue({acknowledged:true}, readyAt, readyAt + 13 * minute), false);
  assert.equal(pickupReminderDue({}, undefined, readyAt + 13 * minute), false);
  assert.equal(pickupReminderDue({}, readyAt, readyAt + 60 * minute), false);
});

test("snoozing replaces the automatic reminder with an explicit ten-minute delay", () => {
  const now = readyAt + 15 * minute;
  const snoozed = schedulePickupReminder(now);
  assert.equal(pickupReminderDue(snoozed, readyAt, now + 10 * minute - 1), false);
  assert.equal(pickupReminderDue(snoozed, readyAt, now + 10 * minute), true);
  assert.equal(pickupReminderDue(snoozed, readyAt, now + 25 * minute), false);
});

const {outputFiles} = await build({
  entryPoints:["src/services/nearbyShopAlerts.ts"], bundle:true, write:false, format:"cjs", platform:"node",
});
const module = {exports:{}};
new Function("module", "exports", outputFiles[0].text)(module, module.exports);
const {compareNearbyCatalog} = module.exports;
const shop = (id, distance) => ({id, distance, name:id});

test("nearby alerts ignore initial listings, movement, past listings and distances beyond 4 km", () => {
  const first = compareNearbyCatalog(null, "same-place", [shop("existing", 2)]);
  assert.equal(first.newShop, undefined);
  const next = compareNearbyCatalog(first.baseline, "same-place", [shop("edge", 4), shop("outside", 4.01), shop("unknown")]);
  assert.equal(next.newShop.id, "edge");
  const repeat = compareNearbyCatalog(next.baseline, "same-place", [shop("existing", 1), shop("edge", 4)]);
  assert.equal(repeat.newShop, undefined);
  const moved = compareNearbyCatalog(next.baseline, "new-place", [shop("already-near-new-location", 1)]);
  assert.equal(moved.newShop, undefined);
});
