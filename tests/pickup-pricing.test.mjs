import test from 'node:test';
import assert from 'node:assert/strict';
import {pickupQuoteAmounts} from '../src/services/pickupSummary.ts';
const quote=(quantity=1,discount_minor=0)=>({lines:[{menu_item_id:'m',name:'Menu item',quantity,unit_minor:2500,line_minor:2500*quantity}],subtotal_minor:2500*quantity,service_fee_minor:0,delivery_fee_minor:0,tip_minor:0,discount_minor,total_minor:2500*quantity-discount_minor,pricing_fingerprint:'a'.repeat(64)});
test('one/two real menu items and explicit server discounts use zero-fee payable amounts',()=>{
 assert.deepEqual(pickupQuoteAmounts(quote()),{subtotal:25,serviceFee:0,deliveryFee:0,discount:0,total:25});
 assert.equal(pickupQuoteAmounts(quote(2)).total,50);
 assert.equal(pickupQuoteAmounts(quote(1,500)).total,20);
 assert.equal(pickupQuoteAmounts(quote(2,1000)).total,40);
});
test('old fees, invalid discounts, VAT additions and mismatched quote lines are rejected',()=>{
 for(const patch of [{service_fee_minor:250,total_minor:2750},{delivery_fee_minor:1000},{tip_minor:500},{discount_minor:2501},{discount_minor:-1},{total_minor:2875},{subtotal_minor:2600},{total_minor:NaN}])
  assert.throws(()=>pickupQuoteAmounts({...quote(),...patch}),/zero-fee pickup pricing/);
});
