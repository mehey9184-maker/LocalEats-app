import {buildCustomerProfilePatch,createCustomerProfileRecord,ProfilePolicyError,requireProfileOwner} from "../../profileApiPolicy.ts";

export type PreviewProfileRow=Record<string,unknown> & {user_id:string};
export type PreviewIdentity={uid:string;email?:string};
export type PreviewProfileServices={
  verifyFirebaseToken:(token:string)=>Promise<PreviewIdentity|null>;
  readProfile:(uid:string)=>Promise<PreviewProfileRow|null>;
  updateProfile:(uid:string,patch:Record<string,unknown>)=>Promise<PreviewProfileRow|null>;
  insertProfile:(row:Record<string,unknown>)=>Promise<PreviewProfileRow|null>;
};

const BRANCH="repair/customer-profile-p4-safe-api-preview-01";
const PRODUCTION_SUPABASE_REF="phdjumtqkooyppxozqsi";
const PRODUCTION_FIREBASE_PROJECT="localeats-5e26e";
const json=(status:number,body:Record<string,unknown>)=>Response.json(body,{
  status,
  headers:{"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"},
});

/**
 * A feature flag alone is insufficient: the deployment, branch, Firebase
 * project and Supabase project must all be a separate Preview identity.
 * Common production SUPABASE_* keys are never consulted.
 */
export function previewProfileEnabled(env:Record<string,string|undefined>):boolean {
  if(env.VERCEL_ENV!=="preview" || env.VERCEL_GIT_COMMIT_REF!==BRANCH ||
     env.PROFILE_P4_ENABLE_STAGING_WRITES!=="true")return false;
  const ref=env.PROFILE_P4_STAGING_SUPABASE_REF;
  const url=env.PROFILE_P4_STAGING_SUPABASE_URL;
  if(!ref || !/^[a-z0-9]{10,32}$/.test(ref) || ref===PRODUCTION_SUPABASE_REF ||
     !url || !env.PROFILE_P4_STAGING_SUPABASE_SECRET_KEY ||
     !env.PROFILE_P4_STAGING_FIREBASE_PROJECT_ID ||
     env.PROFILE_P4_STAGING_FIREBASE_PROJECT_ID===PRODUCTION_FIREBASE_PROJECT)return false;
  try {
    const parsed=new URL(url);
    if(parsed.protocol!=="https:" || parsed.username || parsed.password ||
       parsed.pathname!=="/" || parsed.search || parsed.hash || parsed.port)return false;
    return parsed.hostname===ref+".supabase.co";
  }catch{return false;}
}

/** The only place where server-side credentials may be read. */
export async function getStagingProfileServices(
  env:Record<string,string|undefined>,
):Promise<PreviewProfileServices|null>{
  if(!previewProfileEnabled(env))return null;
  const [{createClient},{getApps,initializeApp},{getAuth}]=await Promise.all([
    import("@supabase/supabase-js"),
    import("firebase-admin/app"),
    import("firebase-admin/auth"),
  ]);
  const adminApp=getApps().find(app=>app.name==="p4-profile-staging") ??
    initializeApp({projectId:env.PROFILE_P4_STAGING_FIREBASE_PROJECT_ID},"p4-profile-staging");
  const db=createClient(
    env.PROFILE_P4_STAGING_SUPABASE_URL!,
    env.PROFILE_P4_STAGING_SUPABASE_SECRET_KEY!,
    {auth:{autoRefreshToken:false,persistSession:false}},
  );
  return {
    verifyFirebaseToken:async(token)=>{
      const decoded=await getAuth(adminApp).verifyIdToken(token);
      return {uid:decoded.uid,email:decoded.email};
    },
    readProfile:async(uid)=>{
      const {data,error}=await db.from("profiles").select("*").eq("user_id",uid).maybeSingle();
      if(error)throw error;
      return data as PreviewProfileRow|null;
    },
    updateProfile:async(uid,patch)=>{
      const {data,error}=await db.from("profiles").update(patch).eq("user_id",uid).select("*").single();
      if(error)throw error;
      return data as PreviewProfileRow|null;
    },
    insertProfile:async(row)=>{
      const {data,error}=await db.from("profiles").insert(row).select("*").single();
      if(error)throw error;
      return data as PreviewProfileRow|null;
    },
  };
}

