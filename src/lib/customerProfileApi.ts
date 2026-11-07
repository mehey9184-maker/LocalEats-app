export interface ProfileIdentity {
  uid: string;
  isAnonymous: boolean;
  getIdToken(): Promise<string>;
}
export interface CustomerProfileRecord extends Record<string, unknown> {
  user_id: string;
  updated_at: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  country?: string | null;
  photo_url?: string | null;
  language?: string | null;
  favorites?: string[];
  latitude?: number | null;
  longitude?: number | null;
}
export interface ProfileSnapshot {
  profile: CustomerProfileRecord | null;
  revision: string | null;
}
interface Options {
  baseUrl: string;
  production: boolean;
  currentUser(): ProfileIdentity | null;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}
interface RequestOptions { signal?: AbortSignal }
export class ProfileApiError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  constructor(message: string, code: string, status = 0, retryable = false) {
    super(message); this.name = 'ProfileApiError'; this.code = code; this.status = status; this.retryable = retryable;
  }
}
const invalid = () => new ProfileApiError('Account details could not be verified. Please retry.', 'PROFILE_UNCONFIRMED');
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (v: object, k: string) => Object.prototype.hasOwnProperty.call(v, k);
const textLimits: Record<string, number> = {fullName:120,phone:32,city:120,address:500,country:120,photo_url:2048,language:12};
const fieldNames = new Set([...Object.keys(textLimits),'favorites','latitude','longitude']);
export const validCustomerProfileRevision = (value: unknown): value is string => typeof value === 'string' && value.length <= 64 &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));

export function normalizeCustomerProfilePatch(raw: unknown): Record<string, unknown> {
  if (!object(raw) || Object.keys(raw).some(k => !fieldNames.has(k))) throw invalid();
  const result: Record<string, unknown> = {};
  for (const [key, max] of Object.entries(textLimits)) if (own(raw,key) && raw[key] !== undefined) {
    const value = raw[key];
    if (value !== null && (typeof value !== 'string' || value.length > max)) throw invalid();
    result[key] = typeof value === 'string' ? value.trim() || null : null;
  }
  if (own(result,'fullName') && (typeof result.fullName !== 'string' || result.fullName.length < 2)) throw invalid();
  if (typeof result.phone === 'string') {
    result.phone = result.phone.replace(/[\s()-]/g,'');
    if (!/^(?:\+27|0)[0-9]{9}$/.test(result.phone as string)) throw invalid();
  }
  if (result.photo_url) {
    try {
      const url = new URL(String(result.photo_url));
      if (url.protocol !== 'https:' || url.username || url.password || (url.hostname !== 'res.cloudinary.com' && !url.hostname.endsWith('.supabase.co'))) throw invalid();
    } catch { throw invalid(); }
  }
  if (raw.favorites !== undefined) {
    if (!Array.isArray(raw.favorites) || raw.favorites.length > 100 || raw.favorites.some(v => typeof v !== 'string' || !v || v.length > 128)) throw invalid();
    result.favorites = [...new Set(raw.favorites)];
  }
  if (raw.latitude !== undefined || raw.longitude !== undefined) {
    const lat=raw.latitude, lng=raw.longitude;
    if (!(lat===null && lng===null) && !(typeof lat==='number' && Number.isFinite(lat) && Math.abs(lat)<=90 && typeof lng==='number' && Number.isFinite(lng) && Math.abs(lng)<=180)) throw invalid();
    result.latitude=lat; result.longitude=lng;
  }
  if (!Object.keys(result).length) throw invalid();
  return result;
}

function snapshot(raw: unknown, uid: string, writing: boolean): ProfileSnapshot {
  if (!object(raw) || raw.success !== true) throw invalid();
  if (!writing && raw.profile === null && raw.revision === null) return {profile:null,revision:null};
  const row=raw.profile;
  if (!object(row) || row.user_id !== uid || !validCustomerProfileRevision(row.updated_at)) throw invalid();
  const revision = own(raw,'revision') ? raw.revision : writing ? undefined : row.updated_at;
  if (!validCustomerProfileRevision(revision) || revision !== row.updated_at) throw invalid();
  const profile: NonNullable<ProfileSnapshot['profile']> = {user_id:uid,updated_at:revision};
  for (const [key,max] of Object.entries({...textLimits,email:320})) if (own(row,key)) {
    const value=row[key];
    if (value !== null && (typeof value !== 'string' || value.length>max)) throw invalid();
    profile[key]=value as string | null;
  }
  if (own(row,'favorites')) {
    if (!Array.isArray(row.favorites) || row.favorites.length>100 || row.favorites.some(v=>typeof v!=='string' || !v || v.length>128)) throw invalid();
    profile.favorites=[...row.favorites];
  }
  for (const [key,max] of [['latitude',90],['longitude',180]] as const) if (own(row,key)) {
    const value=row[key];
    if (value!==null && (typeof value!=='number' || !Number.isFinite(value) || Math.abs(value)>max)) throw invalid();
    profile[key]=value as number | null;
  }
  // Unknown fields, especially authorization roles, never enter customer state.
  return {profile,revision};
}

