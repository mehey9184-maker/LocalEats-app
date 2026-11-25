import {
  getFirestore,
  initializeFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type Unsubscribe
} from "firebase/firestore";
import {getFirebaseApp,firestoreDatabaseId} from "./firebase";
import type {Shop,MenuItem} from "../types";
// Explicitly requested legacy reads only. Never fall back to a different named database.
let firestoreInstance:Firestore|null=null;
export function getFirebaseFirestore():Firestore {
 if(!firestoreInstance){
  const app=getFirebaseApp();
  try {firestoreInstance=initializeFirestore(app,{experimentalForceLongPolling:true},firestoreDatabaseId);}
  catch {firestoreInstance=getFirestore(app,firestoreDatabaseId);}
 }
 return firestoreInstance;
}
export const db=getFirebaseFirestore();
export const LegacyFirestoreReads={
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
              image: m.image_url || m.image || m.photo || "",
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
              image: m.image_url || m.image || m.photo || "",
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
                image: m.image_url || m.image || m.photo || "",
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
                      image: data.image_url || data.image || data.photo || "",
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

          const logo = d.logo_url || d.logo || d.image || d.image_url || d.banner || "";

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
            images: Array.isArray(d.images) && d.images.length > 0 ? d.images : logo ? [logo] : [],
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
        const freshShops = await LegacyFirestoreReads.getShops();
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
};
