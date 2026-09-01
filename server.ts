import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { initializeApp as initAdminApp, getApps as getAdminApps } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin for server-side ID token verification
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "localeats-5e26e";

if (getAdminApps().length === 0) {
  initAdminApp({
    projectId: FIREBASE_PROJECT_ID,
  });
}

export const firebaseAdminAuth = getAdminAuth();

// Initialize server-side Supabase client with Service Role Key
// IMPORTANT: Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini Client with mandatory telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API routes go here FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// In-memory store for synced orders as resilient fallback
const serverOrders: any[] = [];
const serverProfiles: Record<string, any> = {};

// Authentication Middleware with authoritative Firebase Admin ID token verification
const authenticateJWT = async (req: any, res: any, next: any) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const tokenRaw = authHeader.split(' ')[1];
  if (!tokenRaw) return res.status(401).json({ error: 'Invalid token format' });

  // 1. Firebase Token scheme (fb- prefix)
  if (tokenRaw.startsWith('fb-')) {
    const token = tokenRaw.replace(/^fb-/, '');
    try {
      const decoded = await firebaseAdminAuth.verifyIdToken(token);
      (req as any).user = {
        id: decoded.uid,
        uid: decoded.uid,
        email: decoded.email,
        ...decoded
      };
      return next();
    } catch (fbErr: any) {
      console.warn("[Auth Middleware] Firebase ID token verification failed:", fbErr?.message || fbErr);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // 2. Supabase or Legacy Token scheme (sb- prefix)
  if (tokenRaw.startsWith('sb-')) {
    const token = tokenRaw.replace(/^sb-/, '');

    // Try Supabase Admin first if configured
    if (supabaseAdmin) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) {
          (req as any).user = user;
          return next();
        }
      } catch (_) {}
    }

    // Fallback: Verify as Firebase ID token (handles legacy clients sending Firebase token with sb- prefix)
    try {
      const decoded = await firebaseAdminAuth.verifyIdToken(token);
      (req as any).user = {
        id: decoded.uid,
        uid: decoded.uid,
        email: decoded.email,
        ...decoded
      };
      return next();
    } catch (_) {}

    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // 3. Raw Bearer Token without prefix
  try {
    const decoded = await firebaseAdminAuth.verifyIdToken(tokenRaw);
    (req as any).user = {
      id: decoded.uid,
      uid: decoded.uid,
      email: decoded.email,
      ...decoded
    };
    return next();
  } catch (_) {}

  if (supabaseAdmin) {
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(tokenRaw);
      if (!error && user) {
        (req as any).user = user;
        return next();
      }
    } catch (_) {}
  }

  return res.status(401).json({ error: 'Invalid or expired token' });
};

