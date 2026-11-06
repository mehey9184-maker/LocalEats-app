import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const source=readFileSync(new URL("../src/screens/auth/LoginScreen.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("LoginScreen.tsx",source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const component=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==="LoginScreen");
const firstState=component.body.statements.findIndex(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast).includes("identifier")));
const prefix=component.body.statements.slice(0,firstState).map(n=>n.getText(ast)).join("\n");
function mount(){
 assert.match(prefix,/scheduleLoginTask/,"Login must own and dispose its delayed tasks");
 const timers=new Map();let next=0;const effects=[];
 const js=ts.transpileModule(prefix+"\nreturn scheduleLoginTask;",{compilerOptions:{target:ts.ScriptTarget.ES2022},fileName:"lifetime.ts"}).outputText;
 const schedule=new Function("useRef","useEffect","setTimeout","clearTimeout",js)(
  current=>({current}),effect=>effects.push(effect),fn=>{timers.set(++next,fn);return next;},id=>timers.delete(id));
 const cleanups=effects.map(fn=>fn());
 return {schedule,unmount:()=>cleanups.forEach(fn=>fn?.()),fire:()=>[...timers.entries()].forEach(([id,fn])=>{timers.delete(id);fn();}),timers};
}
test("unmount cancels pending Login callbacks",()=>{
 const h=mount();let calls=0;h.schedule(()=>calls++,1200);assert.equal(h.timers.size,1);
 h.unmount();h.fire();assert.equal(calls,0);assert.equal(h.timers.size,0);
});
test("an async Login continuation cannot schedule after unmount",()=>{
 const h=mount();let calls=0;h.unmount();h.schedule(()=>calls++,1200);h.fire();
 assert.equal(calls,0);assert.equal(h.timers.size,0);
});
test("mounted Login tasks still execute once and release their handles",()=>{
 const h=mount();let calls=0;h.schedule(()=>calls++,1200);h.fire();
 assert.equal(calls,1);assert.equal(h.timers.size,0);
});
