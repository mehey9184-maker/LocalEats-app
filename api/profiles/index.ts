import {putProfile} from "../_lib/profileServer";
// Same-origin Client App serverless route. Only Firebase-authenticated owners
// can submit profile fields; disabled until server credentials and write gate are ready.
export async function POST(request:Request):Promise<Response>{
  return putProfile(request);
}
