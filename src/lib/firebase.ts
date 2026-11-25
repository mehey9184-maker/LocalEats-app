import {rejectLegacyOrderWrite} from "./legacyOrderWrite";
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import type {DocumentData,QueryConstraint,Unsubscribe} from "firebase/firestore";
import {startDeferredSubscription} from "./deferredSubscription";
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
import type { Shop } from "../types";
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
  user_id?: string;
  _clientPricing?: any;
  idempotency_key: string;
  shop_id: string | number;
  items: CreateOrderItemInput[];
  delivery_type: "delivery" | "collection";
  delivery_schedule_mode: "standard" | "express";
  delivery_coordinates?: {
    lat: number;
    lng: number;
  };
  promo_code?: string;
  tip_amount: number;
  payment_method: string;
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

// Auth and Functions compatibility exports; optional Firestore reads are deferred.
export {
  signInAnonymously,
  httpsCallable,
};
export type { DocumentData, QueryConstraint, Unsubscribe, FirebaseUser, Functions, HttpsCallableResult };

/**
 * Firestore Service Helpers for LocalEats
 */

export const FirestoreService = {
  async healthCheck(): Promise<boolean> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.healthCheck();
  },

  async addReview(shopId: string, reviewData: any): Promise<void> {
    void shopId; void reviewData;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  async getReviewsForShop(shopId: string, limitCount = 50): Promise<any[]> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getReviewsForShop(shopId,limitCount);
  },

  async followShop(userId: string, shopId: string): Promise<void> {
    void userId; void shopId;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  async unfollowShop(userId: string, shopId: string): Promise<void> {
    void userId; void shopId;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  async getFollowedShops(userId: string): Promise<any[]> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getFollowedShops(userId);
  },

  async submitContactMessage(messageData: any): Promise<void> {
    void messageData;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  // Orders
  async createAuthoritativeOrder(requestData: CreateOrderRequestData): Promise<CreateOrderResponse> {
    return rejectLegacyOrderWrite();
  },

  async saveOrder(order: any): Promise<void> {
    return rejectLegacyOrderWrite();
  },

  async getOrder(orderId: string): Promise<any | null> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getOrder(orderId);
  },

  async getOrdersByUser(userId: string): Promise<any[]> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getOrdersByUser(userId);
  },

  async getOrdersByShop(shopId: string | number): Promise<any[]> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getOrdersByShop(shopId);
  },

  async getAllOrders(): Promise<any[]> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getAllOrders();
  },

  listenToOrder(orderId: string, onUpdate: (order: any) => void): Unsubscribe {
    const uid=auth.currentUser?.uid ?? null;
    const current=()=> (auth.currentUser?.uid ?? null)===uid;
    return startDeferredSubscription(()=>import("./legacyFirestoreReads"), (module,active)=>module.LegacyFirestoreReads.listenToOrder(orderId,value=>{if(active())onUpdate(value);}),current);
  },

  listenToUserOrders(userId: string, onUpdate: (orders: any[]) => void): Unsubscribe {
    const uid=auth.currentUser?.uid ?? null;
    const current=()=> (auth.currentUser?.uid ?? null)===uid;
    return startDeferredSubscription(()=>import("./legacyFirestoreReads"), (module,active)=>module.LegacyFirestoreReads.listenToUserOrders(userId,value=>{if(active())onUpdate(value);}),current);
  },


  async updateRiderLocation(riderId: string, locationData: { latitude: number; longitude: number; heading?: number; speed?: number; order_id?: string }): Promise<void> {
    void riderId; void locationData;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  listenToRiderLocation(riderId: string, onUpdate: (loc: any) => void): Unsubscribe {
    const uid=auth.currentUser?.uid ?? null;
    const current=()=> (auth.currentUser?.uid ?? null)===uid;
    return startDeferredSubscription(()=>import("./legacyFirestoreReads"), (module,active)=>module.LegacyFirestoreReads.listenToRiderLocation(riderId,value=>{if(active())onUpdate(value);}),current);
  },


  async sendMessage(orderId: string, senderId: string, senderRole: string, messageText: string): Promise<void> {
    void orderId; void senderId; void senderRole; void messageText;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  async markMessagesAsRead(orderId: string, currentUserId: string): Promise<void> {
    void orderId; void currentUserId;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  listenToOrderMessages(orderId: string, onUpdate: (messages: any[]) => void): Unsubscribe {
    const uid=auth.currentUser?.uid ?? null;
    const current=()=> (auth.currentUser?.uid ?? null)===uid;
    return startDeferredSubscription(()=>import("./legacyFirestoreReads"), (module,active)=>module.LegacyFirestoreReads.listenToOrderMessages(orderId,value=>{if(active())onUpdate(value);}),current);
  },


  async getProfile(userId: string, retries = 3, backoffMs = 1000): Promise<any | null> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getProfile(userId,retries,backoffMs);
  },

  async saveProfile(userId: string, profileData: any, retries = 1, backoffMs = 500): Promise<void> {
    void userId; void profileData; void retries; void backoffMs;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  listenToProfile(userId: string, onUpdate: (profile: any) => void): Unsubscribe {
    const uid=auth.currentUser?.uid ?? null;
    const current=()=> (auth.currentUser?.uid ?? null)===uid;
    return startDeferredSubscription(()=>import("./legacyFirestoreReads"), (module,active)=>module.LegacyFirestoreReads.listenToProfile(userId,value=>{if(active())onUpdate(value);}),current);
  },


  async savePushToken(userId: string, token: string): Promise<void> {
    void userId; void token;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  // Mutations
  async updateOrder(orderId: string, updateData: any): Promise<void> {
    return rejectLegacyOrderWrite();
  },

  async updateShop(shopId: string, updateData: any): Promise<void> {
    void shopId; void updateData;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  async updateMenuItem(itemId: string, updateData: any): Promise<void> {
    void itemId; void updateData;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  async addMenuItem(itemData: any): Promise<void> {
    void itemData;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  async deleteMenuItem(itemId: string): Promise<void> {
    void itemId;
    throw new Error("This action requires the verified LocalEats API. No changes were saved.");
  },

  // Shops & Menu retrieval from shared Firestore Database
  async getShops(): Promise<Shop[]> {
    const {LegacyFirestoreReads}=await import("./legacyFirestoreReads");
    return LegacyFirestoreReads.getShops();
  },

  listenToShops(onUpdate: (shops: Shop[]) => void): Unsubscribe {
    const uid=auth.currentUser?.uid ?? null;
    const current=()=> (auth.currentUser?.uid ?? null)===uid;
    return startDeferredSubscription(()=>import("./legacyFirestoreReads"), (module,active)=>module.LegacyFirestoreReads.listenToShops(value=>{if(active())onUpdate(value);}),current);
  },

  async seedDemoShopsIfEmpty(): Promise<boolean> {
    // Demo fixtures never write to a shared database.
    return false;
  }
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
 * The Firebase registration uses a separate scope from the root offline PWA.
 * Browser-only diagnostics may call this after a user's explicit click.
 * Do not use navigator.serviceWorker.ready: it resolves the root PWA worker,
 * not necessarily the custom Firebase registration.
 */
export async function ensureCustomerPushWorkerActive(): Promise<ServiceWorkerRegistration> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    throw new Error("This browser does not support service workers.");
  }
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/firebase-cloud-messaging-push-scope/",
  });
  if (registration.active?.state === "activated") return registration;
  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const workers = [registration.installing, registration.waiting, registration.active]
      .filter((worker): worker is ServiceWorker => !!worker);
    let finished = false;
    let timer: ReturnType<typeof setTimeout>;
    const cleanup = () => {
      clearTimeout(timer);
      workers.forEach(worker => worker.removeEventListener("statechange", check));
    };
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      cleanup();
      if (error) reject(error);
      else resolve(registration);
    };
    const check = () => {
      if (registration.active?.state === "activated") {
        finish();
      } else if (workers.length > 0 && workers.every(worker => worker.state === "redundant")) {
        finish(new Error("Firebase notification worker installation failed."));
      }
    };
    workers.forEach(worker => worker.addEventListener("statechange", check));
    timer = setTimeout(() => finish(new Error("Firebase notification worker did not activate.")), 10000);
    check();
  });
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

    // Never replace the root PWA/offline worker. Firebase needs the custom
    // registration to be ACTIVE before calling getToken (fresh install race).
    const registration = await ensureCustomerPushWorkerActive();
    const messaging = await getFirebaseMessaging().catch(() => null);
    if (!messaging) return null;

    // The matching public Web Push certificate must be configured in Firebase.
    // Never silently use the SDK's generic/default VAPID key in Production.
    const vapidKey = customVapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey,
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
      // Do not log push payloads: they can contain per-order metadata.
      try {
        callback(payload);
      } catch (_) {}
    });
  } catch (_) {
    return;
  }
}

