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
import { Shop, MenuItem } from "../types";
import { DEFAULT_FALLBACK_SHOPS } from "../App-constants";
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
      const response = await fetch('/api/orders', {

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(requestData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create order");
      }
      return {
        success: true,
        order_id: data.order?.id || requestData.idempotency_key,
        subtotal: data.order?.subtotal || 0,
        delivery_fee: data.order?.delivery_fee || 0,
        service_fee: data.order?.service_fee || 0,
        discount_amount: data.order?.discount_amount || 0,
        tip_amount: data.order?.tip_amount || 0,
        total_price: data.order?.total_price || 0,
        status: data.order?.status || 'pending',
        delivery_status: data.order?.delivery_status || 'none',
      };
    } catch (e: any) {
      console.error("[FirestoreService] createAuthoritativeOrder failed:", e);
      throw e;
    }
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
  async getShops(): Promise<Shop[]> {
    try {
      let shopDocs: any[] = [];
      const collectionsToTry = ["shops", "stores", "merchants", "vendors"];

      for (const collName of collectionsToTry) {
        try {
          const snapshot = await getDocs(collection(db, collName));
          if (!snapshot.empty) {
            snapshot.forEach((d) => {
              shopDocs.push({ id: d.id, _collection: collName, ...d.data() });
            });
            break;
          }
        } catch (e) {
          console.debug(`[FirestoreService] Querying ${collName}:`, e);
        }
      }

      if (shopDocs.length === 0) {
        return [];
      }

      // Root menu_items collection if used
      let rootMenuItems: any[] = [];
      try {
        const menuSnap = await getDocs(collection(db, "menu_items"));
        if (!menuSnap.empty) {
          menuSnap.forEach((m) => {
            rootMenuItems.push({ id: m.id, ...m.data() });
          });
        }
      } catch (_) {}

      const defaultImages = [
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600"
      ];

      const formattedShops: Shop[] = await Promise.all(
        shopDocs.map(async (d) => {
          let menu: MenuItem[] = [];

          // Format 1: Embedded menu array
          if (Array.isArray(d.menu) && d.menu.length > 0) {
            menu = d.menu.map((m: any, idx: number) => ({
              id: String(m.id || `item_${idx}`),
              name: m.name || m.title || "Menu Item",
              price: Number(m.price || 0),
              displayPrice: `R${Number(m.price || 0).toFixed(2)}`,
              image: m.image_url || m.image || m.photo || defaultImages[0],
              description: m.description || "",
              category: m.category || "Main Course",
              is_available: m.is_available !== false && m.available !== false,
              customizations: Array.isArray(m.customizations) ? m.customizations : [],
              dietary_tags: Array.isArray(m.dietary_tags) ? m.dietary_tags : [],
            }));
          } else if (Array.isArray(d.items) && d.items.length > 0) {
            menu = d.items.map((m: any, idx: number) => ({
              id: String(m.id || `item_${idx}`),
              name: m.name || m.title || "Menu Item",
              price: Number(m.price || 0),
              displayPrice: `R${Number(m.price || 0).toFixed(2)}`,
              image: m.image_url || m.image || m.photo || defaultImages[0],
              description: m.description || "",
              category: m.category || "Main Course",
              is_available: m.is_available !== false && m.available !== false,
              customizations: Array.isArray(m.customizations) ? m.customizations : [],
              dietary_tags: Array.isArray(m.dietary_tags) ? m.dietary_tags : [],
            }));
          } else {
            // Format 2: Matched from root menu_items
            const matched = rootMenuItems.filter(
              (m) => String(m.shop_id || m.shopId || m.store_id || m.storeId) === String(d.id)
            );
            if (matched.length > 0) {
              menu = matched.map((m: any) => ({
                id: String(m.id),
                name: m.name || m.title || "Menu Item",
                price: Number(m.price || 0),
                displayPrice: `R${Number(m.price || 0).toFixed(2)}`,
                image: m.image_url || m.image || m.photo || defaultImages[0],
                description: m.description || "",
                category: m.category || "Main Course",
                is_available: m.is_available !== false && m.available !== false,
                customizations: Array.isArray(m.customizations) ? m.customizations : [],
                dietary_tags: Array.isArray(m.dietary_tags) ? m.dietary_tags : [],
              }));
            } else {
              // Format 3: Subcollection
              try {
                const subSnap = await getDocs(collection(db, d._collection || "shops", String(d.id), "menu"));
                if (!subSnap.empty) {
                  subSnap.forEach((m) => {
                    const data = m.data();
                    menu.push({
                      id: String(m.id),
                      name: data.name || data.title || "Menu Item",
                      price: Number(data.price || 0),
                      displayPrice: `R${Number(data.price || 0).toFixed(2)}`,
                      image: data.image_url || data.image || data.photo || defaultImages[0],
                      description: data.description || "",
                      category: data.category || "Main Course",
                      is_available: data.is_available !== false && data.available !== false,
                      customizations: Array.isArray(data.customizations) ? data.customizations : [],
                      dietary_tags: Array.isArray(data.dietary_tags) ? data.dietary_tags : [],
                    });
                  });
                }
              } catch (_) {}
            }
          }

          // Fallback sample items if store was newly created without items
          if (menu.length === 0) {
            menu = [
              {
                id: `item_${d.id}_1`,
                name: "Chef's Special Special",
                price: 45.00,
                displayPrice: "R45.00",
                image: defaultImages[0],
                description: "Freshly prepared house specialty with seasonal sides and choice of sauce.",
                category: d.category || "Main Course",
                is_available: true,
                customizations: [],
                dietary_tags: [],
              }
            ];
          }

          const logo = d.logo_url || d.logo || d.image || d.image_url || d.banner || defaultImages[0];

          return {
            id: String(d.id),
            name: d.name || d.title || d.shopName || d.store_name || "Local Shop",
            logo: logo,
            rating: Number(d.rating || d.stars || 4.8),
            description: d.description || d.bio || "Fresh local kitchen & fast delivery",
            address: d.location || d.address || d.city || "Local Community Hub",
            category: d.category || d.cuisine || "Kota",
            cuisine_type: d.cuisine_type || d.category || "Kota",
            owner_id: d.owner_id || d.ownerId || d.userId || d.created_by || "",
            opening_time: d.opening_time || d.openingTime || "08:00",
            closing_time: d.closing_time || d.closingTime || "22:00",
            phone: d.phone || d.phoneNumber || "+27 12 345 6789",
            latitude: Number(
              d.latitude ||
              d.lat ||
              (-25.9964 + ((Math.abs(String(d.id).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 30) - 15) * 0.0018)
            ),
            longitude: Number(
              d.longitude ||
              d.lng ||
              d.lon ||
              (28.2268 + (((Math.abs(String(d.id).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) >> 2) % 30) - 15) * 0.0018)
            ),
            isOpen: d.isOpen !== false && d.is_open !== false && d.status !== "closed",
            is_active: d.is_active !== false && d.active !== false && d.status !== "inactive",
            cash_trust_enabled: d.cash_trust_enabled !== false,
            allow_external_riders: d.allow_external_riders !== false,
            auto_look_for_rider: d.auto_look_for_rider !== false,
            reviewCount: Number(d.reviewCount || d.reviews_count || 24),
            prepTime: d.prepTime || d.prep_time || "15-20 min",
            images: Array.isArray(d.images) && d.images.length > 0 ? d.images : [logo],
            menu: menu,
          };
        })
      );

      return formattedShops;
    } catch (err) {
      console.warn("[FirestoreService] getShops error:", err);
      return [];
    }
  },

  listenToShops(onUpdate: (shops: Shop[]) => void): Unsubscribe {
    const shopsColl = collection(db, "shops");
    const menuColl = collection(db, "menu_items");
    
    let isFetching = false;
    
    const fetchAndNotify = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const freshShops = await FirestoreService.getShops();
        if (freshShops && freshShops.length > 0) {
          onUpdate(freshShops);
        }
      } catch (err) {
        console.debug("[FirestoreService] listenToShops error:", err);
      } finally {
        isFetching = false;
      }
    };

    const unsubShops = onSnapshot(shopsColl, fetchAndNotify, (err) => {
      console.debug("[FirestoreService] shops listener notice:", err?.message || err);
    });
    
    const unsubMenu = onSnapshot(menuColl, fetchAndNotify, (err) => {
      console.debug("[FirestoreService] menu listener notice:", err?.message || err);
    });

    return () => {
      unsubShops();
      unsubMenu();
    };
  },

  async seedDemoShopsIfEmpty(): Promise<boolean> {
    try {
      const existing = await FirestoreService.getShops();
      if (existing.length > 0) return false;

      for (const shop of DEFAULT_FALLBACK_SHOPS) {
        const shopRef = doc(db, "shops", shop.id);
        await setDoc(shopRef, {
          id: shop.id,
          name: shop.name,
          logo_url: shop.logo,
          rating: shop.rating,
          description: shop.description,
          location: shop.address,
          category: shop.category,
          cuisine_type: shop.cuisine_type || shop.category,
          opening_time: shop.opening_time,
          closing_time: shop.closing_time,
          phone: shop.phone,
          latitude: shop.latitude,
          longitude: shop.longitude,
          is_active: true,
          isOpen: true,
          prepTime: shop.prepTime,
          reviewCount: shop.reviewCount,
          menu: shop.menu,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { merge: true });
      }
      return true;
    } catch (e) {
      console.warn("[FirestoreService] seedDemoShops error:", e);
      return false;
    }
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
