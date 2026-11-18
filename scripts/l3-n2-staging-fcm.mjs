import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";

/**
 * Runs in the Vercel build process; no secrets are read from a live service.
 * It only transforms the emitted CUSTOM Firebase messaging worker, never the
 * tracked production public/firebase-messaging-sw.js source.
 */
export function isolatedStagingFirebaseConfig(env=process.env) {
  if(env.LOCALEATS_STAGING_ONLY!=="true") return null;
  if(env.VITE_FIREBASE_CONFIG_SOURCE!=="environment")
    throw Error("L3-N2 staging requires VITE_FIREBASE_CONFIG_SOURCE=environment");
  const names=["API_KEY","AUTH_DOMAIN","PROJECT_ID","APP_ID","MESSAGING_SENDER_ID","STORAGE_BUCKET"];
  const values=Object.fromEntries(names.map(name=>[name,env["VITE_FIREBASE_"+name]||""]));
  if(Object.values(values).some(v=>typeof v!=="string" || !v.trim()))
    throw Error("L3-N2 staging Firebase app configuration is incomplete");
  if(values.PROJECT_ID==="localeats-5e26e")
    throw Error("L3-N2 staging cannot use the known Production Firebase project");
  if(values.AUTH_DOMAIN!==values.PROJECT_ID+".firebaseapp.com")
    throw Error("L3-N2 staging Firebase authDomain does not match project ID");
  const vapid=env.VITE_FIREBASE_VAPID_KEY;
  if(!vapid || !vapid.trim())
    throw Error("L3-N2 staging requires its own Firebase Web Push VAPID public key");
  if(env.VITE_PICKUP_ORDERING_ENABLED!=="false")
    throw Error("L3-N2 staging must keep Customer ordering disabled");
  const api=env.VITE_LOCALEATS_API_URL;
  try {
    const u=new URL(api||"");
    if(u.protocol!=="https:" || u.pathname!=="/" || u.search || u.hash || u.username || u.password ||
       ["localeats-api.vercel.app","localeatssa.co.za"].includes(u.hostname))
      throw Error("invalid API URL");
  }catch{throw Error("L3-N2 requires an explicit, isolated HTTPS staging API origin");}
  return {
    apiKey:values.API_KEY,authDomain:values.AUTH_DOMAIN,projectId:values.PROJECT_ID,
    storageBucket:values.STORAGE_BUCKET,messagingSenderId:values.MESSAGING_SENDER_ID,
    appId:values.APP_ID
  };
}
export function injectIsolatedStagingWorker(env=process.env,file="dist/firebase-messaging-sw.js") {
  const config=isolatedStagingFirebaseConfig(env);
  if(!config) return false;
  const path=resolve(file);
  const existing=readFileSync(path,"utf8");
  const re=/firebase\.initializeApp\(\{[^;]+\}\);/g;
  const matches=existing.match(re);
  if(!matches || matches.length!==1)throw Error("L3-N2 worker Firebase initializer missing or ambiguous");
  const next=existing.replace(re,"firebase.initializeApp("+JSON.stringify(config)+");");
  if(!next.includes('"projectId":"'+config.projectId+'"') || next.includes('"projectId":"localeats-5e26e"'))
    throw Error("L3-N2 compiled worker Firebase project mismatch");
  writeFileSync(path,next);
  return true;
}
if(process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)) {
  if(process.argv.includes("--check")) isolatedStagingFirebaseConfig();
  else if(process.argv.includes("--inject")) injectIsolatedStagingWorker();
  else throw Error("Use --check or --inject");
}
