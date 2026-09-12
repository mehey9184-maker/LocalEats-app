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

const proxyCatalog = async (path: string, res: express.Response) => {
  const configured = process.env.LOCALEATS_API_URL || process.env.VITE_LOCALEATS_API_URL;
  if (!configured?.trim()) return res.status(503).json({ success: false, error: "Catalog service unavailable." });
  try {
    const upstream = await fetch(configured.trim().replace(/\/+$/, "") + "/api/v1/catalog" + path, {
      method: "GET", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(15000),
    });
    if (!upstream.headers.get("content-type")?.includes("application/json")) throw new Error("Invalid upstream response");
    const data = await upstream.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid upstream JSON");
    res.setHeader("Cache-Control", "no-store");
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(503).json({ success: false, error: "Catalog service unavailable." });
  }
};
app.get("/api/v1/shops", (_req, res) => proxyCatalog("/shops", res));
app.get("/api/v1/shops/:shopId/menu", (req, res) =>
  proxyCatalog("/shops/" + encodeURIComponent(req.params.shopId) + "/menu", res));

const getAuthoritativeOrderApiUrl = (): string | null => {
  const configured = process.env.LOCALEATS_API_URL || process.env.VITE_LOCALEATS_API_URL;
  return configured ? configured.replace(/\/$/, "") : null;
};

const proxyAuthoritativeOrderRequest = async (req: express.Request, res: express.Response) => {
  const apiUrl = getAuthoritativeOrderApiUrl();
  if (!apiUrl) {
    return res.status(503).json({
      success: false,
      error: "Authoritative LocalEats order service is not configured. No order was placed or changed.",
    });
  }

  const suffix = req.params.id ? `/${req.params.id}` : "";
  const targetUrl = `${apiUrl}/api/v1/orders${suffix}`;
  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      ...(req.method === "GET" || req.method === "HEAD" ? {} : { body: JSON.stringify(req.body ?? {}) }),
    });
    const responseBody = await upstream.text();
    res.status(upstream.status);
    res.type(upstream.headers.get("content-type") || "application/json");
    return res.send(responseBody);
  } catch (error) {
    console.error("Authoritative order API proxy failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(503).json({
      success: false,
      error: "Authoritative LocalEats order service is unavailable. No order was placed or changed.",
    });
  }
};

app.post("/api/orders", authenticateJWT, proxyAuthoritativeOrderRequest);
app.get("/api/orders", authenticateJWT, proxyAuthoritativeOrderRequest);
app.get("/api/orders/:id", authenticateJWT, proxyAuthoritativeOrderRequest);
app.patch("/api/orders/:id", authenticateJWT, (_req, res) =>
  res.status(405).json({
    success: false,
    error: "Generic order updates are disabled. Use an authorized order transition endpoint.",
  }),
);

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
      : "No menu information provided. Do not invent menu items.";

    const systemInstruction = `You are the friendly, AI-powered Kitchen Desk Assistant for "${shop?.name || "LocalEats Shop"}", an authentic South African eatery.
Shop Address: ${shop?.address || "Location unavailable"}
Current Prep Time: ${shop?.delivery_eta || "ETA unavailable"}
Customer Rating: ${shop?.rating ?? "Unrated"}

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
