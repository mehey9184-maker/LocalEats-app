/** Exclusive to the unmerged LocalEats security-review Preview branch.
 * Fail the Vercel BUILD rather than leak preview traffic to production data. */
export function validateSecurityPreviewConfig(env:Record<string,string|undefined>):void{
  if(env.VERCEL_ENV==="production") throw new Error(
    "RELEASE STOP: security review branch must never deploy as Production.");
  if(env.VERCEL_ENV!=="preview") return;
  const exact:Record<string,string>={
    VITE_FIREBASE_PROJECT_ID:"demo-localeats-preview-disabled-20261106",
    VITE_FIREBASE_AUTH_DOMAIN:"demo-localeats-preview-disabled-20261106.firebaseapp.com",
    VITE_FIREBASE_API_KEY:"AIzaSyDemoPreviewDisabledNoRealFirebase1234",
    VITE_FIREBASE_APP_ID:"1:123456789:web:previewdisabled20261106",
    VITE_FIREBASE_STORAGE_BUCKET:"demo-localeats-preview-disabled-20261106.appspot.com",
    VITE_FIREBASE_MESSAGING_SENDER_ID:"123456789",
    VITE_FIREBASE_FIRESTORE_DATABASE_ID:"(default)",
    VITE_LOCALEATS_API_URL:"https://example.invalid",
    VITE_PICKUP_ORDERING_ENABLED:"false",
    PROFILE_API_STAGING_ENABLED:"false",
    PROFILE_API_STAGING_WRITES_ENABLED:"false",
    VITE_SUPABASE_URL:"https://rgpbdajhlrwfmhopzgzk.supabase.co",
    VITE_SUPABASE_ANON_KEY:"preview-disabled-no-direct-data-access",
  };
  const missing=Object.entries(exact).filter(([key,value])=>env[key]!==value).map(([key])=>key);
  if(missing.length)throw new Error("SECURITY REVIEW PREVIEW BLOCKED: unsafe/missing scoped environment: "+missing.join(", "));
  if(env.VITE_LOCAL_FIREBASE_EMULATORS==="true")throw new Error("Hosted preview cannot run local Firebase emulators.");
}