// API Endpoint for resilient Profile Sync
app.post("/api/profiles", authenticateJWT, async (req: any, res: any) => {
  try {
    const profile = req.body;
    if (!profile || (!profile.user_id && !profile.id)) {
      return res.status(400).json({ error: "user_id or id is required" });
    }
    const userId = profile.user_id || profile.id;

    if (req.user?.id !== userId && req.user?.uid !== userId && req.user?.id !== 'anon') {
      return res.status(403).json({ error: "Forbidden: user_id mismatch" });
    }

    const upsertPayload: Record<string, any> = {
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    // Map aliases to strict schema column names
    const resolvedFullName = profile.fullName ?? profile.full_name ?? profile.name;
    if (resolvedFullName !== undefined) upsertPayload.fullName = resolvedFullName;

    const resolvedPhotoUrl = profile.photo_url ?? profile.avatar_url ?? profile.photoURL;
    if (resolvedPhotoUrl !== undefined) upsertPayload.photo_url = resolvedPhotoUrl;

    const resolvedAddress = profile.address ?? profile.default_address;
    if (resolvedAddress !== undefined) upsertPayload.address = resolvedAddress;

    // Include other valid schema columns if provided
    for (const key of ['email', 'phone', 'city', 'country', 'role', 'language', 'latitude', 'longitude', 'favorites']) {
      if (profile[key] !== undefined) {
        upsertPayload[key] = profile[key];
      }
    }

    if (!supabaseAdmin) {
      serverProfiles[userId] = {
        ...serverProfiles[userId],
        ...upsertPayload,
      };
      return res.json({ success: true, profile: serverProfiles[userId] });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("Supabase profile save error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, profile: data });
  } catch (err: any) {
    console.error("Profile save error:", err);
    return res.status(500).json({ error: err.message || "Failed to save profile" });
  }
});

app.get("/api/profiles/:id", authenticateJWT, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    if (req.user?.id !== id && req.user?.uid !== id && req.user?.id !== 'anon') {
      return res.status(403).json({ error: "Forbidden: ID mismatch" });
    }

    if (!supabaseAdmin) {
      const profile = serverProfiles[id];
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      return res.json({ profile });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.json({ profile: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to get profile" });
  }
});

// API Endpoint for resilient Order Placement & Sync

// ============================================================================
// PHASE 2: AUTHORITATIVE ORDER CREATION (SUPABASE + FCM)
// ============================================================================
// Helper to calculate distance (km) between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.get("/api/v1/shops", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: "Backend Supabase connection not configured." });
    }

    const { data: shops, error } = await supabaseAdmin
      .from("shops")
      .select("id, name, description, location, category, rating, logo_url, opening_time, closing_time, phone, latitude, longitude, cash_trust_enabled, allow_external_riders, auto_look_for_rider, is_active, owner_id")
      .eq("is_active", true);

    if (error) {
      console.error("[LocalEats API] Error fetching shops:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch shops" });
    }

    return res.status(200).json({ success: true, shops: shops || [] });
  } catch (error) {
    console.error("[LocalEats API] Exception fetching shops:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});


app.get("/api/v1/shops/:shopId/menu", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, error: "Backend Supabase connection not configured." });
    }

    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ success: false, error: "Shop ID is required" });
    }

    const { data: items, error } = await supabaseAdmin
      .from("menu_items")
      .select("id, shop_id, name, price, description, image_url, category, is_available, customizations")
      .eq("shop_id", shopId)
      .eq("is_available", true);

    if (error) {
      console.error("[LocalEats API] Error fetching menu items:", error);
      return res.status(500).json({ success: false, error: "Failed to fetch menu items" });
    }

    return res.status(200).json({ success: true, items: items || [] });
  } catch (error) {
    console.error("[LocalEats API] Exception fetching menu items:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/api/orders", authenticateJWT, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Backend Supabase connection not configured." });
    }

    const { 
      items, 
      shop_id, 
      // user_id is ignored from req.body
      delivery_type, 
      delivery_coordinates,
      delivery_address,
      promo_code,
      tip_amount,
      idempotency_key,
      _clientPricing,
      customer_details,
      payment_method
    } = req.body;
    
    const auth_user_id = (req as any).user.id;

    console.log("[API /orders] Request received for shop:", shop_id, "with clientPricing:", !!_clientPricing);

    if (!idempotency_key) return res.status(400).json({ error: "idempotency_key is required." });
    if (!shop_id) return res.status(400).json({ error: "shop_id is required." });
    if (!items || !items.length) return res.status(400).json({ error: "Order must contain items." });

    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('*')
      .eq('id', shop_id)
      .single();

    const isMissingData = (shopError || !shopData);
    console.log("[API /orders] isMissingData?", isMissingData, "shopError:", shopError);

    let calculatedSubtotal = 0;
    let calculatedDeliveryFee = 0;
    let calculatedServiceFee = 0;
    let calculatedTotal = 0;
    let productName = "";
    let quantity = 0;

    // MIGRATION BRIDGE
    if (isMissingData && _clientPricing) {
      console.log(`[Migration Fallback] Shop ${shop_id} not in Supabase yet. Using client pricing.`);
      calculatedSubtotal = _clientPricing.subtotal || 0;
      calculatedDeliveryFee = _clientPricing.delivery_fee || 0;
      calculatedServiceFee = _clientPricing.service_fee || 0;
      calculatedTotal = _clientPricing.total_price || 0;
      productName = items.map((i: any) => `Migration Item ${i.menu_item_id}`).join(", ");
      quantity = items.reduce((acc: number, i: any) => acc + Math.max(1, Number(i.quantity) || 1), 0);
    } else {
      if (isMissingData && !_clientPricing) {
        console.error("[API /orders] Missing shop data AND missing _clientPricing!");
        return res.status(404).json({ error: `Shop '${shop_id}' not found.` });
      }
      if (shopData.is_active === false) {
        return res.status(400).json({ error: "Shop is currently inactive." });
      }

      const itemIds = items.map((i: any) => i.menu_item_id);
      const { data: dbItems } = await supabaseAdmin.from('menu_items').select('*').in('id', itemIds);

      const productNames = [];
      for (const reqItem of items) {
        const dbItem = dbItems?.find((i: any) => i.id === reqItem.menu_item_id);
        if (!dbItem) {
          return res.status(404).json({ error: `Menu item '${reqItem.menu_item_id}' not found.` });
        }
        const authoritativePrice = Number(dbItem.price || 0);
        const qty = Math.max(1, Number(reqItem.quantity) || 1);
        calculatedSubtotal += (authoritativePrice * qty);
        quantity += qty;
        productNames.push(dbItem.name);
      }
      productName = productNames.join(", ");
      
      calculatedServiceFee = calculatedSubtotal > 0 ? 2.5 : 0.0;
      calculatedDeliveryFee = (delivery_type === "delivery") ? 10.0 : 0.0;
      calculatedTotal = calculatedSubtotal + calculatedDeliveryFee + calculatedServiceFee + (Number(tip_amount)||0);
    }

    // Ensure atomic insert by checking idempotency_key manually if table doesn't have unique constraint,
    // though the best is a DB constraint. For safety:
    const { data: existingOrder } = await supabaseAdmin.from('orders').select('id').eq('idempotency_key', idempotency_key).single();
    if (existingOrder) {
       return res.json({ success: true, order: existingOrder, message: "Order already exists" });
    }

    const insertPayload = {
      user_id: auth_user_id,
      shop_id: String(shop_id),
      status: 'pending',
      delivery_status: (delivery_type === "delivery") ? 'finding_rider' : 'none',
      product_name: productName,
      quantity,
      price: calculatedSubtotal,
      total_price: calculatedTotal,
      delivery_fee: calculatedDeliveryFee,
      idempotency_key
    };
    
    console.log("[API /orders] Inserting Payload:", insertPayload);
    const { data: newOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === 'PGRST204') {
         // Schema error, fallback to memory
         const newOrder = { id: Date.now().toString(), ...insertPayload, created_at: new Date().toISOString() };
         serverOrders.unshift(newOrder);
         return res.json({ success: true, order: newOrder, fallback: true });
      } else if (insertError.code === 'PGRST116' || insertError.code === '23505' /* Unique violation */) {
         // might be a duplicate race condition
      } else if (insertError.message && insertError.message.includes('idempotency_key')) {
         // fallback if column doesn't exist
         delete insertPayload.idempotency_key;
         const { data: fallbackOrder, error: fallbackError } = await supabaseAdmin.from('orders').insert(insertPayload).select().single();
         if (fallbackError) {
           console.error("Order Insert Error (Fallback):", fallbackError);
           // Fallback to in-memory if supabase fails due to schema issues
           const newOrder = { id: Date.now().toString(), ...insertPayload, created_at: new Date().toISOString() };
           serverOrders.unshift(newOrder);
           return res.json({ success: true, order: newOrder, fallback: true });
         }
         return res.json({ success: true, order: fallbackOrder });
      } else {
         console.error("Order Insert Error:", insertError);
         return res.status(500).json({ error: "Failed to persist order to database. " + (insertError.message || JSON.stringify(insertError)) });
      }
    }

    return res.json({ 
       success: true, 
       order: newOrder || existingOrder
     });
  } catch (err: any) {
    console.error("Create Order Error:", err);
    return res.status(500).json({ error: "Internal Server Error processing order." });
  }
});