async function identityFromBearer(request:Request, services:PreviewProfileServices):Promise<PreviewIdentity|null>{
  const authorization=request.headers.get("authorization") ?? "";
  if(!authorization.startsWith("Bearer fb-"))return null;
  const token=authorization.slice("Bearer fb-".length);
  if(!token || token.length>8192 || /\s/.test(token))return null;
  try {
    const owner=await services.verifyFirebaseToken(token);
    return owner && typeof owner.uid==="string" && owner.uid.length>0 ? owner : null;
  }catch{return null;}
}

export async function handleProfileCollection(
  request:Request,services:PreviewProfileServices|null,
):Promise<Response>{
  if(request.method!=="POST")return json(405,{success:false,error:"Method not allowed"});
  if(!services)return json(503,{success:false,error:"Isolated Preview profile storage is not configured."});
  const identity=await identityFromBearer(request,services);
  if(!identity)return json(401,{success:false,error:"Valid Firebase authentication required."});
  if(!(request.headers.get("content-type")??"").toLowerCase().startsWith("application/json"))
    return json(415,{success:false,error:"JSON request required."});
  const length=Number(request.headers.get("content-length")||0);
  if(length>8192)return json(413,{success:false,error:"Profile payload too large."});
  const input=await request.text().catch(()=>null);
  if(input===null || input.length>8192)return json(413,{success:false,error:"Profile payload too large."});
  let body:unknown;
  try{body=JSON.parse(input);}catch{return json(400,{success:false,error:"Malformed JSON."});}
  try{
    const requested=body as Record<string,unknown>;
    const uid=requireProfileOwner(identity.uid,requested?.user_id??requested?.id);
    const patch=buildCustomerProfilePatch(body);
    const existing=await services.readProfile(uid);
    if(existing && existing.user_id!==uid)return json(403,{success:false,error:"Profile owner mismatch."});
    const updated={...patch,updated_at:new Date().toISOString()};
    const record=existing
      ? await services.updateProfile(uid,updated)
      : await services.insertProfile(createCustomerProfileRecord(uid,identity.email,updated));
    if(!record || record.user_id!==uid)return json(503,{success:false,error:"Profile update not confirmed."});
    return json(200,{success:true,profile:record});
  }catch(error){
    if(error instanceof ProfilePolicyError)return json(error.status,{success:false,error:error.message});
    // Never return underlying database errors or internal details to the client.
    return json(503,{success:false,error:"Profile storage did not confirm the update."});
  }
}

export async function handleProfileItem(request:Request,services:PreviewProfileServices|null):Promise<Response>{
  if(request.method!=="GET")return json(405,{error:"Method not allowed"});
  const path=new URL(request.url).pathname;
  const match=/^\/api\/profiles\/([^/]+)$/.exec(path);
  if(!match)return json(404,{error:"Profile endpoint not found."});
  let requestedId:string;
  try{requestedId=decodeURIComponent(match[1]);}catch{return json(400,{error:"Invalid account ID."});}
  if(requestedId.length>128 || requestedId.includes("/") || requestedId.includes("\0"))
    return json(400,{error:"Invalid account ID."});
  if(!services)return json(503,{error:"Isolated Preview profile storage is not configured."});
  const identity=await identityFromBearer(request,services);
  if(!identity)return json(401,{error:"Valid Firebase authentication required."});
  try{
    const uid=requireProfileOwner(identity.uid,requestedId);
    const record=await services.readProfile(uid);
    if(!record)return json(404,{error:"Profile not found."});
    if(record.user_id!==uid)return json(403,{error:"Profile owner mismatch."});
    return json(200,{profile:record});
  }catch(error){
    if(error instanceof ProfilePolicyError)return json(error.status,{error:error.message});
    return json(503,{error:"Unable to confirm profile from storage."});
  }
}
