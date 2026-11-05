import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const bundle=await build({entryPoints:['src/services/menuHelpResponse.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
const module={exports:{}};new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const {menuHelpResponse}=module.exports;
const shop={name:'Fixture kitchen',menu:[{name:'Actual meal'}]};
test('missing model, model failure and empty model output use factual automated fallback',async()=>{
 for(const client of [null,{models:{generateContent:async()=>{throw Error('provider unavailable');}}},{models:{generateContent:async()=>({text:'  '})}}]){
  const reply=await menuHelpResponse('Hello',shop,[],client);
  assert.match(reply,/has not been sent to the shop/);assert.doesNotMatch(reply,/kitchen team member|currently preparing orders/);
 }
});
test('model receives actual menu and pickup constraints, without customer profile or fabricated facts',async()=>{
 let request;
 const result=await menuHelpResponse('Hello',shop,[],{models:{generateContent:async input=>{request=input;return {text:'Automated answer'};}}});
 assert.equal(result,'Automated answer');assert.match(request.config.systemInstruction,/Actual meal/);assert.match(request.config.systemInstruction,/No in-app payment/);
 assert.doesNotMatch(request.config.systemInstruction,/20-30 mins|4\.8|Cash on Delivery/);
});
test('malformed menu data safely falls back without invented dishes',async()=>{
 const reply=await menuHelpResponse('Menu?',{menu:'not an array'},null,null);assert.match(reply,/menu is unavailable/);
});
