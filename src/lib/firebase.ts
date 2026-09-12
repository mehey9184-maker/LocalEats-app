import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs, writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  DocumentData,
  QueryConstraint,
  Unsubscribe
} from "firebase/firestore";
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { getFunctions, httpsCallable, Functions, HttpsCallableResult } from "firebase/functions";
import firebaseConfigJson from "../../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain || "localeats-5e26e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || "localeats-5e26e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket || "localeats-5e26e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId || "281496568360",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId || "",
};

export const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || "(default)";

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Lazily initializes and returns Firebase App
 */
export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    if (!getApps().length) {
      try {
        appInstance = initializeApp(firebaseConfig);
      } catch (err) {
        console.warn("[Firebase] Init error, retrieving default app:", err);
        appInstance = getApp();
      }
    } else {
      appInstance = getApp();
    }
  }
  return appInstance;
}

/**
 * Returns the Firestore instance configured with the applet's database
 */
export function getFirebaseFirestore(): Firestore {
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    try {
      firestoreInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, firestoreDatabaseId);
    } catch (e) {
      console.warn("[Firestore] Custom DB init fallback:", e);
      try {
        firestoreInstance = getFirestore(app);
      } catch (e2) {
        firestoreInstance = initializeFirestore(app, {
          experimentalForceLongPolling: true,
        });
      }
    }
  }
  return firestoreInstance;
}

export const db: Firestore = getFirebaseFirestore();

/**
 * Returns the Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const auth: Auth = getFirebaseAuth();

let functionsInstance: Functions | null = null;

/**
 * Returns the Firebase Functions instance
 */
export function getFirebaseFunctions(): Functions {
  if (!functionsInstance) {
    const app = getFirebaseApp();
    functionsInstance = getFunctions(app);
  }
  return functionsInstance;
}

export const functions: Functions = getFirebaseFunctions();

export interface CreateOrderItemInput {
  menu_item_id: string;
  quantity: number;
  variant_id?: string;
  notes?: string;
}

export interface CreateOrderRequestData {
  idempotency_key: string;
  shop_id: string | number;
  items: CreateOrderItemInput[];
  delivery_type: "delivery" | "collection";
  delivery_schedule_mode: "standard";
  delivery_coordinates?: {
    lat: number;
    lng: number;
  };
  tip_amount: number;
  payment_method: "cash" | "card_machine" | "cash_on_arrival";
  customer_details: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    delivery_instructions?: string;
  };
}

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  discount_amount: number;
  tip_amount: number;
  total_price: number;
  status: string;
  delivery_status: string;
  delivery_confirmation?: {
    pin: string;
    qr_token: string;
  };
  message?: string;
}

/**
 * Ensures a valid Firebase Auth user exists (either active user or anonymous guest user).
 * Does not create duplicate anonymous sessions if already signed in.
 */
export async function ensureAnonymousAuth(): Promise<FirebaseUser> {
  const currentAuth = getFirebaseAuth();
  if (currentAuth.currentUser) {
    return currentAuth.currentUser;
  }
  const credential = await signInAnonymously(currentAuth);
  return credential.user;
}

// Re-export common Firestore and Functions utilities
export {
  signInAnonymously,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  httpsCallable,
};
export type { DocumentData, QueryConstraint, Unsubscribe, FirebaseUser, Functions, HttpsCallableResult };

/**
 * Firestore Service Helpers for LocalEats
 */

