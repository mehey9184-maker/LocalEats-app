
import { auth } from "./firebase";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updatePassword, 
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification
} from "firebase/auth";

export const DEFAULT_URL = 'https://qnwjkwlhmreenqotufvw.supabase.co';
export const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabaseUrl = DEFAULT_URL;
export const supabaseAnonKey = DEFAULT_KEY;
export const APP_URL = typeof window !== 'undefined' ? window.location.origin : '';

export function saveCustomSupabaseConfig() {}
export function resetToDefaultSupabaseConfig() {}
export const isCustomSupabaseConfigured = false;

// Format firebase user to supabase session format
const formatSession = async (user) => {
  if (!user) return null;
  return {
    user: {
      id: user.uid,
      email: user.email,
      user_metadata: {
        full_name: user.displayName || '',
      }
    },
    access_token: await user.getIdToken()
  };
};

let authStateListeners = [];
if (typeof window !== 'undefined') {
  let observedInitialState = false;
  onAuthStateChanged(auth, async (user) => {
    // Firebase's first notification is restored state, even for a guest.
    const event = !observedInitialState ? 'INITIAL_SESSION' : user ? 'SIGNED_IN' : 'SIGNED_OUT';
    observedInitialState = true;
    const session = await formatSession(user);
    if (auth.currentUser !== user) return;
    authStateListeners.forEach(listener => listener(event, session));
  });
}

const createChain = (): any => {
  // This is an offline compatibility facade, not a database client.
  // A fresh chain per call prevents write errors leaking into unrelated reads.
  let unsupportedWrite = false;
  const result = (single = false) => unsupportedWrite
    ? { data: null, error: { code: "LEGACY_PERSISTENCE_UNAVAILABLE", message: "This operation requires the verified LocalEats API. No changes were saved." } }
    : { data: single ? null : [], error: null };
  const write = (..._args: any[]) => { unsupportedWrite = true; return chain; };
  const chain: any = {
    select: (..._args: any[]) => chain,
    insert: write,
    upsert: write,
    update: write,
    delete: write,
    eq: (..._args: any[]) => chain,
    neq: (..._args: any[]) => chain,
    gt: (..._args: any[]) => chain,
    gte: (..._args: any[]) => chain,
    lt: (..._args: any[]) => chain,
    lte: (..._args: any[]) => chain,
    in: (..._args: any[]) => chain,
    is: (..._args: any[]) => chain,
    or: (..._args: any[]) => chain,
    match: (..._args: any[]) => chain,
    order: (..._args: any[]) => chain,
    limit: (..._args: any[]) => chain,
    range: (..._args: any[]) => chain,
    single: async () => result(true),
    maybeSingle: async () => result(true),
    then: function(resolve: any, reject?: any) {
      return Promise.resolve(result()).then(resolve, reject);
    },
    catch: function(reject: any) {
      return Promise.resolve(result()).catch(reject);
    },
    finally: function(callback: any) {
      return Promise.resolve(result()).finally(callback);
    }
  };
  return chain;
};

export const supabase: any = {
  auth: {
    signUp: async ({ email, password, options }) => {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fullName = options?.data?.full_name || options?.data?.fullName || '';
        if (fullName) {
          await updateProfile(userCredential.user, { displayName: fullName }).catch(() => {});
        }
        // Firebase email/password registration immediately creates a signed-in
        // Firebase user. Verification is a separate message, not an account.
        // If email dispatch fails, the account still exists: report the truth
        // instead of making a retry create an accidental duplicate account.
        let verificationEmailSent = false;
        try {
          await sendEmailVerification(userCredential.user);
          verificationEmailSent = true;
        } catch (_verificationError) {
          // Avoid leaking Firebase details or an email address in the console.
          // The success screen must not claim email was delivered.
        }
        return { data: {
          user: { id: userCredential.user.uid, email: userCredential.user.email },
          verificationEmailSent
        }, error: null };
      } catch (e) {
        return { data: { user: null }, error: { message: e.message } };
      }
    },
    signInWithPassword: async ({ email, password }) => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const session = await formatSession(userCredential.user);
        return { data: { session, user: session.user }, error: null };
      } catch (e) {
        let msg = "Invalid email or password";
        if (e.code === 'auth/user-not-found') msg = "Invalid login credentials";
        if (e.code === 'auth/wrong-password') msg = "Invalid login credentials";
        return { data: { session: null, user: null }, error: { message: msg } };
      }
    },
    signInWithOAuth: async ({ provider }) => {
      try {
        if (provider === 'google') {
          const result = await signInWithPopup(auth, new GoogleAuthProvider());
          const session = await formatSession(result.user);
          return { data: { provider, url: null, session }, error: null };
        }
        return { data: null, error: { message: "OAuth provider not supported" } };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    signOut: async () => {
      try {
        await signOut(auth);
        return { error: null };
      } catch (e) {
        return { error: { message: e.message } };
      }
    },
    resetPasswordForEmail: async (email) => {
      try {
        await sendPasswordResetEmail(auth, email);
        return { error: null };
      } catch (e) {
        return { error: { message: e.message } };
      }
    },
    updateUser: async ({ password }) => {
      try {
        if (auth.currentUser && password) {
          await updatePassword(auth.currentUser, password);
        }
        return { data: { user: auth.currentUser }, error: null };
      } catch (e) {
        return { data: null, error: { message: e.message } };
      }
    },
    getSession: async () => {
      // Firebase persists sessions asynchronously (usually in IndexedDB).
      // Reading currentUser before authStateReady can falsely report a signed-out
      // user and cause the splash page to flash on every reload.
      await auth.authStateReady();
      const session = await formatSession(auth.currentUser);
      return { data: { session }, error: null };
    },
    getUser: async () => {
      await auth.authStateReady();
      const user = auth.currentUser;
      if (!user) return { data: { user: null }, error: null };
      const session = await formatSession(user);
      return { data: { user: session.user }, error: null };
    },
    onAuthStateChange: (listener) => {
      let active = true;
      authStateListeners.push(listener);
      // Do not emit a misleading INITIAL_SESSION(null) while Firebase is still
      // restoring a valid user from persistence. Respect unsubscribed listeners.
      void auth.authStateReady().then(() => formatSession(auth.currentUser)).then(session => {
        if (active) listener('INITIAL_SESSION', session);
      }).catch(() => {
        // The App handles restoration failures without treating them as logout.
      });
      return { data: { subscription: { unsubscribe: () => {
        active = false;
        authStateListeners = authStateListeners.filter(l => l !== listener);
      } } } };
    }
  },
  from: (_table) => createChain(),
  rpc: async () => ({ data: null, error: { message: "Failed to fetch (offline)" } }),
  channel: () => ({
    on: () => ({ subscribe: () => {} }),
    subscribe: () => {},
    unsubscribe: () => {}
  }),
  getChannels: () => [],
  removeChannel: () => {}
};

export function getFreshChannel(channelName) {
  return supabase.channel();
}

export async function getResilientSession(timeoutMs = 3000) {
  return supabase.auth.getSession();
}
