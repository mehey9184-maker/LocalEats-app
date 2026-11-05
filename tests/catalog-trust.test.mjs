import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const result=await build({entryPoints:['src/components/ShopCard.tsx'],bundle:true,write:false,format:'cjs',platform:'node',packages:'external'});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {ShopCard}=module.exports;
const shop={id:'unrated',name:'Unrated kitchen',is_active:true,logo:'',rating:0,description:'',address:'Test area',category:'Kota',menu:[]};
const render=overrides=>renderToStaticMarkup(React.createElement(ShopCard,{shop:{...shop,...overrides},isFollowed:false,onStoreInfo:()=>{},triggerHaptic:()=>{},dataSaverEnabled:true}));
test('missing ratings, counts, distance and prep time never become invented values',()=>{
 const html=render({});assert.match(html,/No rating available/);assert.match(html,/Distance unavailable/);assert.match(html,/Pickup at shop/);
 assert.doesNotMatch(html,/4\.8|\(24\)|20-35 min|Verified Township Kitchen/);
});
test('a real positive rating is shown without inventing its missing review count',()=>{
 const html=render({rating:4.2,distance:1.3});assert.match(html,/4\.2/);assert.match(html,/1\.3 km/);assert.doesNotMatch(html,/\(24\)|\(0\)/);
});
test('valid review counts remain visible with their rating',()=>{
 assert.match(render({rating:4.7,reviewCount:16,distance:0}),/4\.7 \(16\)/);
});
test('malformed and inconsistent metrics do not render as social proof',()=>{
 for(const data of [{rating:Infinity},{rating:6},{rating:4.5,reviewCount:0},{rating:-1},{rating:NaN}])assert.match(render(data),/No rating available/);
});
