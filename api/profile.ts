import {getProfile,putProfile} from "./_lib/profileServer.js";
/** Vercel Node.js function. Only Firebase-owner profile access is permitted.
 * The private server-only profile helper performs token verification first. */
export async function GET(request:Request):Promise<Response>{
  const id=new URL(request.url).searchParams.get("uid")??"";
  if(!id || id.length>128 || /[^a-zA-Z0-9:_-]/.test(id))
    return Response.json({success:false,error:"Invalid profile ID."},{status:400,headers:{"Cache-Control":"no-store"}});
  return getProfile(request,id);
}
export async function POST(request:Request):Promise<Response>{
  return putProfile(request);
}
