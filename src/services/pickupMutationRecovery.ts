// Only explicit, well-formed, action-specific contract rejections are terminal.
// Unknown gateway errors, conflicts over identity/intent, auth failures and
// transport failures do not prove the original mutation was not committed.
const createTerminal=new Set(["PRICE_CHANGED","SHOP_UNAVAILABLE","MENU_ITEM_UNAVAILABLE","SHOP_LOCATION_UNAVAILABLE"]);
const cancelTerminal=new Set(["ORDER_STATE_CHANGED","INVALID_ORDER_TRANSITION"]);
export function isDefinitivePickupRejection(error:unknown,action:"create"|"cancel"):boolean{
 if(!error || typeof error!=="object")return false;
 const e=error as {status?:unknown;code?:unknown;contractRejection?:unknown};
 return e.contractRejection===true && e.status===409 && typeof e.code==="string" &&
   (action==="create"?createTerminal:cancelTerminal).has(e.code);
}
export async function boundedPickupMutation<T>(request:(signal:AbortSignal)=>Promise<T>,timeoutMs=15000):Promise<T>{
 const controller=new AbortController();
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const deadline=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{
   const error=Error("The response took too long. The outcome is unconfirmed. Retry the same request.");
   controller.abort(error);reject(error);
  },timeoutMs);});
  return await Promise.race([request(controller.signal),deadline]);
 }finally{clearTimeout(timer);}
}
