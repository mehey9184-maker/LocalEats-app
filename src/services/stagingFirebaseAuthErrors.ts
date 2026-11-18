/**
 * Staging Firebase email/password login diagnostics.
 *
 * Firebase errors from the auth SDK MUST NOT be replaced with a generic
 * "invalid password" error: misconfigured staging API keys, disabled
 * email/password provider and network failures are different problems.
 * Never include account existence, email, password, ID token or provider
 * diagnostic JSON in user-visible errors.
 */
export type StagingLoginFailure = {
  code: string;
  message: string;
  category: "credentials"|"service"|"network"|"rate_limited"|"disabled"|"other";
};

export interface StagingLoginContext {
  origin: string;
  projectId?: string;
  configSource?: string;
  orderingEnabled?: string;
}
export function isVerifiedStagingLogin(c:StagingLoginContext):boolean {
  if(c.projectId!=="localeats-staging" || c.configSource!=="environment" ||
     c.orderingEnabled!=="false")return false;
  try{
    const u=new URL(c.origin);
    return u.protocol==="https:" && u.origin===c.origin &&
      /^localeats-customer-staging-r52d(?:-[a-z0-9-]+)?\.vercel\.app$/.test(u.hostname);
  }catch{return false;}
}

export function classifyStagingFirebaseLoginFailure(error:unknown):StagingLoginFailure {
  const e=error && typeof error==="object" ? error as {code?:unknown} : {};
  const code=typeof e.code==="string" && /^auth\/[a-z0-9-]{1,72}$/.test(e.code)
    ? e.code : "auth/unknown";
  const credentials=new Set(["auth/invalid-credential","auth/user-not-found",
    "auth/wrong-password","auth/invalid-email","auth/invalid-login-credentials"]);
  const service=new Set(["auth/operation-not-allowed","auth/api-key-not-valid",
    "auth/invalid-api-key","auth/app-not-authorized","auth/unauthorized-domain",
    "auth/configuration-not-found","auth/project-not-found","auth/invalid-tenant-id"]);
  const network=new Set(["auth/network-request-failed","auth/timeout"]);
  if(credentials.has(code))return {
    code,category:"credentials",
    message:"Email or password not recognized for the staging Customer app. Check the password used when creating this Firebase staging account."
  };
  if(service.has(code))return {
    code,category:"service",
    message:"Staging sign-in is not configured correctly. Check Firebase Authentication's Email/Password sign-in method and the staging web app configuration."
  };
  if(network.has(code))return {
    code,category:"network",
    message:"The staging Firebase sign-in service could not be reached. Check your network connection and try again."
  };
  if(code==="auth/too-many-requests")return {
    code,category:"rate_limited",
    message:"Too many sign-in attempts. Please wait before trying again."
  };
  if(code==="auth/user-disabled")return {
    code,category:"disabled",
    message:"This staging Firebase account is disabled. Check its status in Firebase Authentication."
  };
  // Unknown failures are kept generic. Exposing raw SDK text may leak fields
  // outside our control or confuse users into resetting an otherwise valid password.
  return {code,category:"other",message:"Unable to sign in with the staging Firebase service."};
}
