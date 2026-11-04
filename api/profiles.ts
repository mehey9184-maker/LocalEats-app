import {getStagingProfileServices,handleProfileCollection} from "../src/server/previewProfileApi.js";

// Dedicated Vercel Node function. It NEVER imports the legacy Express server
// or its unsafe historical /api/orders routes.
export default {
  async fetch(request:Request):Promise<Response>{
    const services=await getStagingProfileServices(process.env);
    return handleProfileCollection(request,services);
  },
};
