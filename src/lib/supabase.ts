
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
  signInWithPopup
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
  onAuthStateChanged(auth, async (user) => {
    const session = await formatSession(user);
    const event = user ? 'SIGNED_IN' : 'SIGNED_OUT';
    authStateListeners.forEach(listener => listener(event, session));
  });
}

const createChain = (): any => {
  const chain: any = {
    select: (..._args: any[]) => chain,
    insert: (..._args: any[]) => chain,
    upsert: (..._args: any[]) => chain,
    update: (..._args: any[]) => chain,
    delete: (..._args: any[]) => chain,
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
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: function(resolve: any, reject?: any) {
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
    catch: function(reject: any) {
      return Promise.resolve({ data: [], error: null }).catch(reject);
    },
    finally: function(callback: any) {
      return Promise.resolve({ data: [], error: null }).finally(callback);
    }
  };
  return chain;
};
const mockDbChain: any = createChain();

export const supabase: any = {
  auth: {
    signUp: async ({ email, password, options }) => {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fullName = options?.data?.full_name || options?.data?.fullName || '';
        if (fullName) {
          await updateProfile(userCredential.user, { displayName: fullName }).catch(() => {});
        }
        return { data: { user: { id: userCredential.user.uid, email: userCredential.user.email } }, error: null };
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
      const user = auth.currentUser;
      const session = await formatSession(user);
      return { data: { session }, error: null };
    },
    getUser: async () => {
      const user = auth.currentUser;
      if (!user) return { data: { user: null }, error: null };
      const session = await formatSession(user);
      return { data: { user: session.user }, error: null };
    },
    onAuthStateChange: (listener) => {
      authStateListeners.push(listener);
      // Immediately call with current state
      formatSession(auth.currentUser).then(session => {
         listener('INITIAL_SESSION', session);
      });
      return { data: { subscription: { unsubscribe: () => {
        authStateListeners = authStateListeners.filter(l => l !== listener);
      } } } };
    }
  },
  from: (table) => mockDbChain,
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
