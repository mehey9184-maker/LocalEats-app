import type {RequestHandler} from "express";
// Mounted before legacy handlers: even their database/memory fallbacks are unreachable.
export const legacyOrderGuard:RequestHandler=(req,res,next)=>{
 if(["POST","PUT","PATCH","DELETE"].includes(req.method) && /^\/api\/(?:v1\/)?orders(?:\/|$)/i.test(req.path)){
  res.status(426).set("Cache-Control","no-store").json({success:false,code:"PICKUP_CONTRACT_REQUIRED",
   error:"Update required. Use the pickup ordering app."});return;
 }
 next();
};