// API Endpoint to accept an order (Merchant Order Handshake Integration)
app.post("/api/v1/orders/:id/accept", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { prepTimeMinutes, merchantNotes, customEstimatedDelivery } = req.body;
    const auth_user_id = (req as any).user.id;
    
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Server database connection is not configured." });
    }

    let { data: order, error: orderError } = await supabaseAdmin.from('orders').select('shop_id').eq('id', id).single();
    if (orderError && orderError.code === "PGRST116") { orderError = null; order = null; }
    let shopId = order?.shop_id;
    if (orderError || !order) {
      const memOrder = serverOrders.find(o => o.id === id);
      if (!memOrder) return res.status(404).json({ error: "Order not found" });
      shopId = memOrder.shop_id;
    }

    const { data: shop, error: shopError } = await supabaseAdmin.from('shops').select('owner_id').eq('id', shopId).single();
    if (shopError || !shop || shop.owner_id !== auth_user_id) {
       return res.status(403).json({ error: "Unauthorized. You do not own this shop." });
    }

    const updates: Record<string, any> = {
      status: 'preparing',
      updated_at: new Date().toISOString()
    };
    
    if (prepTimeMinutes !== undefined) updates.prep_time_minutes = prepTimeMinutes;
    if (merchantNotes !== undefined) updates.merchant_notes = merchantNotes;
    if (customEstimatedDelivery !== undefined) updates.estimated_delivery_time = customEstimatedDelivery;
    updates.accepted_at = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST204' || updateError.message.includes('Could not find')) {
         console.warn("[API /orders/accept] Missing extended columns, falling back to basic update:", updateError.message);
         const { data: fallbackOrder, error: fallbackError } = await supabaseAdmin
          .from('orders')
          .update({ 
            status: 'preparing',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();
          
         if (fallbackError) {
            console.error("Order Accept Fallback Error:", fallbackError);
            return res.status(500).json({ error: "Failed to accept order (fallback).", details: fallbackError.message });
         }
         return res.json({ success: true, order: fallbackOrder });
      }

      console.error("Order Accept Update Error:", updateError);
      return res.status(500).json({ error: "Failed to accept order.", details: updateError.message });
    }

    return res.json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error("Order Accept Catch Error:", err);
    return res.status(500).json({ error: "Internal server error accepting order." });
  }
});
app.patch("/api/orders/:id", authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const auth_user_id = (req as any).user.id;
    
    // Explicit allowed-field policy
    const forbiddenFields = [
      'total_price', 'subtotal', 'delivery_fee', 'service_fee', 
      'discount_amount', 'user_id', 'shop_id', 'customer_id', 'rider_id'
    ];
    for (const field of forbiddenFields) {
      delete updates[field];
    }
    
    if (supabaseAdmin) {
       let { data: order, error: orderError } = await supabaseAdmin.from('orders').select('user_id, shop_id').eq('id', id).single();
       if (orderError && orderError.code === "PGRST116") { orderError = null; order = null; } // allow fallback
       if (orderError || !order) {
           const memOrder = serverOrders.find(o => o.id === id);
           if (!memOrder) return res.status(404).json({ error: "Order not found" });
           if (memOrder.user_id !== auth_user_id) return res.status(403).json({ error: "Unauthorized" });
       }

       let isAuthorized = false;
       const resolvedOrder = order || serverOrders.find(o => o.id === id);
       if (resolvedOrder?.user_id === auth_user_id) {
          isAuthorized = true;
       } else {
          const { data: shop } = await supabaseAdmin.from('shops').select('owner_id').eq('id', order.shop_id).single();
          if (shop && shop.owner_id === auth_user_id) {
             isAuthorized = true;
          }
       }

       if (!isAuthorized) {
          return res.status(403).json({ error: "Unauthorized. You cannot modify this order." });
       }

       const { data, error } = await supabaseAdmin
         .from('orders')
         .update({
           ...updates,
           updated_at: new Date().toISOString()
         })
         .eq('id', id)
         .select()
         .single();
         
       if (!error && data) {
         return res.json({ success: true, order: data });
       } else {
         console.error("Native PATCH error:", error);
       }
    }
    
    // Fallback to in-memory if supabase fails or isn't configured
    const existingIdx = serverOrders.findIndex((o) => o.id === id);
    if (existingIdx >= 0) {
      serverOrders[existingIdx] = {
        ...serverOrders[existingIdx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return res.json({ success: true, order: serverOrders[existingIdx] });
    }
    const newOrder = {
      id,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    serverOrders.unshift(newOrder);
    return res.json({ success: true, order: newOrder });
  } catch (err: any) {
    console.error("Order update error:", err);
    return res.status(500).json({ error: err.message || "Failed to update order" });
  }
});
// API Endpoint to fetch orders for user or shop
app.get("/api/orders", authenticateJWT, async (req, res) => {
  const { shop_id } = req.query;
  const auth_user_id = (req as any).user.id;

  let filtered = [...serverOrders];

  if (shop_id) {
    // Merchant request
    if (!supabaseAdmin) return res.status(500).json({ error: "DB not configured" });
    const { data: shop, error: shopError } = await supabaseAdmin.from('shops').select('owner_id').eq('id', shop_id).single();
    if (shopError || !shop || shop.owner_id !== auth_user_id) {
       return res.status(403).json({ error: "Unauthorized. You do not own this shop." });
    }
    filtered = filtered.filter((o) => String(o.shop_id) === String(shop_id));
  } else {
    // Customer request
    filtered = filtered.filter((o) => String(o.user_id) === String(auth_user_id));
  }

  return res.json({ orders: filtered });
});
// API Endpoint for AI Powered Shop Chat Assistant
app.post("/api/shop-chat", async (req, res) => {
  try {
    const { shop, userProfile, messages, userQuery } = req.body;
    if (!userQuery) {
      return res.status(400).json({ error: "User query is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        reply: `Thanks for messaging ${shop?.name || "our shop"}! Our kitchen counter is currently preparing orders. Feel free to browse our signature menu items!`
      });
    }

    // Build context-rich prompt with menu items and prices
    const menuSummary = Array.isArray(shop?.items) && shop.items.length > 0
      ? shop.items.map((i: any) => `- ${i.name} (R${i.price}): ${i.description || "Freshly cooked local item"} [Category: ${i.category || "Main"}, Popular: ${i.isPopular ? "Yes" : "No"}]`).join("\n")
      : "Kota, Dagwood, Slap Chips, Fresh Juices, Braai Combos, and Local Specials.";

    const systemInstruction = `You are the friendly, AI-powered Kitchen Desk Assistant for "${shop?.name || "LocalEats Shop"}", an authentic South African eatery.
Shop Address: ${shop?.address || "Township / Local Center"}
Current Prep Time: ${shop?.delivery_eta || "20-30 mins"}
Customer Rating: ${shop?.rating || "4.8 ⭐"}

Menu Items & Prices:
${menuSummary}

Customer Info:
Name: ${userProfile?.full_name || "Valued Customer"}
Dietary Preferences: ${userProfile?.dietary_preferences?.join(", ") || "Standard"}

Instructions:
1. Act as the shop's real-time desk host. Be warm, welcoming, helpful, and energetic!
2. Answer queries about food recommendations, ingredients, prep time, payment methods (Cash on Delivery/Pickup supported), or custom order tweaks.
3. Use friendly South African culinary terms where natural (Kota, Slap chips, Atchar, Extra cheese, Polony, Wors, Braai).
4. Keep responses concise (2 to 4 sentences or a short bullet list) so it reads like a mobile chat message.
5. If the customer asks for something not explicitly listed, recommend the closest available item from the menu!`;

    const formattedHistory = Array.isArray(messages)
      ? messages.slice(-6).map((m: any) => `${m.sender === "user" ? "Customer" : "Shop Assistant"}: ${m.text}`).join("\n")
      : "";

    const fullPrompt = `${formattedHistory ? `Recent Chat History:\n${formattedHistory}\n\n` : ""}Customer Question: ${userQuery}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || `Welcome to ${shop?.name || "our shop"}! How can we serve you today?`;
    return res.json({ reply });
  } catch (err: any) {
    console.error("Gemini shop chat error:", err);
    return res.json({
      reply: `Thanks for reaching out! A kitchen team member at ${req.body?.shop?.name || "our shop"} received your query. Feel free to place your order anytime!`
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
