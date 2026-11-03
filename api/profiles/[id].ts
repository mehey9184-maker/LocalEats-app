import {getStagingProfileServices,handleProfileItem} from "../../src/server/previewProfileApi.js";

// Account-specific read endpoint, verified against the bearer token's Firebase UID.
export default {
  async fetch(request:Request):Promise<Response>{
    const services=await getStagingProfileServices(process.env);
    return handleProfileItem(request,services);
  },
};
