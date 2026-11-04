// One installation identifier per signed-in account; the token is held only
// by the authenticated pickup API, never in browser storage.
export function pickupInstallationId(userId:string,storage:Pick<Storage,"getItem"|"setItem">=localStorage):string {
 if(!userId)throw new Error("A signed-in account is required.");
 const key=`localeats-pickup-push-installation:${userId}`;
 const existing=storage.getItem(key);
 if(existing && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(existing))return existing;
 const id=crypto.randomUUID();
 storage.setItem(key,id);
 return id;
}
export function existingPickupInstallationId(userId:string,storage:Pick<Storage,"getItem">=localStorage):string|null {
 if(!userId)return null;
 const value=storage.getItem(`localeats-pickup-push-installation:${userId}`);
 return value && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)?value:null;
}
