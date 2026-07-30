import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";
import { supabase } from "./supabase";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "localeats-5e26e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "localeats-5e26e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "localeats-5e26e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "281496568360",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;

/**
 * Lazily initializes Firebase App instance
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!appInstance) {
    if (!getApps().length) {
      try {
        appInstance = initializeApp(firebaseConfig);
      } catch (err) {
        console.warn("[Firebase] Initialization error:", err);
        return null;
      }
    } else {
      appInstance = getApp();
    }
  }
  return appInstance;
}

/**
 * Gets FCM Messaging instance if supported in browser
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  if (!messagingInstance) {
    const app = getFirebaseApp();
    if (app) {
      try {
        messagingInstance = getMessaging(app);
      } catch (err) {
        console.warn("[FCM] Failed to get messaging instance:", err);
        return null;
      }
    }
  }
  return messagingInstance;
}

/**
 * Checks browser support, requests permission, registers service worker, and retrieves FCM token.
 */
export async function requestNotificationPermissionAndGetToken(customVapidKey?: string): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    console.warn("[FCM] Notifications or Service Worker not supported in this browser.");
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("[FCM] Firebase Messaging is not supported in this browser.");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Notification permission not granted:", permission);
      return null;
    }

    // Register /firebase-messaging-sw.js
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js").catch(async (regErr) => {
      console.warn("[FCM] Service worker register retry:", regErr);
      return await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js") || null;
    });

    if (!registration) {
      console.warn("[FCM] Could not obtain service worker registration for FCM.");
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = customVapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: vapidKey || undefined,
    });

    if (token) {
      console.log("[FCM] FCM registration token acquired successfully.");
      return token;
    } else {
      console.warn("[FCM] No registration token available.");
      return null;
    }
  } catch (err) {
    console.warn("[FCM] Error requesting notification token:", err);
    return null;
  }
}

/**
 * Subscribes to foreground push messages from Firebase Cloud Messaging
 */
export async function onForegroundMessage(callback: (payload: any) => void): Promise<(() => void) | void> {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return;

  try {
    return onMessage(messaging, (payload) => {
      console.log("[FCM] Received foreground notification:", payload);
      callback(payload);
    });
  } catch (err) {
    console.warn("[FCM] Error attaching foreground message listener:", err);
  }
}

/**
 * Upserts the FCM push token into public.user_push_tokens Supabase table
 */
export async function syncPushTokenToSupabase(userId: string, fcmToken: string): Promise<boolean> {
  if (!userId || !fcmToken) return false;

  try {
    const { error } = await supabase.from("user_push_tokens").upsert(
      {
        user_id: userId,
        token: fcmToken,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "user_id, token" }
    );

    if (error) {
      console.warn("[FCM] Notice syncing push token to Supabase:", error.message || error);
      return false;
    } else {
      console.log("[FCM] Push token successfully synced to user_push_tokens for user:", userId);
      return true;
    }
  } catch (err: any) {
    console.warn("[FCM] Error syncing push token to Supabase:", err?.message || err);
    return false;
  }
}

/**
 * High-level helper: requests token and syncs to Supabase user_push_tokens table
 */
export async function registerAndSyncPushToken(userId?: string): Promise<string | null> {
  if (!userId) return null;
  const token = await requestNotificationPermissionAndGetToken();
  if (token) {
    await syncPushTokenToSupabase(userId, token);
  }
  return token;
}