export function createProfileApiClient(options: Options) {
  function endpoint() {
    const base=options.baseUrl.trim().replace(/\/$/,'');
    if (!base && !options.production) return '/api/v1/profiles/me';
    try {
      const url=new URL(base);
      const local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
      if (url.username || url.password || url.search || url.hash || url.pathname!=='/' ||
        (url.protocol!=='https:' && (options.production || url.protocol!=='http:' || !local))) throw invalid();
      return url.origin+'/api/v1/profiles/me';
    } catch { throw new ProfileApiError('The account service is not configured. Please try again later.','PROFILE_CONFIG'); }
  }
  async function request(uid: string, body: {profile:Record<string,unknown>;expectedRevision:string|null}|undefined, requestOptions:RequestOptions={}):Promise<ProfileSnapshot> {
    const identity=options.currentUser();
    const current=()=>typeof uid==='string' && uid.length>0 && uid.length<=128 && options.currentUser()===identity && !!identity && !identity.isAnonymous && identity.uid===uid;
    if (!current()) throw new ProfileApiError('Sign in with your registered account to access these details.','PROFILE_ACCOUNT_REQUIRED',401);
    const url=endpoint(), controller=new AbortController();
    let timer:ReturnType<typeof setTimeout> | undefined;
    let cancel=()=>{};
    const interrupted=new Promise<never>((_,reject)=>{
      const stop=(error:ProfileApiError)=>{controller.abort(error);reject(error);};
      timer=setTimeout(()=>stop(new ProfileApiError('Account details could not be confirmed in time. Please retry.','PROFILE_TIMEOUT',504,true)),options.timeoutMs??15000);
      cancel=()=>stop(new ProfileApiError('Account request cancelled.','PROFILE_CANCELLED'));
      requestOptions.signal?.addEventListener('abort',cancel,{once:true});
      if(requestOptions.signal?.aborted)cancel();
    });
    const guard=()=>{controller.signal.throwIfAborted();if(!current())throw new ProfileApiError('Your account changed. Sign in again before saving.','PROFILE_ACCOUNT_CHANGED',401);};
    try {
      const operation=async()=>{
        guard(); const token=await identity!.getIdToken(); guard();
        if(!token)throw new ProfileApiError('Sign in again to access your account details.','PROFILE_ACCOUNT_REQUIRED',401);
        const response=await (options.fetch??globalThis.fetch)(url,{method:body?'PATCH':'GET',headers:{Authorization:`Bearer fb-${token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal,cache:'no-store',redirect:'error'});
        guard();
        if (!/^\s*application\/json\s*(?:;|$)/i.test(response.headers.get('Content-Type')||'') || Number(response.headers.get('Content-Length')||0)>65536) throw invalid();
        const data=await response.json(); guard();
        if(!body && response.status===404 && object(data) && data.code==='PROFILE_NOT_FOUND')return{profile:null,revision:null};
        if(response.status<200 || response.status>=300){
          const conflict=response.status===409;
          throw new ProfileApiError(conflict?'Your details changed in another session. Reload them before saving again.':'Account details could not be confirmed. Please retry.',conflict?'PROFILE_CONFLICT':'PROFILE_REQUEST_FAILED',response.status,response.status>=500||response.status===429);
        }
        const result=snapshot(data,uid,!!body);
        if(body && (!result.profile || Object.keys(body.profile).some(key=>JSON.stringify(result.profile![key])!==JSON.stringify(body.profile[key]))))throw invalid();
        return result;
      };
      return await Promise.race([operation(),interrupted]);
    }catch(error){
      if(error instanceof ProfileApiError)throw error;
      if(controller.signal.aborted && controller.signal.reason instanceof ProfileApiError)throw controller.signal.reason;
      throw new ProfileApiError('Account details could not be confirmed. Check your connection and retry.','PROFILE_NETWORK',0,true);
    }finally{
      if(timer)clearTimeout(timer);requestOptions.signal?.removeEventListener('abort',cancel);controller.abort();
    }
  }
  return {
    read:(uid:string,opts?:RequestOptions)=>request(uid,undefined,opts),
    save:async(uid:string,patch:unknown,expectedRevision:string|null,opts?:RequestOptions)=>{
      // Capture request identity before this call yields. A promise trampoline
      // here could silently adopt a new same-UID login for an older save.
      if(expectedRevision!==null && !validCustomerProfileRevision(expectedRevision))throw invalid();
      return request(uid,{profile:normalizeCustomerProfilePatch(patch),expectedRevision},opts);
    },
  };
}
