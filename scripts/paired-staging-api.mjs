// Pinned companion API draft revision; verify hosted deployment metadata before release.
export const REVIEWED_API_COMMIT='a3c1b3498398ab641f4ed8c45d6d9cd79d1e66a7';
/** Build configuration is not proof of hosted provenance; verify Vercel metadata before deployment. */
export function resolvePairedStagingApi(env=process.env){
 const flag=env.LOCALEATS_PAIRED_PREVIEW;
 if(flag===undefined || flag==='false')return null;
 if(flag!=='true' || env.VERCEL_ENV!=='preview' || env.LOCALEATS_STAGING_ONLY!=='true' ||
    env.VERCEL_GIT_COMMIT_REF!=='review/l3-n8n-customer-designated-pilot' ||
    env.VITE_FIREBASE_CONFIG_SOURCE!=='environment' || env.VITE_FIREBASE_PROJECT_ID!=='localeats-staging' ||
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID!=='(default)' || env.VITE_PICKUP_ORDERING_ENABLED!=='false' ||
    env.LOCALEATS_PAIRED_API_COMMIT!==REVIEWED_API_COMMIT)throw Error('PAIRED_STAGING_CONFIGURATION_INVALID');
 const origin=env.LOCALEATS_PAIRED_API_ORIGIN;
 try{
  const url=new URL(origin);
  if(url.origin!==origin || url.protocol!=='https:' || url.username || url.password ||
     !/^localeats-api-staging-r52d-[a-z0-9]{9}-mehey9184-makers-projects\.vercel\.app$/.test(url.hostname))throw Error();
 }catch{throw Error('PAIRED_STAGING_API_MUST_BE_IMMUTABLE_PREVIEW');}
 return origin;
}
