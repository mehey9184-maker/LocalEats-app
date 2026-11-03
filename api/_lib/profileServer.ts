import {cert,getApps,initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {createClient} from "@supabase/supabase-js";
import {normalizeProfileInput,ownerMatches,ProfileInputError} from "./profilePolicy.js";

const headers:Record<string,string>={
  "Cache-Control":"no-store",
  "Content-Type":"application/json; charset=utf-8",
  "X-Content-Type-Options":"nosniff",
  "Vary":"Authorization",
};
function json(status:number,body:Record<string,unknown>):Response {
  return Response.json(body,{status,headers});
}
function unavailable():Response {
  return json(503,{success:false,error:"Profile service is temporarily unavailable."});
}
type Authenticated={uid:string;email?:string};
async function verifiedUser(request:Request):Promise<Authenticated|Response>{
  const raw=request.headers.get("authorization")??"";
  const match=/^Bearer fb-([A-Za-z0-9_\-.]+)$/.exec(raw);
  if(!match)return json(401,{success:false,error:"Sign in again to access your profile."});
  // Fail closed without server-only credentials; never permit a browser secret.
  const projectId=process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const email=process.env.FIREBASE_CLIENT_EMAIL;
  const key=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n");
  if(!projectId || !email || !key)return unavailable();
  try{
    if(!getApps().length)initializeApp({credential:cert({
      projectId,clientEmail:email,privateKey:key,
    })});
    const decoded=await getAuth().verifyIdToken(match[1],true);
    if(!decoded.uid || decoded.firebase?.sign_in_provider==="anonymous")
      return json(401,{success:false,error:"A signed-in account is required."});
    return {uid:decoded.uid,email:decoded.email};
  }catch{
    return json(401,{success:false,error:"Your sign-in has expired. Please sign in again."});
  }
}
function database(){
  const url=process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ||
     !serviceRole)return null;
  return createClient(url,serviceRole,{
    auth:{persistSession:false,autoRefreshToken:false},
  });
}
function isResponse(o:Authenticated|Response):o is Response{
  return o instanceof Response;
}
export async function getProfile(request:Request,id:string):Promise<Response>{
  const signed=await verifiedUser(request);
  if(isResponse(signed))return signed;
  if(!ownerMatches(id,signed.uid))return json(403,{
    success:false,error:"You cannot read another account's profile.",
  });
  const db=database();
  if(!db)return unavailable();
  try{
    const {data,error}=await db.from("profiles")
      .select("user_id,fullName,email,phone,city,address,country,photo_url,language,favorites,latitude,longitude")
      .eq("user_id",signed.uid).maybeSingle();
    if(error)return unavailable();
    if(!data)return json(404,{success:false,error:"Profile not found."});
    return json(200,{success:true,profile:data});
  }catch{
    return unavailable();
  }
}
export async function putProfile(request:Request):Promise<Response>{
  if(request.headers.get("content-type")?.split(";")[0].trim()!=="application/json")
    return json(415,{success:false,error:"Send JSON to update your profile."});
  const signed=await verifiedUser(request);
  if(isResponse(signed))return signed;
  const db=database();
  if(!db)return unavailable();
  // Never accidentally switch on writes when deploying a Preview.
  // Deliberate Production activation and own-account acceptance are separate gates.
  if(process.env.PROFILE_API_WRITES_ENABLED!=="true")
    return json(503,{success:false,error:"Profile saving has not been activated."});
  try{
    if(Number(request.headers.get("content-length")||0)>16384)
      return json(413,{success:false,error:"Profile update is too large."});
    const raw=await request.text();
    if(raw.length>16384)return json(413,{success:false,error:"Profile update is too large."});
    const input=normalizeProfileInput(JSON.parse(raw),signed.uid,signed.email);
    const {data,error}=await db.from("profiles")
      .upsert({...input,updated_at:new Date().toISOString()},{onConflict:"user_id"})
      .select("user_id,fullName,email,phone,city,address,country,photo_url,language,favorites,latitude,longitude")
      .single();
    if(error||!data||data.user_id!==signed.uid)return unavailable();
    return json(200,{success:true,profile:data});
  }catch(e){
    if(e instanceof ProfileInputError || e instanceof SyntaxError)
      return json(400,{success:false,error:"Invalid profile update."});
    return unavailable();
  }
}
