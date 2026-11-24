// Read-only static investigation. Never imports application modules or executes diagnostics.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const customer=path.resolve(process.argv[2]||"");
const merchant=path.resolve(process.argv[3]||"");
if(!process.argv[2]||!process.argv[3]) throw Error("Two pinned checkouts required");
const ts=createRequire(path.join(customer,"package.json"))("typescript");
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const slash=s=>s.split(path.sep).join("/");
const emit=(kind,data)=>console.log("H1C "+kind+" "+JSON.stringify(data));
const bodies=new Map();
const modules=/\.(?:[cm]?js|jsx|tsx?)$/;
const testPath=p=>/(^|\/)tests?(\/|$)|\.(?:test|spec)\.[^.]+$/.test(p);
const appFile=p=>/^(src\/|server\.ts$|functions\/src\/|localeats-api\/src\/)/.test(p)&&modules.test(p)&&!testPath(p)&&!p.endsWith(".d.ts");
function inspect(label,root,expected,roots,candidates){
 const git=(...args)=>execFileSync("git",["-C",root,...args],{encoding:"utf8",maxBuffer:16*1024*1024});
 const commit=git("rev-parse","HEAD").trim();
 if(commit!==expected)throw Error(label+" pin mismatch");
 const tracked=git("ls-files","-z").split("\0").filter(Boolean);
 const trackedSet=new Set(tracked), source=tracked.filter(appFile), sourceSet=new Set(source);
 const refs=new Map(source.map(f=>[f,new Set()]));
 const testRefs=new Map(), unresolved=[], dynamic=[], errors=[], exact=new Map();
 for(const f of tracked){
  const data=fs.readFileSync(path.join(root,f));
  const hash=sha(data); if(!exact.has(hash))exact.set(hash,[]); exact.get(hash).push(f);
  if(!modules.test(f)||f.endsWith(".d.ts")||(!sourceSet.has(f)&&!testPath(f)&&!f.startsWith("scripts/")&&!/^[^/]+\.[cm]?js$/.test(f)))continue;
  const text=data.toString("utf8"), ast=ts.createSourceFile(f,text,ts.ScriptTarget.Latest,true);
  if(ast.parseDiagnostics.length)errors.push({file:f,count:ast.parseDiagnostics.length});
  function add(spec,node){
   if(!spec.startsWith(".")&&!spec.startsWith("@/"))return;
   const base=spec.startsWith("@/")?spec.slice(2):path.posix.normalize(path.posix.join(path.posix.dirname(f),spec));
   const bare=base.replace(/\.[cm]?js$/,"");
   const opts=[base,...[".ts",".tsx",".js",".jsx",".mjs",".cjs",".json"].map(e=>base+e),...[".ts",".tsx",".mts",".cts"].map(e=>bare+e),...[".ts",".tsx",".js",".jsx",".mjs"].map(e=>base+"/index"+e)];
   const resolved=opts.find(x=>trackedSet.has(x));
   if(!resolved){if(sourceSet.has(f))unresolved.push({file:f,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,spec});return;}
   if(sourceSet.has(f))refs.get(f).add(resolved);
   else {if(!testRefs.has(resolved))testRefs.set(resolved,new Set());testRefs.get(resolved).add(f);}
  }
  function visit(n){
   if((ts.isImportDeclaration(n)||ts.isExportDeclaration(n))&&n.moduleSpecifier&&ts.isStringLiteralLike(n.moduleSpecifier))add(n.moduleSpecifier.text,n);
   if(ts.isImportEqualsDeclaration(n)&&ts.isExternalModuleReference(n.moduleReference)&&n.moduleReference.expression&&ts.isStringLiteralLike(n.moduleReference.expression))add(n.moduleReference.expression.text,n);
   if(ts.isCallExpression(n)&&(n.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(n.expression)&&n.expression.text==="require"))){
    if(n.arguments.length&&ts.isStringLiteralLike(n.arguments[0]))add(n.arguments[0].text,n);
    else if(sourceSet.has(f))dynamic.push({file:f,line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1});
   }
   if(sourceSet.has(f)&&ts.isFunctionLike(n)&&n.body&&ts.isBlock(n.body)){
    // Preserve interior characters and literal content. Only normalize common indentation and trailing line whitespace.
    const lines=n.body.getText(ast).replace(/\r\n/g,"\n").split("\n");
    const interior=lines.slice(1,-1).filter(l=>l.trim());
    const indent=interior.length?Math.min(...interior.map(l=>l.match(/^\s*/)[0].length)):0;
    const normalized=lines.map((l,i)=>i===0?l.trimEnd():i===lines.length-1?l.trim():l.slice(Math.min(indent,l.match(/^\s*/)[0].length)).trimEnd()).join("\n");
    if(interior.length>=12&&normalized.length>=350){
     const key=sha(normalized);
     const record={repo:label,file:f,line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,name:n.name?.getText(ast)||"(anonymous)",lines:lines.length};
     if(!bodies.has(key))bodies.set(key,[]);bodies.get(key).push(record);
    }
   }
   ts.forEachChild(n,visit);
  }
  visit(ast);
 }
 const seen=new Set(), stack=[...roots];
 for(const r of roots)if(!sourceSet.has(r))throw Error("Missing root "+label+"/"+r);
 while(stack.length){const f=stack.pop();if(seen.has(f))continue;seen.add(f);for(const dep of refs.get(f)||[])if(sourceSet.has(dep))stack.push(dep);}
 const inbound=new Map(source.map(f=>[f,[]]));
 for(const [f,deps] of refs)for(const dep of deps)if(inbound.has(dep))inbound.get(dep).push(f);
 emit("summary",{repo:label,commit,tracked:tracked.length,source:source.length,reachable:seen.size,unreached:source.length-seen.size,parseErrors:errors,unresolved:unresolved.length,dynamic:dynamic.length,roots});
 emit("exact", {repo:label,groups:[...exact.values()].filter(g=>g.length>1)});
 emit("unresolved", {repo:label,items:unresolved.slice(0,35),dynamic:dynamic.slice(0,35)});
 emit("candidates",{repo:label,items:candidates.map(f=>({file:f,exists:trackedSet.has(f),reachable:seen.has(f),sourceInbound:inbound.get(f)||[],otherCodeInbound:[...(testRefs.get(f)||[])]}))});
 emit("unreached",{repo:label,items:source.filter(f=>!seen.has(f)).map(f=>({file:f,inbound:inbound.get(f)||[],otherCodeInbound:[...(testRefs.get(f)||[])]}))});
}
inspect("Customer",customer,"7872fc844b442219be86ffafc19092124f8e8e42",["src/main.tsx","server.ts","functions/src/index.ts"],["src/hooks/useShopsData.ts","src/hooks/useDualSync.ts","src/hooks/useOfflineSync.ts","src/hooks/useMapboxCycling.ts","src/utils/dualSync.ts"]);
inspect("Merchant/API",merchant,"5259101e7b3ccd3b8cc900a812efa851538d86ed",["src/main.tsx","localeats-api/src/server.ts"],["src/hooks/useOrderWorkflow.ts","src/hooks/useAppInitializer.ts","src/services/merchantPreviewSimulator.ts","src/components/RiderManagement.tsx"]);
emit("function_body_candidates",{minimumInteriorLines:12,minimumCharacters:350,groups:[...bodies.values()].filter(g=>g.length>1)});
console.log("H1C_STATIC_SCAN_COMPLETE");
