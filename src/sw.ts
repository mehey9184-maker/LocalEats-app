import { precacheAndRoute } from "workbox-precaching";

// Cast self to any to safely bypass TypeScript DOM/WebWorker library declaration conflicts
const sw = self as any;

// Must literally contain "self.__WB_MANIFEST" for workbox's injectManifest plugin to successfully find and inject assets
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

// ----------------------------------------------------------------------------
// PWA Caching & Synchronization Setup
// ----------------------------------------------------------------------------
const CACHE_NAME_APP_SHELL = "localeats-app-shell-v2";
const CACHE_NAME_API = "localeats-api-v2";

const DB_NAME = "LocalEatsOfflineDB";
const DB_VERSION = 1;

// Broadcast Channel to communicate with the React hooks instantly
const broadcastChannel = new BroadcastChannel("localeats-sync-channel");

// IndexedDB outbox helpers inside the worker scope
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("offline_outbox")) {
        db.createObjectStore("offline_outbox", { keyPath: "id" });
      }
    };
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function getOutboxItems(): Promise<any[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_outbox", "readonly");
      const store = tx.objectStore("offline_outbox");
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  } catch (err) {
    console.error("[Service Worker DB] Failed to get outbox items:", err);
    return [];
  }
}

async function addOutboxItem(item: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_outbox", "readwrite");
      const store = tx.objectStore("offline_outbox");
      const request = store.put(item);
      
      request.onsuccess = () => {
        resolve();
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  } catch (err) {
    console.error("[Service Worker DB] Failed to save outbox item:", err);
  }
}

async function deleteOutboxItem(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_outbox", "readwrite");
      const store = tx.objectStore("offline_outbox");
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
        db.close();
      };
      
      request.onerror = () => {
        reject(request.error);
        db.close();
      };
    });
  } catch (err) {
    console.error("[Service Worker DB] Failed to delete outbox item:", err);
  }
}

/**
 * rehydrateAndReplayOutbox
 * Chronologically processes queued database mutation events.
 * Enforces the strict 15-minute Cart Validity constraint.
 */
async function rehydrateAndReplayOutbox() {
  const items = await getOutboxItems();
  if (items.length === 0) return;

  // Sort items chronologically by creation timestamp
  items.sort((a, b) => a.created_at - b.created_at);

  const now = Date.now();
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

  for (const item of items) {
    // Evaluation: Current Time - Action Timestamp < 15 Minutes
    if (now - item.created_at > FIFTEEN_MINUTES_MS) {
      await deleteOutboxItem(item.id);
      broadcastChannel.postMessage({
        type: "CART_EXPIRED",
        message: "Your offline changes are older than 15 minutes. Please review your cart before checking out.",
        timestamp: Date.now()
      });
      continue;
    }

    try {
      const headers = new Headers();
      Object.entries(item.headers).forEach(([key, val]) => {
        headers.set(key, val as string);
      });

      const response = await fetch(item.url, {
        method: item.method,
        headers: headers,
        body: item.body || undefined
      });

      if (response.ok) {
        await deleteOutboxItem(item.id);
        broadcastChannel.postMessage({
          type: "SYNC_SUCCESS",
          message: `Synchronized transaction: ${item.method} to ${item.url.split("/").pop()}`,
          timestamp: Date.now()
        });
      } else {
        console.warn(`[Service Worker Sync] Queue replay returned status: ${response.status}`);
        if (response.status >= 400 && response.status < 500) {
          // Drop malformed requests to avoid infinite blockers
          await deleteOutboxItem(item.id);
        }
      }
    } catch (err) {
      console.warn("[Service Worker Sync] Replay execution stalled (offline or backend timeout):", err);
      // Stall subsequent executions to maintain sequential integrity
      break;
    }
  }
}

// Service worker lifecycle setups
sw.addEventListener("install", () => {
  sw.skipWaiting();
});

sw.addEventListener("activate", (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME_APP_SHELL && key !== CACHE_NAME_API) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => sw.clients.claim())
  );
});

// Periodic or background rehydration on device sync events
sw.addEventListener("sync", (event: any) => {
  if (event.tag === "localeats-outbox-sync") {
    event.waitUntil(rehydrateAndReplayOutbox());
  }
});

