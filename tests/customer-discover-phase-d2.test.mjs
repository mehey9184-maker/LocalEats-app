import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const start=source.indexOf("function DiscoverScreen(");
const end=source.indexOf("function AddressPicker(",start);
const discover=source.slice(start,end);
const at=(needle)=>discover.indexOf(needle);

test("Discover keeps original identity, but places search and results ahead of carousels",()=>{
 assert.ok(start>=0 && end>start);
 assert.match(discover,/DISCOVER/);
 assert.match(discover,/Local Flavor/);
 assert.ok(at("Search & Hero")<at("Bento Grid Categories"));
 assert.ok(at("Bento Grid Categories")<at("Category chips and compact Discover controls"));
 assert.ok(at("Category chips and compact Discover controls")<at("Store Grid or Map"));
 assert.ok(at("Store Grid or Map")<at("Real Menu Items Feed from Active Shops"));
 assert.ok(at("Real Menu Items Feed from Active Shops")<at("Chef's Selection Carousel"));
 assert.doesNotMatch(discover,/Dedicated Promo Code & Flyer Scanner Action Card/);
 assert.match(discover,/onScanFlyer\(\)/);
});

test("Redundant sort/rating/distance controls become one optional filter section",()=>{
 assert.match(discover,/id="discover-sort"/);
 for(const name of ["Open &amp; Nearby","Nearest First","Highest Rated","Fastest Known Prep"])assert.ok(discover.includes(name));
 assert.doesNotMatch(discover,/Sort by Distance/);
 assert.match(discover,/aria-controls="discover-extra-filters"/);
 assert.match(discover,/aria-expanded=\{showExtraFilters\}/);
 assert.match(discover,/id="discover-extra-filters"/);
 for(const value of ["[0,3,4,4.5]","Within 1 km","Within 2 km","Any nearby"])assert.ok(discover.includes(value));
 assert.match(discover,/setMinRating\(0\);setMaxDistance\(null\);setShowOnlyOpen\(false\)/);
 assert.match(discover,/setSelectedCategory\("All"\);setSearchQuery\(""\)/);
 assert.match(discover,/aria-live="polite"/);
 assert.match(discover,/disabled=\{selectedCategory==="Nearby"\}/);
});

test("Search supports keyboard activation, Escape, recent search and clear actions",()=>{
 assert.match(discover,/htmlFor="discover-search-input"/);
 assert.match(discover,/id="discover-search-input"/);
 assert.match(discover,/aria-controls="discover-search-suggestions"/);
 assert.match(discover,/id="discover-search-suggestions"/);
 assert.match(discover,/e\.key==="Escape"/);
 assert.match(discover,/setSearchQuery\(s\)/);
 const suggestions=discover.slice(at("Float Suggestions relative to search bar"),at("Bento Grid Categories"));
 assert.doesNotMatch(suggestions,/onMouseDown=/);
 assert.match(suggestions,/Recent Searches/);
 assert.match(suggestions,/Matching Past Searches/);
 assert.match(discover,/aria-label="Clear search text"/);
});

test("Category tiles, shop cards, back controls and favourites are keyboard accessible",()=>{
 for(const name of ["Kotas","Burgers","Drinks","All"]) {
  assert.ok(discover.includes('aria-pressed={selectedCategory==="'+name+'"}'));
  assert.ok(discover.includes('setSelectedCategory("'+name+'");triggerHaptic(5);'));
 }
 assert.match(discover,/role="button" tabIndex=\{0\} aria-label=/);
 assert.match(discover,/e\.target!==e\.currentTarget/);
 assert.match(discover,/aria-pressed=\{isFollowing\}/);
 assert.match(discover,/aria-label=\{isFollowing \?/);
 assert.match(discover,/aria-label=\{viewMode==="list"/);
 assert.match(discover,/aria-label="Back to Home"/);
 assert.match(discover,/min-w-11 min-h-11/);
});

test("D1 location and pricing protections remain unchanged",()=>{
 assert.match(discover,/discoverSortShops\(/);
 assert.match(discover,/discoverShopCoordinates\(/);
 assert.match(discover,/homeRating\(shop\)/);
 assert.match(discover,/Number\.isFinite\(distance\)/);
 assert.match(discover,/onSelectShop\(shop\.id\)/);
 assert.doesNotMatch(discover,/hashString\(shop\.id\)|delivery_eta \|\| "20"|4\.8 Verified/);
 assert.match(source,/readPickupCatalog\(userLocation\)/);
});
