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

const rawSetting = (env: Environment, key: string): string => {
  const value = env[key];
  return typeof value === "string" ? value : "";
};
const setting = (env: Environment, key: string): string => rawSetting(env, key).trim();

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
    // Hosted Firebase demo-* project IDs are emulator-only: they have no
    // live Auth/Firestore service and must never pass hosted staging preflight.
    // Reject a single mixed-in bundled Production field, not just projectId.
    const knownBundledProject = bundled.projectId?.trim() || "localeats-5e26e";
    const mixesBundledValues = (Object.keys(required) as (keyof FirebaseWebConfig)[])
      .some(key => Boolean(bundled[key]?.trim()) && required[key] === bundled[key]?.trim());
    if (Object.values(required).some(value => !value) || !databaseId ||
        required.projectId.startsWith("demo-") ||
        required.projectId === knownBundledProject ||
        required.projectId === "localeats-5e26e" ||
        mixesBundledValues) {
      throw new Error("R52_STAGING_FIREBASE_CONFIG_INVALID");
    }
    return { config: required, firestoreDatabaseId: databaseId };
  }
  // Preserve the exact pre-R5.2 environment-first/fallback selection for normal builds.
  return {
    config: {
      apiKey: rawSetting(env, "VITE_FIREBASE_API_KEY") || bundled.apiKey || "",
      authDomain: rawSetting(env, "VITE_FIREBASE_AUTH_DOMAIN") || bundled.authDomain || "localeats-5e26e.firebaseapp.com",
      projectId: rawSetting(env, "VITE_FIREBASE_PROJECT_ID") || bundled.projectId || "localeats-5e26e",
      storageBucket: rawSetting(env, "VITE_FIREBASE_STORAGE_BUCKET") || bundled.storageBucket || "localeats-5e26e.firebasestorage.app",
      messagingSenderId: rawSetting(env, "VITE_FIREBASE_MESSAGING_SENDER_ID") || bundled.messagingSenderId || "281496568360",
      appId: rawSetting(env, "VITE_FIREBASE_APP_ID") || bundled.appId || "",
    },
    firestoreDatabaseId: rawSetting(env, "VITE_FIREBASE_FIRESTORE_DATABASE_ID") ||
      bundled.firestoreDatabaseId || "(default)",
  };
}
