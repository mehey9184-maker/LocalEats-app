import {getProfile} from "../_lib/profileServer";
export async function GET(request:Request):Promise<Response>{
  let id="";
  try{id=decodeURIComponent(new URL(request.url).pathname.split("/").pop()??"");}
  catch{return Response.json({success:false,error:"Invalid profile ID."},{status:400,headers:{"Cache-Control":"no-store"}});}
  if(!id || id.length>128 || /[^a-zA-Z0-9:_-]/.test(id))
    return Response.json({success:false,error:"Invalid profile ID."},{status:400,headers:{"Cache-Control":"no-store"}});
  return getProfile(request,id);
}
