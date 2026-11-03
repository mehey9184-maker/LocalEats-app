/** Staging-only configuration for the Client profile Vercel function.
 * Production and the live LocalEats database fail closed at this stage. */
export const PROFILE_STAGING_REF="rgpbdajhlrwfmhopzgzk";
export const LIVE_FIREBASE_PROJECT_ID="localeats-5e26e";

type Environment = Record<string,string|undefined>;
export interface ProfileStagingConfig {
  firebaseProjectId:string;
  firebaseClientEmail:string;
  firebasePrivateKey:string;
  supabaseUrl:string;
  supabaseServiceRoleKey:string;
  writesEnabled:boolean;
}
export function stagingProfileConfig(env:Environment):ProfileStagingConfig|null{
  if(env.VERCEL_ENV!=="preview" || env.PROFILE_API_STAGING_ENABLED!=="true")
    return null;
  const ref=env.PROFILE_API_STAGING_SUPABASE_REF;
  const url=env.PROFILE_API_STAGING_SUPABASE_URL;
  const secret=env.PROFILE_API_STAGING_SUPABASE_SECRET_KEY;
  const firebaseProjectId=env.PROFILE_API_STAGING_FIREBASE_PROJECT_ID;
  const firebaseClientEmail=env.PROFILE_API_STAGING_FIREBASE_CLIENT_EMAIL;
  const firebasePrivateKey=env.PROFILE_API_STAGING_FIREBASE_PRIVATE_KEY;
  if(ref!==PROFILE_STAGING_REF ||
     url!==`https://${PROFILE_STAGING_REF}.supabase.co` ||
     !secret || !firebaseProjectId || firebaseProjectId===LIVE_FIREBASE_PROJECT_ID ||
     !firebaseClientEmail || !firebaseClientEmail.endsWith(".gserviceaccount.com") ||
     !firebasePrivateKey?.includes("PRIVATE KEY"))
    return null;
  return {
    firebaseProjectId,
    firebaseClientEmail,
    firebasePrivateKey:firebasePrivateKey.replace(/\\n/g,"\n"),
    supabaseUrl:url,
    supabaseServiceRoleKey:secret,
    writesEnabled:env.PROFILE_API_STAGING_WRITES_ENABLED==="true",
  };
}