// Listening to client messages to force sync triggering
sw.addEventListener("message", (event: any) => {
  if (event.data && event.data.type === "TRIGGER_SYNC") {
    event.waitUntil(rehydrateAndReplayOutbox());
  }
});

// Intercept HTTP requests and apply offline-first capabilities
sw.addEventListener("fetch", (event: any) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Intercept offline outbox writes (POST, PUT, PATCH, DELETE for active_carts & orders)
  const isOutboxTarget =
    (url.pathname.includes("/rest/v1/active_carts") || 
     url.pathname.includes("/rest/v1/orders") ||
     url.pathname.includes("/rest/v1/guest_carts")) &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);

  if (isOutboxTarget) {
    // Try sending online first, capture fallback queue entry if offline
    event.respondWith(
      fetch(request.clone())
        .then(async (response) => {
          if (response.ok) {
            // Trigger quick rehydrate check in background for remaining queued items
            event.waitUntil(rehydrateAndReplayOutbox());
          }
          return response;
        })
        .catch(async () => {
          // Store request parameters into IndexedDB for background replay
          try {
            const bodyText = await request.clone().text();
            const outboxEntry = {
              id: "tx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
              url: request.url,
              method: request.method,
              headers: Array.from(request.headers.entries()).reduce((acc, [key, val]) => {
                acc[key] = val;
                return acc;
              }, {} as Record<string, string>),
              body: bodyText,
              created_at: Date.now()
            };

            await addOutboxItem(outboxEntry);

            // Register background-sync tag if supported
            if ("sync" in sw.registration) {
              sw.registration.sync.register("localeats-outbox-sync").catch(() => {});
            }

            // Immediately notify client of queued status
            broadcastChannel.postMessage({
              type: "SYNC_FAILURE",
              message: "Device is offline. Cart transaction queued for background synchronization.",
              timestamp: Date.now()
            });

            // Return custom JSON response representing queued status
            return new Response(
              JSON.stringify({
                status: "queued",
                message: "Saved in outbox offline queue.",
                offline: true
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 202,
                statusText: "Accepted (Offline Queued)"
              }
            );
          } catch (err) {
            return new Response(
              JSON.stringify({ error: "Outbox buffering failed", details: String(err) }),
              { status: 500 }
            );
          }
        })
    );
    return;
  }

  // Skip non-GET requests for standard file/API caching
  if (request.method !== "GET") return;

  // 2. API Caching Strategy: Network-First with Local Cache Fallback
  const isApiRequest =
    url.pathname.includes("/rest/v1") ||
    url.pathname.includes("/auth/v1") ||
    url.hostname.includes("supabase.co") ||
    url.pathname.startsWith("/api/");

  if (isApiRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME_API).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(
              JSON.stringify({
                error: "Offline mode active",
                message: "You are currently browsing offline. Menus and store lists are read from cached local copy.",
                offline: true,
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 200, // Return 200 so the app's queryFn doesn't throw a fatal exception
              }
            );
          });
        })
    );
    return;
  }

  // 3. Static App Shell Caching Strategy: Cache-First with Stale-While-Revalidate background updates
  const isStaticAsset =
    url.origin === sw.location.origin &&
    (url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".jpg") ||
      url.pathname.endsWith(".webp") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".woff") ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.includes("/assets/"));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME_APP_SHELL).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const responseToCache = response.clone();
          caches.open(CACHE_NAME_APP_SHELL).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        });
      })
    );
    return;
  }
});

// Push notification listening (preserving Township Rider tracking notifications)
sw.addEventListener("push", (event: any) => {
  let data: any = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "LocalEats SA", body: event.data.text() };
    }
  }

  const title = data.title || "LocalEats SA";
  const options = {
    body: data.body || "Your Kota or Braai order status has changed!",
    icon: "/logo.png?v=2",
    badge: "/logo.png?v=2",
    data: { url: data.url || "/" },
    vibrate: [100, 50, 100],
    actions: data.actions || []
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url
    ? new URL(event.notification.data.url, sw.location.origin).href
    : sw.location.origin;

  event.waitUntil(
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients: any[]) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(urlToOpen);
      }
    })
  );
});
