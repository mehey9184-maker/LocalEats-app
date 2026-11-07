import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

// Execute the actual App callback, preserving functional React updater semantics.
const source=readFileSync(new URL("../src/App.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("App.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let callback;
function visit(node){
 if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==="LoginScreen"){
  callback=node.attributes.properties.find(p=>p.name?.getText(ast)==="onLogin").initializer.expression.getText(ast);
 }
 ts.forEachChild(node,visit);
}
visit(ast);
assert.ok(callback);
function finishLogin(screen){
 const setCurrentScreen=next=>{screen=typeof next==="function"?next(screen):next;};
 new Function("setCurrentScreen",`return (${callback});`)(setCurrentScreen)();
 return screen;
}
test("login completion may advance its own active Login screen",()=>{
 assert.equal(finishLogin("login"),"login-success");
});
for(const screen of ["home","profile","settings","splash","checkout"]){
 test(`late login completion cannot replace ${screen}`,()=>assert.equal(finishLogin(screen),screen));
}

let processingCallback;
function findProcessing(node){
 if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==="runWithProcessing"){
  processingCallback=node.initializer.arguments[0].getText(ast);
 }
 ts.forEachChild(node,findProcessing);
}
findProcessing(ast);
assert.ok(processingCallback);
function processingHarness(){
 const states=[];const dialogs=[];let successes=0;
 const emitted=ts.transpileModule(`return (${processingCallback});`,{
  compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"callback.ts"
 }).outputText;
 const deps={
  activeTransactionsRef:{current:new Set()},
  IdempotencyManager:{getCachedResult:()=>null,acquireLock:()=>true,recordResult:()=>{},releaseLock:()=>{}},
  setProcessingState:s=>states.push(s),setCurrentScreen:()=>{},setModal:m=>dialogs.push(m),
  navigator:{onLine:true},console:{warn:()=>{},error:()=>{}},setTimeout:fn=>fn(),
 };
 const run=new Function(...Object.keys(deps),emitted)(...Object.values(deps));
 return {run,states,dialogs,success:()=>successes++,successes:()=>successes};
}
test("profile processing reports failure to its form and never invokes success",async()=>{
 const h=processingHarness();const failure=new Error("Profile save not confirmed");
 await assert.rejects(h.run(async()=>{throw failure;},h.success,undefined,undefined,true),e=>e===failure);
 assert.equal(h.successes(),0);assert.equal(h.dialogs.length,0);
 assert.deepEqual(h.states,["saving","idle"]);
});
test("existing processing callers keep their handled-error return behavior",async()=>{
 const h=processingHarness();
 assert.equal(await h.run(async()=>{throw new Error("Unavailable");},h.success),null);
 assert.equal(h.successes(),0);assert.equal(h.dialogs.length,1);
});
test("confirmed profile processing returns its result and invokes success once",async()=>{
 const h=processingHarness();const receipt={user_id:"synthetic-test"};
 assert.equal(await h.run(async()=>receipt,h.success,undefined,undefined,true),receipt);
 assert.equal(h.successes(),1);assert.deepEqual(h.states,["saving","success","idle"]);
});