export const FirestoreService = {
  async healthCheck(): Promise<boolean> {
    try {
      const q = query(collection(db, "shops"), limit(1));
      await getDocs(q);
      return true;
    } catch (e) {
      console.warn("[FirestoreService] healthCheck notice:", e);
      return false;
    }
  },

  async addReview(shopId: string, reviewData: any): Promise<void> {
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'reviews'), {
        shop_id: String(shopId),
        ...reviewData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("[FirestoreService] addReview notice:", e);
      throw e;
    }
  },
  
  async getReviewsForShop(shopId: string, limitCount = 50): Promise<any[]> {
    try {
      const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
      // Efficient bounded query to prevent full collection reads
      const q = query(
        collection(db, 'reviews'), 
        where('shop_id', '==', String(shopId)),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("[FirestoreService] getReviewsForShop notice:", e);
      // Fallback to basic query if index is missing
      try {
        const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
        const fallbackQ = query(collection(db, 'reviews'), where('shop_id', '==', String(shopId)), limit(limitCount));
        const snap = await getDocs(fallbackQ);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (fallbackErr) {
        console.info("[FirestoreService] getReviewsForShop fallback gracefully caught:", fallbackErr?.message || fallbackErr);
        return [];
      }
    }
  },

  async followShop(userId: string, shopId: string): Promise<void> {
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const followId = `${userId}_${shopId}`;
      await setDoc(doc(db, 'follows', followId), {
        user_id: String(userId),
        shop_id: String(shopId),
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("[FirestoreService] followShop notice:", e);
      throw e;
    }
  },

  async unfollowShop(userId: string, shopId: string): Promise<void> {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const followId = `${userId}_${shopId}`;
      await deleteDoc(doc(db, 'follows', followId));
    } catch (e) {
      console.warn("[FirestoreService] unfollowShop notice:", e);
      throw e;
    }
  },

  async getFollowedShops(userId: string): Promise<any[]> {
    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const q = query(collection(db, 'follows'), where('user_id', '==', String(userId)));
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.warn("[FirestoreService] getFollowedShops notice:", e);
      return [];
    }
  },

  async submitContactMessage(messageData: any): Promise<void> {
    try {
      const { collection, addDoc } = await import('firebase/firestore');
      await addDoc(collection(db, 'contact_messages'), {
        ...messageData,
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("[FirestoreService] submitContactMessage notice:", e);
      throw e;
    }
  },

  // Orders
  async createAuthoritativeOrder(requestData: CreateOrderRequestData): Promise<CreateOrderResponse> {
    try {
      const { getApiAuthHeaders } = await import('./apiAuth');
      const headers = await getApiAuthHeaders();
      const apiUrl = import.meta.env.VITE_LOCALEATS_API_URL?.replace(/\/$/, '');
      if (!apiUrl) {
        throw new Error('LocalEats order service is not configured. No order was placed.');
      }
      const response = await fetch(`${apiUrl}/api/v1/orders`, {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(requestData)
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('LocalEats order service returned an invalid response. No order was placed.');
      }
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('LocalEats order service returned an invalid response. No order was placed.');
      }
      const payload = data as Record<string, any>;
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'Failed to create order. No order was placed.');
      }
      const order = payload.order;
      if (!payload.success || !order || typeof order !== 'object' || typeof order.id !== 'string' || !order.id) {
        throw new Error('The database did not confirm an order ID. No order was placed.');
      }
      const money = (value: unknown, field: string): number => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          throw new Error(`The order service returned an invalid ${field}. No order was placed.`);
        }
        return parsed;
      };
      const rawConfirmation = payload.delivery_confirmation;
      const deliveryConfirmation = rawConfirmation &&
        typeof rawConfirmation === 'object' &&
        typeof rawConfirmation.pin === 'string' &&
        /^\d{4}$/.test(rawConfirmation.pin) &&
        typeof rawConfirmation.qr_token === 'string' &&
        /^le_[0-9a-f]{64}$/.test(rawConfirmation.qr_token)
          ? { pin: rawConfirmation.pin, qr_token: rawConfirmation.qr_token }
          : undefined;
      return {
        success: true,
        order_id: order.id,
        subtotal: money(order.price, 'subtotal'),
        delivery_fee: money(order.delivery_fee, 'delivery fee'),
        service_fee: money(order.service_fee, 'service fee'),
        discount_amount: money(order.discount_amount, 'discount'),
        tip_amount: money(order.tip_amount, 'tip'),
        total_price: money(order.total_price, 'total'),
        status: typeof order.status === 'string' ? order.status : 'pending',
        delivery_status: typeof order.delivery_status === 'string' ? order.delivery_status : 'none',
        delivery_confirmation: deliveryConfirmation,
      };
    } catch (e: any) {
      console.error("[FirestoreService] createAuthoritativeOrder failed:", e);
      throw e;
    }
  },

  async getAuthoritativeOrders(): Promise<any[]> {
    const { getApiAuthHeaders } = await import('./apiAuth');
    const headers = await getApiAuthHeaders();
    const apiUrl = import.meta.env.VITE_LOCALEATS_API_URL?.replace(/\/$/, '');
    if (!apiUrl) throw new Error('LocalEats order service is not configured.');
    const response = await fetch(`${apiUrl}/api/v1/orders`, { headers });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || !Array.isArray(payload.orders)) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Orders could not be loaded.');
    }
    return payload.orders;
  },

  async getAuthoritativeOrder(orderId: string): Promise<any | null> {
    const { getApiAuthHeaders } = await import('./apiAuth');
    const headers = await getApiAuthHeaders();
    const apiUrl = import.meta.env.VITE_LOCALEATS_API_URL?.replace(/\/$/, '');
    if (!apiUrl) throw new Error('LocalEats order service is not configured.');
    const response = await fetch(`${apiUrl}/api/v1/orders/${encodeURIComponent(orderId)}`, { headers });
    if (response.status === 404) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || !payload.order) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Order could not be loaded.');
    }
    return payload.order;
  },

  async cancelAuthoritativeOrder(orderId: string): Promise<any> {
    const { getApiAuthHeaders } = await import('./apiAuth');
    const headers = await getApiAuthHeaders();
    const apiUrl = import.meta.env.VITE_LOCALEATS_API_URL?.replace(/\/$/, '');
    if (!apiUrl) throw new Error('LocalEats order service is not configured.');
    const response = await fetch(`${apiUrl}/api/v1/orders/${encodeURIComponent(orderId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success || !payload.order) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : 'Order cancellation was not confirmed.');
    }
    return payload.order;
  },

  async saveOrder(order: any): Promise<void> {
    if (!order || !order.id) return;
    const orderDoc = doc(db, "orders", String(order.id));
    await setDoc(orderDoc, {
      ...order,
      created_at: order.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { merge: true });
  },

  async getOrder(orderId: string): Promise<any | null> {
    const orderDoc = doc(db, "orders", String(orderId));
    const snapshot = await getDoc(orderDoc);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  },

  async getOrdersByUser(userId: string): Promise<any[]> {
    try {
      const q = query(collection(db, "orders"), where("user_id", "==", userId));
      const querySnapshot = await getDocs(q);
      const orders: any[] = [];
      querySnapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
      });
      return orders;
    } catch (e) {
      console.warn("[FirestoreService] getOrdersByUser fallback:", e);
      return [];
    }
  },

  async getOrdersByShop(shopId: string | number): Promise<any[]> {
    try {
      const q = query(collection(db, "orders"), where("shop_id", "==", shopId));
      const querySnapshot = await getDocs(q);
      const orders: any[] = [];
      querySnapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
      });
      return orders;
    } catch (e) {
      console.warn("[FirestoreService] getOrdersByShop fallback:", e);
      return [];
    }
  },

  async getAllOrders(): Promise<any[]> {
    try {
      const q = query(collection(db, "orders"), orderBy("created_at", "desc"), limit(100));
      const querySnapshot = await getDocs(q);
      const orders: any[] = [];
      querySnapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
      });
      return orders;
    } catch (e) {
      console.warn("[FirestoreService] getAllOrders fallback:", e);
      return [];
    }
  },

  listenToOrder(orderId: string, onUpdate: (order: any) => void): Unsubscribe {
    const orderDoc = doc(db, "orders", String(orderId));
    return onSnapshot(orderDoc, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() });
      }
    }, (err) => {
      console.info("[Firestore] Order listener notice:", err?.message || err);
    });
  },

  listenToUserOrders(userId: string, onUpdate: (orders: any[]) => void): Unsubscribe {
    const q = query(collection(db, "orders"), where("user_id", "==", userId));
    return onSnapshot(q, (snapshot) => {
      const orders: any[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() });
      });
      onUpdate(orders);
    }, (err) => {
      console.info("[Firestore] User orders listener notice:", err?.message || err);
    });
  },

  // Rider tracking
  async updateRiderLocation(riderId: string, locationData: { latitude: number; longitude: number; heading?: number; speed?: number; order_id?: string }): Promise<void> {
    const riderDoc = doc(db, "rider_locations", String(riderId));
    await setDoc(riderDoc, {
      rider_id: riderId,
      ...locationData,
      updated_at: new Date().toISOString()
    }, { merge: true });
  },

  listenToRiderLocation(riderId: string, onUpdate: (loc: any) => void): Unsubscribe {
    const riderDoc = doc(db, "rider_locations", String(riderId));
    return onSnapshot(riderDoc, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data());
      }
    }, (err) => {
      console.info("[Firestore] Rider listener notice:", err?.message || err);
    });
  },

  // Chat messages
  async sendMessage(orderId: string, senderId: string, senderRole: string, messageText: string): Promise<void> {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msgDoc = doc(db, "messages", msgId);
    await setDoc(msgDoc, {
      id: msgId,
      order_id: String(orderId),
      sender_id: senderId,
      sender_role: senderRole,
      message: messageText,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  },

  
  async markMessagesAsRead(orderId: string, currentUserId: string): Promise<void> {
    try {
      const q = query(collection(db, "messages"), where("order_id", "==", String(orderId)), where("is_read", "==", false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((docSnap) => {
        if (docSnap.data().sender_id !== currentUserId) {
          batch.update(docSnap.ref, { is_read: true, read_at: new Date().toISOString() });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.warn("[FirestoreService] markMessagesAsRead error:", e);
    }
  },
  listenToOrderMessages(orderId: string, onUpdate: (messages: any[]) => void): Unsubscribe {
    const q = query(collection(db, "messages"), where("order_id", "==", String(orderId)));
    return onSnapshot(q, (snapshot) => {
      const messages: any[] = [];
      snapshot.forEach((docSnap) => {
        messages.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by timestamp
      messages.sort((a, b) => new Date(a.timestamp || a.created_at).getTime() - new Date(b.timestamp || b.created_at).getTime());
      onUpdate(messages);
    }, (err) => {
      console.info("[Firestore] Message listener notice:", err?.message || err);
    });
  },

  // Customer Profile Management
  async getProfile(userId: string, retries = 3, backoffMs = 1000): Promise<any | null> {
    for (let i = 0; i < retries; i++) {
      try {
        const profileDoc = doc(db, "profiles", String(userId));
        const snapshot = await getDoc(profileDoc);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
      } catch (e: any) {
        console.warn(`[FirestoreService] getProfile attempt ${i + 1} failed:`, e?.message || e);
        if (i === retries - 1) return null;
        await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(1.5, i))); // Exponential backoff
      }
    }
    return null;
  },

  async saveProfile(userId: string, profileData: any, retries = 1, backoffMs = 500): Promise<void> {
    if (!userId) return;
    for (let i = 0; i < retries; i++) {
      try {
        const profileDoc = doc(db, "profiles", String(userId));
        
        // Realistic 8s timeout for long-polling connection handshake without hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout saving to Firestore mirror")), 8000)
        );
        
        await Promise.race([
          setDoc(profileDoc, {
            id: userId,
            user_id: userId,
            ...profileData,
            updated_at: new Date().toISOString()
          }, { merge: true }),
          timeoutPromise
        ]);
        
        return; // Success
      } catch (e: any) {
        // Fast exit for split-brain permission or timeout - Supabase/API is authoritative
        if (e?.message?.includes("Missing or insufficient permissions") || e?.message?.includes("Timeout")) {
          console.debug("[FirestoreService] Profile mirror notice (Supabase is authoritative):", e?.message || e);
          return;
        }
        
        if (i === retries - 1) {
          console.debug("[FirestoreService] saveProfile mirror gracefully handled:", e?.message || e);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  },

  listenToProfile(userId: string, onUpdate: (profile: any) => void): Unsubscribe {
    const profileDoc = doc(db, "profiles", String(userId));
    return onSnapshot(profileDoc, (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({ id: snapshot.id, ...snapshot.data() });
      }
    }, (err) => {
      console.info("[Firestore] Profile listener notice:", err?.message || err);
    });
  },

  // Push token registration
  async savePushToken(userId: string, token: string): Promise<void> {
    const tokenDoc = doc(db, "user_push_tokens", `${userId}_${token.slice(-10)}`);
    await setDoc(tokenDoc, {
      user_id: userId,
      token: token,
      last_updated: new Date().toISOString()
    }, { merge: true });
  },

  
  // Mutations
  async updateOrder(orderId: string, updateData: any): Promise<void> {
    try {
      const orderDoc = doc(db, "orders", String(orderId));
      await setDoc(orderDoc, updateData, { merge: true });
    } catch (e) {
      console.warn("[FirestoreService] updateOrder notice:", e);
    }
  },

  async updateShop(shopId: string, updateData: any): Promise<void> {
    try {
      const shopDoc = doc(db, "shops", String(shopId));
      await setDoc(shopDoc, updateData, { merge: true });
    } catch (e) {
      console.warn("[FirestoreService] updateShop notice:", e);
    }
  },

  async updateMenuItem(itemId: string, updateData: any): Promise<void> {
    try {
      const menuDoc = doc(db, "menu_items", String(itemId));
      await setDoc(menuDoc, updateData, { merge: true });
    } catch (e) {
      console.warn("[FirestoreService] updateMenuItem notice:", e);
    }
  },

  async addMenuItem(itemData: any): Promise<void> {
    try {
      if (!itemData.id) {
         itemData.id = "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
      }
      const menuDoc = doc(db, "menu_items", String(itemData.id));
      await setDoc(menuDoc, itemData);
    } catch (e) {
      console.warn("[FirestoreService] addMenuItem notice:", e);
    }
  },

  async deleteMenuItem(itemId: string): Promise<void> {
    try {
      const menuDoc = doc(db, "menu_items", String(itemId));
      await setDoc(menuDoc, { is_available: false, active: false, status: 'deleted' }, { merge: true });
    } catch (e) {
      console.warn("[FirestoreService] deleteMenuItem notice:", e);
    }
  },

  // Shops & Menu retrieval from shared Firestore Database
};

/**
 * Gets FCM Messaging instance if supported in browser
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    if (!messagingInstance) {
      const app = getFirebaseApp();
      if (app) {
        try {
          messagingInstance = getMessaging(app);
        } catch (err) {
          console.debug("[FCM] Failed to get messaging instance:", err);
          return null;
        }
      }
    }
    return messagingInstance;
  } catch (_) {
    return null;
  }
}

/**
 * Checks browser support, requests permission, registers service worker, and retrieves FCM token.
 */
export async function requestNotificationPermissionAndGetToken(customVapidKey?: string): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    if (Notification.permission !== "granted") {
      return null;
    }

    const registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js").catch(() => null);
    if (!registration) return null;

    const messaging = await getFirebaseMessaging().catch(() => null);
    if (!messaging) return null;

    const vapidKey = customVapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey || undefined,
    }).catch(() => null);

    return token || null;
  } catch (_) {
    return null;
  }
}

/**
 * Subscribes to foreground push messages from Firebase Cloud Messaging
 */
export async function onForegroundMessage(callback: (payload: any) => void): Promise<(() => void) | void> {
  try {
    const messaging = await getFirebaseMessaging().catch(() => null);
    if (!messaging) return;

    return onMessage(messaging, (payload) => {
      console.debug("[FCM] Received foreground notification:", payload);
      try {
        callback(payload);
      } catch (_) {}
    });
  } catch (_) {
    return;
  }
}

/**
 * Upserts the FCM push token into Firestore and Supabase fallback
 */
export async function syncPushTokenToSupabase(userId: string, fcmToken: string): Promise<boolean> {
  if (!userId || !fcmToken) return false;

  try {
    await FirestoreService.savePushToken(userId, fcmToken).catch(() => {});
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * High-level helper: requests token and syncs to Firestore user_push_tokens
 */
export async function registerAndSyncPushToken(userId?: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const token = await requestNotificationPermissionAndGetToken().catch(() => null);
    if (token) {
      await syncPushTokenToSupabase(userId, token).catch(() => {});
    }
    return token;
  } catch (_) {
    return null;
  }
}
