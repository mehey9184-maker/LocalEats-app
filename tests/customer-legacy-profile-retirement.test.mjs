import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=new URL('../src/',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('checkout cannot import the unversioned profile writer or promise implicit profile saving',()=>{
 const source=read('screens/CheckoutScreen.tsx');assert.doesNotMatch(source,/profileService|upsertProfileWithRPC|saveToProfile|Save change details to user profile/);
 assert.match(source,/await handlePickupAction\(\); return;/);
});
test('the retired service cannot register automatic profile queue replay',()=>{
 const source=read('lib/profileService.ts');assert.doesNotMatch(source,/addEventListener\(|setInterval\(/);
});
test('runtime source has no import of the retired profile service or unversioned queue',()=>{
 function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(path,entry.name)):[join(path,entry.name)]);}
 for(const path of walk(fileURLToPath(root)).filter(path=>/\.[cm]?[jt]sx?$/.test(path)&&!/[\\/]lib[\\/]profileService\.ts$/.test(path))){
  const source=readFileSync(path,'utf8');assert.doesNotMatch(source,/(?:from\s*|import\s*\()["'][^"']*(?:profileService|offlineQueue)["']/,path);
 }
});
