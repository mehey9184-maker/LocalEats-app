import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {canRenderAddressEditor} from '../src/lib/addressProfileSession.ts';
const actor={uid:'A',isAnonymous:false};const basis={identity:actor,revision:'2026-11-07T00:00:00Z'};
test('the address draft is mounted only for its original exact registered identity',()=>{
 assert.equal(canRenderAddressEditor(true,basis,actor,'A'),true);
 for(const [open,context,user,id] of [[false,basis,actor,'A'],[true,basis,null,'A'],[true,basis,{...actor},'A'],[true,basis,{uid:'B',isAnonymous:false},'B'],[true,null,actor,'A'],[true,basis,actor,'B']])assert.equal(canRenderAddressEditor(open,context,user,id),false);
 const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');assert.match(app,/canRenderAddressEditor\(isAddressModalOpen, addressEditBasis, auth.currentUser, userProfile.id\) && <AddressSwitcherModal/);
});
const source=readFileSync(new URL('../src/components/AddressSwitcherModal.tsx',import.meta.url),'utf8');const ast=ts.createSourceFile('modal.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let callback;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='saveAddress')callback=node.initializer.getText(ast);ts.forEachChild(node,visit);}visit(ast);
const code=ts.transpileModule(`return (${callback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:'callback.ts'}).outputText;
function harness(save){const events=[],mounted={current:true};const deps={saving:{current:false},mounted,setIsSaving:v=>events.push(['busy',v]),setSaveError:v=>events.push(['error',v]),setIsEditingCustom:v=>events.push(['editing',v]),onClose:()=>events.push(['close']),onSaveAddress:save};return{events,mounted,run:new Function(...Object.keys(deps),code)(...Object.values(deps))};}
test('address confirmation waits for the backend before closing',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>resolve=r));const pending=h.run('Private draft');assert.equal(h.events.some(e=>e[0]==='close'),false);resolve();await pending;assert.equal(h.events.filter(e=>e[0]==='close').length,1);
});
test('failed address save keeps the editor open with an error',async()=>{
 const h=harness(async()=>{throw Error('Revision conflict');});await h.run('Private draft');assert.equal(h.events.some(e=>e[0]==='close'),false);assert.ok(h.events.some(e=>e[0]==='error'&&e[1]==='Revision conflict'));
});
test('completion from an unmounted account editor cannot close a later editor',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>resolve=r));const pending=h.run('A draft');h.mounted.current=false;resolve();await pending;assert.equal(h.events.some(e=>e[0]==='close'),false);
});
test('rapid duplicate address confirmation issues one request',async()=>{
 let resolve,count=0;const h=harness(()=>{count++;return new Promise(r=>resolve=r);});const pending=h.run('Address');await h.run('Address');assert.equal(count,1);resolve();await pending;
});
