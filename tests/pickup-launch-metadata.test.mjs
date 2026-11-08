import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('R3.7: Customer public metadata promises pickup, not delivery',()=>{
 const title=html.match(/<title>([^<]+)<\/title>/i)?.[1];
 const keywords=html.match(/<meta\s+name="keywords"\s+content="([^"]+)"/i)?.[1];
 const description=html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1];
 assert.ok(title);
 assert.match(title,/LocalEats/);
 assert.match(title,/Pickup/i);
 assert.doesNotMatch(title,/Delivery/i);
 assert.ok(keywords);
 assert.match(keywords,/Food Pickup/);
 assert.doesNotMatch(keywords,/Food Delivery/);
 assert.match(description||'',/Collect your meal and pay at the shop/);
});
