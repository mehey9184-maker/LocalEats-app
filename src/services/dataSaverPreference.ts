/** Device/data preference with explicit customer choice taking priority.
 * Browsers with Save-Data enabled default to the low-data view on first use;
 * an explicit OFF choice is respected. Never read browser connection speed
 * or send anything about the device to the API.
 */
export const DATA_SAVER_CHANGE_EVENT="localeats:data-saver-change";

export function resolveDataSaverPreference(saved:string|null,saveData:boolean):boolean{
  if(saved==="true")return true;
  if(saved==="false")return false;
  return saveData===true;
}

export function readDataSaverEnabled():boolean{
  if(typeof window==="undefined")return false;
  let saved:string|null=null;
  try{saved=window.localStorage.getItem("data_saver_enabled");}catch{/* private mode */}
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean}})?.connection;
  return resolveDataSaverPreference(saved,connection?.saveData===true);
}
