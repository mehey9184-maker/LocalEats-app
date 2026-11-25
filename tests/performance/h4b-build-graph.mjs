// Build with original Vite config; collect Rollup's actual emitted dependency graph.
// Only module names, import edges and byte counts; never inspect environment values.
import {build} from "vite";
import {readFileSync,readdirSync,statSync} from "node:fs";
import {join} from "node:path";
import {gzipSync} from "node:zlib";
import assert from "node:assert/strict";
const [component,variant]=process.argv.slice(2);
const normalize=id=>id.replaceAll("\\","/").replace(process.cwd().replaceAll("\\","/")+"/","");
const packageOf=id=>{
 const p=normalize(id).split("/node_modules/").at(-1).replace(/^node_modules\//,"");
 if(!id.includes("node_modules"))return "(application)";
 const parts=p.split("/");return parts[0].startsWith("@")?parts.slice(0,2).join("/"):parts[0];
};
await build({plugins:[{
 name:"h4b-offline-bundle-audit",apply:"build",
 generateBundle(_opts,bundle){
  const chunks=Object.values(bundle).filter(c=>c.type==="chunk");
  const byName=new Map(chunks.map(c=>[c.fileName,c]));
  const eager=new Set();
  const visit=name=>{if(eager.has(name)||!byName.has(name))return;eager.add(name);for(const dep of byName.get(name).imports)visit(dep);};
  for(const c of chunks)if(c.isEntry)visit(c.fileName);
  const packages=new Map();
  for(const c of chunks){
   for(const [id,meta] of Object.entries(c.modules)){
    const pkg=packageOf(id),v=packages.get(pkg)||{eager:0,lazy:0};
    v[eager.has(c.fileName)?"eager":"lazy"]+=meta.renderedLength;packages.set(pkg,v);
   }
   const featureModules=Object.keys(c.modules).filter(id=>/\/src\/(screens|components)\/(Marketing|DashboardOverview|OrdersManagement|MenuManagement|ShopProfile|DiagnosticUtilityModal|LegalDocsModal|EditProfile|CreateShopOnboarding|Coupons|Insights|PaymentHistory|SettingsScreen|ContactScreen|OrderHistoryScreen|NotificationsScreen|OrderRating)\.tsx$/.test(id)).map(normalize);
   console.log("H4B_CHUNK "+JSON.stringify({component,variant,file:c.fileName,eager:eager.has(c.fileName),imports:c.imports,dynamicImports:c.dynamicImports,raw_bytes:Buffer.byteLength(c.code),gzip_bytes:gzipSync(c.code,{level:9}).length,featureModules}));
  }
  if(component==="Customer" && variant==="candidate"){
   const firestore=packages.get("@firebase/firestore");
   assert.equal(firestore?.eager??0,0,"Firestore must not be in Customer static entry graph");
   assert.ok((firestore?.lazy??0)>0,"Retained optional Firestore implementation must still be built");
   assert.ok((packages.get("@firebase/auth")?.eager??0)>0,"Authentication remains available at startup");
   assert.ok((packages.get("@firebase/messaging")?.eager??0)>0,"Push SDK remains available at startup");
   console.log("H4B1_FIREBASE_GRAPH_PASS");
  }
  console.log("H4B_PACKAGES "+JSON.stringify({component,variant,packages:[...packages].sort((a,b)=>b[1].eager-a[1].eager).slice(0,30).map(([name,v])=>({name,...v}))}));
 }
}]});
function* files(dir){for(const name of readdirSync(dir)){const p=join(dir,name);if(statSync(p).isDirectory())yield* files(p);else yield p;}}
const sentinel="H4B_SYNTHETIC_GEMINI_NOT_A_CREDENTIAL_20261125";
let matches=0;
for(const p of files("dist"))if(/\.(js|html|map|json|css)$/.test(p)&&readFileSync(p).includes(sentinel))matches++;
console.log("H4B_SENTINEL "+JSON.stringify({component,variant,matches}));
if(variant==="candidate")assert.equal(matches,0,"Synthetic private-key marker must not reach built output");
