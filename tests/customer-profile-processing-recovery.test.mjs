import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('App.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='runWithProcessing')callback=node.initializer.arguments[0].getText(ast);ts.forEachChild(node,visit);}visit(ast);
test('a failed form action releases its lock and returns the error without retaining a generic retry',async()=>{
 assert.ok(callback);
 const states=[],modals=[],released=[],activeTransactionsRef={current:new Set()};
 const deps={activeTransactionsRef,IdempotencyManager:{acquireLock:()=>true,releaseLock:k=>released.push(k)},setProcessingState:s=>states.push(s),setModal:m=>modals.push(m)};
 const code=ts.transpileModule(`return (${callback});`,{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:'callback.ts'}).outputText;
 const run=new Function(...Object.keys(deps),code)(...Object.values(deps));
 const failure=new Error('Revision conflict');let attempts=0;
 await assert.rejects(run(async()=>{attempts++;throw failure;},undefined,undefined,'profile-test',true),error=>error===failure);
 assert.equal(attempts,1);assert.deepEqual(modals,[]);assert.deepEqual(states,['saving','idle']);assert.deepEqual(released,['profile-test']);assert.equal(activeTransactionsRef.current.size,0);
});
