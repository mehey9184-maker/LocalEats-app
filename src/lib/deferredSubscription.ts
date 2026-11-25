// Synchronous cleanup handle even when the subscription implementation loads asynchronously.
export function startDeferredSubscription<T>(load:()=>Promise<T>,subscribe:(module:T)=>()=>void,isCurrent:()=>boolean,onError:()=>void=()=>{}):()=>void {
 let stopped=false;
 let unsubscribe:(()=>void)|undefined;
 void Promise.resolve().then(()=>{if(stopped||!isCurrent())return undefined;return load();}).then(module=>{
  if(module===undefined||stopped||!isCurrent())return;
  const cleanup=subscribe(module);
  if(stopped||!isCurrent())cleanup();else unsubscribe=cleanup;
 }).catch(()=>{if(!stopped&&isCurrent())onError();});
 return ()=>{if(stopped)return;stopped=true;unsubscribe?.();unsubscribe=undefined;};
}
