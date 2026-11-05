/** A local cache or generic HTTP success does not prove a profile was saved. */
export interface ConfirmedProfileSave {
  success:true;
  profile:{user_id:string;[key:string]:unknown};
}
export function isConfirmedProfileSave(status:number,contentType:string,payload:unknown,expectedUid:string):payload is ConfirmedProfileSave {
  if(!expectedUid || status<200 || status>=300 ||
    !/^\s*application\/json\s*(?:;|$)/i.test(contentType))return false;
  if(!payload || typeof payload!=="object" || Array.isArray(payload))return false;
  const result=payload as Record<string,unknown>;
  if(result.success!==true || !result.profile || typeof result.profile!=="object" || Array.isArray(result.profile))return false;
  return (result.profile as Record<string,unknown>).user_id===expectedUid;
}
