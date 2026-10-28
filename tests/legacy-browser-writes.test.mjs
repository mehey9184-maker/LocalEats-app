import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {rejectLegacyOrderWrite} from "../src/lib/legacyOrderWrite.ts";

test("actual legacy browser order methods reject without SDK access or fabricated confirmation",async()=>{
 const file=new URL("../src/lib/firebase.ts",import.meta.url),source=fs.readFileSync(file,"utf8");
 const ast=ts.createSourceFile(file.pathname,source,ts.ScriptTarget.Latest,true);const found=[];
 function visit(node){
  if(ts.isMethodDeclaration(node) && ["createAuthoritativeOrder","saveOrder","updateOrder"].includes(node.name.getText(ast))){
   const js=ts.transpileModule("({"+node.getText(ast)+"})",{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
   found.push(vm.runInNewContext(js,{rejectLegacyOrderWrite}));
  }ts.forEachChild(node,visit);
 }visit(ast);assert.equal(found.length,3);
 for(const object of found)await assert.rejects(()=>Object.values(object)[0]({id:"existing"},{status:"collected"}),
  error=>error.code==="PICKUP_CONTRACT_REQUIRED" && error.status===426);
});
