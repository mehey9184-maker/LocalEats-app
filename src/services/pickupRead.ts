export async function readPickupWithDeadline<T>(
 request:(signal:AbortSignal)=>Promise<T>,
 options:{timeoutMs?:number;signal?:AbortSignal}={},
):Promise<T>{
 const controller=new AbortController();
 let timer:ReturnType<typeof setTimeout>|undefined;
 let rejectAborted:(reason:Error)=>void=()=>{};
 const aborted=new Promise<never>((_resolve,reject)=>{rejectAborted=reject;});
 const abort=()=>{controller.abort();rejectAborted(Error('Pickup status request cancelled.'));};
 if(options.signal?.aborted)throw Error('Pickup status request cancelled.');
 options.signal?.addEventListener('abort',abort,{once:true});
 try{
  const deadline=new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>{
   controller.abort();reject(Error('Pickup status took too long. Retry to get the latest status.'));
  },options.timeoutMs??15000);});
  return await Promise.race([request(controller.signal),deadline,aborted]);
 }finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
}
