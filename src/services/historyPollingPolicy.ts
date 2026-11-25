/** Unknown, incomplete or active order state always retains the fast reconciliation cadence. */
export const ACTIVE_HISTORY_MS=30_000;
export const IDLE_HISTORY_MS=120_000;
export function customerHistoryInterval(rows:ReadonlyArray<{status?:unknown}>|null,screen:string):number {
 if(screen==="order-history"||screen==="order-tracking"||screen==="checkout"||screen==="cart")return ACTIVE_HISTORY_MS;
 if(!rows || rows.length>=50 || rows.some(row=>!["collected","cancelled","completed","rejected","delivered"].includes(String(row.status))))return ACTIVE_HISTORY_MS;
 return IDLE_HISTORY_MS;
}

/** Shared runtime tick predicate; tests drive this exact branch with a virtual clock. */
export function shouldPollCustomerHistory(rows:ReadonlyArray<{status?:unknown}>|null,screen:string,lastStarted:number,now:number):boolean {
 const interval=customerHistoryInterval(rows,screen);
 return interval===ACTIVE_HISTORY_MS || now-lastStarted>=interval || now<lastStarted;
}
