import test from 'node:test';
import assert from 'node:assert/strict';
import {restaurantMetadata,pickupDistanceLabel,shopRatingLabel} from '../src/services/catalogFacts.ts';
import {menuHelpReply} from '../src/services/menuHelp.ts';
const shop={id:'test',name:'Fixture kitchen',logo:'',rating:0,description:'',address:'Test street',category:'Kota',menu:[{id:'meal',name:'Actual meal',price:30}]};
test('structured data omits unsupported review counts and opening hours',()=>{
 for(const fields of [{},{rating:4.5},{rating:4.5,reviewCount:0}]){
  const data=restaurantMetadata({...shop,...fields});assert.equal('aggregateRating' in data,false);assert.equal('openingHoursSpecification' in data,false);
 }
 const known=restaurantMetadata({...shop,rating:4.5,reviewCount:7,opening_time:'08:00',closing_time:'19:00'});
 assert.equal(known.aggregateRating.reviewCount,7);assert.equal(known.openingHoursSpecification[0].opens,'08:00');
});
test('nonfinite metrics never become a rating or nearby distance claim',()=>{
 for(const value of [undefined,null,'1',NaN,Infinity,-1])assert.equal(pickupDistanceLabel(value),'Distance unavailable');
 assert.equal(pickupDistanceLabel(0),'0.0 km');assert.equal(shopRatingLabel({rating:5,reviewCount:-1}),'No rating available');
});
test('menu help does not impersonate the shop or promise unverified preparation and payment',()=>{
 assert.match(menuHelpReply('How long will it take?',shop),/don’t have a confirmed preparation estimate/);
 assert.match(menuHelpReply('Can I pay?',shop),/no in-app payment/);
 assert.match(menuHelpReply('Hello',shop),/has not been sent to the shop/);
 assert.match(menuHelpReply('Any specials?',shop),/Actual meal/);
 assert.match(menuHelpReply('Any specials?',shop),/don’t have verified popularity or promotion data/);
 assert.match(menuHelpReply('Peanut allergy',shop),/confirm them|confirm.*directly|Check dietary/);
 assert.match(menuHelpReply('Do you have vegetarian or halal options?',shop),/Check dietary/);
});
