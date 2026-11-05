import type {PickupOrder} from '../pickup/client';

type CancellationOrder=Pick<PickupOrder,'id'|'shop_id'|'user_id'|'delivery_type'|'status'|'revision'>;
type Command={command_id:string;expected_revision:number;reason:string};
type Options={
 identity:()=>string|undefined; enabled:()=>boolean;
 storage:Pick<Storage,'getItem'|'setItem'|'removeItem'>;
 command:(id:string,action:string,payload:Command,merchant:boolean,signal?:AbortSignal)=>Promise<{order?:PickupOrder}>;
 timeoutMs?:number;
};
export const pickupCancellationKey=(uid:string,id:string)=>`pickup-cancel:${uid}:${id}`;

export function createPickupCancellation(options:Options) {
 const running=new Map<string,Promise<PickupOrder>>();
 return async (order:CancellationOrder,reason:string):Promise<PickupOrder>=>{
  const uid=options.identity();
  if(!options.enabled())throw Error('Order changes are temporarily unavailable.');
  if(!uid || order.user_id!==uid || order.delivery_type!=='collection')throw Error('Sign in to the account that placed this pickup.');
  const key=pickupCancellationKey(uid,order.id);
  const inFlight=running.get(key);if(inFlight)return inFlight;
  const saved=options.storage.getItem(key);
  let body:Command;
  if(saved){
   body=JSON.parse(saved);
   if(!body || Object.keys(body).sort().join(',')!=='command_id,expected_revision,reason' ||
     typeof body.command_id!=='string' || !body.command_id || !Number.isSafeInteger(body.expected_revision) || body.expected_revision<0 || body.expected_revision>=Number.MAX_SAFE_INTEGER ||
     typeof body.reason!=='string' || !body.reason.trim() || body.reason.length>500)throw Error('The saved cancellation needs recovery. Refresh the order before trying again.');
  }else{
   if(order.status!=='pending' || !Number.isSafeInteger(order.revision) || order.revision<0 || order.revision>=Number.MAX_SAFE_INTEGER)throw Error('Refresh this order. Only pending pickups can be cancelled.');
   if(!reason.trim() || reason.trim().length>500)throw Error('Enter a cancellation reason of up to 500 characters.');
   body={command_id:crypto.randomUUID(),expected_revision:order.revision,reason:reason.trim()};
   options.storage.setItem(key,JSON.stringify(body));
  }
  const request=(async()=>{
   const controller=new AbortController();
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    const deadline=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{
     controller.abort();reject(Error('Cancellation response took too long. The outcome is unconfirmed. Retry the same cancellation or refresh.'));
    },options.timeoutMs??15000);});
    const result=await Promise.race([options.command(order.id,'cancel',body,false,controller.signal),deadline]);
    const confirmed=result.order;
    if(!confirmed || confirmed.id!==order.id || confirmed.shop_id!==order.shop_id || confirmed.user_id!==uid ||
      confirmed.delivery_type!=='collection' || confirmed.status!=='cancelled' || confirmed.revision!==body.expected_revision+1)
     throw Error('Cancellation was not confirmed. Retry the same cancellation or refresh the order.');
    options.storage.removeItem(key);
    return confirmed;
   }catch(error){
    const status=error && typeof error==='object' && 'status' in error ? Number(error.status) : 0;
    if([400,403,404,409,422].includes(status))options.storage.removeItem(key);
    throw error;
   }finally{clearTimeout(timer);}
  })().finally(()=>running.delete(key));
  running.set(key,request);return request;
 };
}
