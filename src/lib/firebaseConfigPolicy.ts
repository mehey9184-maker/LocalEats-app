/**
 * R5.2: The normal Customer build retains legacy Firebase configuration behavior.
 * Explicit hosted staging opts into a complete environment-only configuration.
 * This is a safety check, NOT independent proof that Vercel credentials are isolated.
 */
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};
type Environment = Record<string, unknown>;

const setting = (env: Environment, key: string): string => {
  const value = env[key];
  return typeof value === "string" ? value.trim() : "";
};

export function resolveCustomerFirebaseConfig(
  env: Environment,
  bundled: Partial<FirebaseWebConfig> & { firestoreDatabaseId?: string },
): { config: FirebaseWebConfig; firestoreDatabaseId: string } {
  const environmentOnly = setting(env, "VITE_FIREBASE_CONFIG_SOURCE") === "environment";
  const required = {
    apiKey: setting(env, "VITE_FIREBASE_API_KEY"),
    authDomain: setting(env, "VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: setting(env, "VITE_FIREBASE_PROJECT_ID"),
    storageBucket: setting(env, "VITE_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: setting(env, "VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: setting(env, "VITE_FIREBASE_APP_ID"),
  };
  if (environmentOnly) {
    const databaseId = setting(env, "VITE_FIREBASE_FIRESTORE_DATABASE_ID");
    // Never let a staging build use bundled production Firebase values.
    const knownBundledProject = bundled.projectId?.trim() || "localeats-5e26e";
    if (Object.values(required).some(value => !value) || !databaseId ||
        required.projectId === knownBundledProject ||
        required.projectId === "localeats-5e26e") {
      throw new Error("R52_STAGING_FIREBASE_CONFIG_INVALID");
    }
    return { config: required, firestoreDatabaseId: databaseId };
  }
  // Legacy selection for unopted-in deployments: do not modify Production UI.
  return {
    config: {
      apiKey: required.apiKey || bundled.apiKey || "",
      authDomain: required.authDomain || bundled.authDomain || "localeats-5e26e.firebaseapp.com",
      projectId: required.projectId || bundled.projectId || "localeats-5e26e",
      storageBucket: required.storageBucket || bundled.storageBucket || "localeats-5e26e.firebasestorage.app",
      messagingSenderId: required.messagingSenderId || bundled.messagingSenderId || "281496568360",
      appId: required.appId || bundled.appId || "",
    },
    firestoreDatabaseId: setting(env, "VITE_FIREBASE_FIRESTORE_DATABASE_ID") ||
      bundled.firestoreDatabaseId || "(default)",
  };
}