// FCM tokens are sensitive bearer-like device identifiers: do not write them
// to localStorage or public Firestore collections. Only a random installation
// ID (not an auth token) is persisted to support retries and sign-out revocation.
function pickupPushInstallationKey(uid: string): string {
  return "localeats-pickup-push-installation:" + uid;
}
function pickupPushInstallationId(uid: string): string | null {
  if (typeof window === "undefined" || !uid || !crypto?.randomUUID) return null;
  const key = pickupPushInstallationKey(uid);
  try {
    const existing = localStorage.getItem(key);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch { return null; }
}

/** Server-owned pickup push subscription: only success after API persistence. */
export async function syncPushTokenToSupabase(userId: string, fcmToken: string): Promise<boolean> {
  if (!userId || !fcmToken || auth.currentUser?.uid !== userId) return false;
  const installationId = pickupPushInstallationId(userId);
  if (!installationId) return false;
  try {
    const {customerPickupApi} = await import("../services/customerPickup");
    const result = await customerPickupApi.subscribe(installationId, fcmToken);
    return result?.success === true;
  } catch { return false; }
}

/** Explicitly revoke the current account's server subscription before logout. */
export async function revokePickupPushSubscription(userId: string): Promise<boolean> {
  if (!userId || auth.currentUser?.uid !== userId) return false;
  let installationId: string | null = null;
  try { installationId = localStorage.getItem(pickupPushInstallationKey(userId)); }
  catch { return false; }
  if (!installationId) return true;
  try {
    const {customerPickupApi} = await import("../services/customerPickup");
    const result = await customerPickupApi.revoke(installationId);
    return result?.success === true;
  } catch { return false; }
}

/** Returns an FCM token only after the protected pickup API registered it. */
export async function registerAndSyncPushToken(userId?: string): Promise<string | null> {
  if (!userId || auth.currentUser?.uid !== userId) return null;
  const token = await requestNotificationPermissionAndGetToken();
  if (!token) return null;
  return await syncPushTokenToSupabase(userId, token) ? token : null;
}
