// Execute the actual compiled client modules with synthetic provider adapters only.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const root=resolve(process.argv[2]||'.');
const {build}=createRequire(resolve(root,'package.json'))('esbuild');
const src=readFileSync(resolve(root,'src/lib/firebase.ts'),'utf8');
const bundled={apiKey:'bundled-key',authDomain:'bundled.invalid',projectId:'bundled-production',storageBucket:'bundled.invalid',messagingSenderId:'111',appId:'bundled-app',firestoreDatabaseId:'bundled-database'};
const env={VITE_LOCALEATS_PREVIEW_READ_ONLY:'true',VITE_FIREBASE_CONFIG_SOURCE:'environment',VITE_PREVIEW_FIREBASE_PROJECT_ID:'isolated-fixture',VITE_FIREBASE_PROJECT_ID:'isolated-fixture',VITE_FIREBASE_API_KEY:'fixture-key',VITE_FIREBASE_AUTH_DOMAIN:'fixture.invalid',VITE_FIREBASE_STORAGE_BUCKET:'fixture.invalid',VITE_FIREBASE_MESSAGING_SENDER_ID:'222',VITE_FIREBASE_APP_ID:'fixture-app',VITE_FIREBASE_FIRESTORE_DATABASE_ID:'(default)'};
async function init(environment,existing=false){
 const r=await build({absWorkingDir:root,entryPoints:['src/lib/firebase.ts'],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':JSON.stringify(environment)},plugins:[{name:'isolated-provider',setup(api){
  api.onLoad({filter:/firebase-applet-config\.json$/},()=>({loader:'json',contents:JSON.stringify(bundled)}));
  api.onResolve({filter:/legacyFirestoreReads$|customerPickup$/},a=>({path:a.path,namespace:'unused-reads'}));
  api.onLoad({filter:/.*/,namespace:'unused-reads'},()=>({loader:'js',contents:'export const LegacyFirestoreReads={};export const customerPickupApi={};'}));
  api.onResolve({filter:/^firebase\//},a=>({path:a.path,namespace:'provider'}));
  api.onLoad({filter:/.*/,namespace:'provider'},a=>{
   const names=[...src.matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](firebase\/[^"']+)["']/g)].filter(m=>m[2]===a.path).flatMap(m=>m[1].split(',').map(n=>n.trim().split(/\s+as\s+/)[0]).filter(Boolean));
   const impl={initializeApp:'config=>({config,options:config})',getApps:existing?'()=>[{}]':'()=>[]',getApp:'()=>({options:{projectId:"foreign-project"}})',getAuth:'app=>({app})',getFirestore:'(app,databaseId="(default)")=>({app,databaseId})',getStorage:'(app,bucket)=>({app,bucket})',getFunctions:'app=>({app})',isSupported:'async()=>false'};
   return {loader:'js',contents:[...new Set(names)].map(n=>'export const '+n+'='+(impl[n]||'()=>undefined')+';').join('\n')};
  });
 }}]});
 return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
}
const good=await init(env);assert.equal((good.app||good.getFirebaseApp()).options.projectId,'isolated-fixture');
for(const bad of [{...env,VITE_FIREBASE_API_KEY:''},{...env,VITE_FIREBASE_CONFIG_SOURCE:''},{...env,VITE_PREVIEW_FIREBASE_PROJECT_ID:'other'},{...env,VITE_FIREBASE_PROJECT_ID:'bundled-production',VITE_PREVIEW_FIREBASE_PROJECT_ID:'bundled-production'},{...env,VITE_FIREBASE_FIRESTORE_DATABASE_ID:''}])await assert.rejects(()=>init(bad),/configuration is incomplete|mismatched/);
await assert.rejects(()=>init(env,true),/does not match isolated Preview/);
const media=resolve(root,'src/lib/cloudinary.ts');
let mediaCases=0;
if(existsSync(media)){
 const prior=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected network');};
 try{
  for(const flags of [{VITE_LOCALEATS_PREVIEW_READ_ONLY:'true'},{VITE_MERCHANT_PREVIEW_READ_ONLY:'true'}]){
   const out=await build({entryPoints:[media],bundle:true,write:false,format:'esm',platform:'node',define:{'import.meta.env':JSON.stringify(flags)}});
   const mod=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
   await assert.rejects(()=>mod.uploadImageToCloudinary(new Blob(['synthetic'])),/read-only Preview/);mediaCases++;
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=prior;}
}
console.log('R2B1_CLIENT_ISOLATION '+JSON.stringify({configuration:7,mediaCases,scope:'actual compiled modules; synthetic SDK; no hosted provider proof'}));
