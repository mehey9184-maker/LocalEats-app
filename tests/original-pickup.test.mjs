import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {requireRealLocation,mapPickupShop,pickupCartIntent,blockPickupSubmission} from '../src/services/pickupMapping.ts';
const point={lat:-25.98,lng:28.2};
const item={id:'real-menu',shopId:'real-shop',name:'Item',quantity:2,price:0.01,image:''};
test('discovery never substitutes coordinates or accepts invalid or outside-radius API data',()=>{
 for(const p of [null,{lat:NaN,lng:28},{lat:100,lng:28}])assert.throws(()=>requireRealLocation(p));
 assert.throws(()=>mapPickupShop({id:'s',name:'Shop',is_active:true,lat:point.lat,lng:point.lng,distance_km:4.1},[]));
 assert.throws(()=>mapPickupShop({id:'s',name:'Shop',is_active:false,lat:point.lat,lng:point.lng,distance_km:1},[]));
});
test('real API menus map to original shop cards without invented items or options',()=>{
 const shop={id:'s',name:'Shop',is_active:true,lat:point.lat,lng:point.lng,distance_km:2};
 assert.deepEqual(mapPickupShop(shop,[]).menu,[]);
 const mapped=mapPickupShop(shop,[{id:'m',name:'Real item',price:32.5,is_available:true},{id:'sold-out',is_available:false}]);
 assert.equal(mapped.menu.length,1);assert.equal(mapped.menu[0].price,32.5);assert.equal(mapped.distance,2);
 assert.deepEqual(mapped.menu[0].customizations,[]);
 assert.throws(()=>mapPickupShop(shop,[{id:'m',name:'Real',price:NaN,is_available:true}]));
});
test('quote sends IDs/quantities and pickup contact, never client prices',()=>{
 const intent=pickupCartIntent([item],point,'Test','0712345678','cash');
 assert.deepEqual(intent.items,[{menu_item_id:'real-menu',quantity:2}]);
 assert.equal(intent.delivery_type,'collection');assert.equal(intent.tip_amount,0);
 assert.equal(intent.customer_details.phone,'0712345678');assert.ok(!JSON.stringify(intent).includes('0.01'));
});
test('invalid carts, contact and unsupported options cannot obtain a quote',()=>{
 for(const cart of [[],[item,{...item,shopId:'other'}],[{...item,quantity:0}],[{...item,selectedCustomizations:[{name:'Extra',price:5}]}]])
  assert.throws(()=>pickupCartIntent(cart,point,'Test','0712345678','cash'));
 assert.throws(()=>pickupCartIntent([item],point,'Test','bad','cash'));
});
test('submission remains blocked regardless of quote consent and original entry is retained',()=>{
 assert.throws(()=>blockPickupSubmission(),/not enabled/);
 const entry=readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
 assert.match(entry,/import App from '.\/App.tsx'/);assert.doesNotMatch(entry,/PickupCustomerApp/);
 const checkout=readFileSync(new URL('../src/screens/CheckoutScreen.tsx',import.meta.url),'utf8');
 assert.match(checkout,/await reviewPickupQuote\(\); return;/);
 assert.match(checkout,/if\(pickupQuote && quoteConsent\)blockPickupSubmission\(\)/);
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
 assert.match(app,/readPickupCatalog\(userLocation\)/);assert.doesNotMatch(app,/setShops\(DEFAULT_FALLBACK_SHOPS\)/);
});
