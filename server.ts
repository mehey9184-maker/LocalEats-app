import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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

// API Endpoint for resilient Profile Sync
app.post("/api/profiles", (req, res) => {
  try {
    const profile = req.body;
    if (!profile || (!profile.user_id && !profile.id)) {
      return res.status(400).json({ error: "user_id or id is required" });
    }
    const userId = profile.user_id || profile.id;
    serverProfiles[userId] = {
      ...serverProfiles[userId],
      ...profile,
      user_id: userId,
      id: userId,
      updated_at: new Date().toISOString(),
    };
    return res.json({ success: true, profile: serverProfiles[userId] });
  } catch (err: any) {
    console.error("Profile save error:", err);
    return res.status(500).json({ error: err.message || "Failed to save profile" });
  }
});

app.get("/api/profiles/:id", (req, res) => {
  const { id } = req.params;
  const profile = serverProfiles[id];
  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }
  return res.json({ profile });
});

// API Endpoint for resilient Order Placement & Sync
app.post("/api/orders", (req, res) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: "Orders array is required" });
    }

    for (const order of orders) {
      const itemPrice = Number(order.price) || 0;
      const itemQty = Math.max(1, Number(order.quantity) || 1);
      const itemDeliveryFee = Number(order.delivery_fee) || 0;
      const computedTotal = Number((itemPrice * itemQty + itemDeliveryFee).toFixed(2));
      const finalTotalPrice = order.total_price !== undefined && !isNaN(Number(order.total_price))
        ? Number(Number(order.total_price).toFixed(2))
        : computedTotal;

      // If price was 0 or missing but total_price was provided, reconstruct price with mathematical integrity
      const finalPrice = (itemPrice === 0 && finalTotalPrice > itemDeliveryFee)
        ? Number(((finalTotalPrice - itemDeliveryFee) / itemQty).toFixed(2))
        : itemPrice;

      const normalizedOrder = {
        ...order,
        price: finalPrice,
        quantity: itemQty,
        delivery_fee: itemDeliveryFee,
        total_price: Number((finalPrice * itemQty + itemDeliveryFee).toFixed(2)),
      };

      const existingIdx = serverOrders.findIndex((o) => o.id === order.id);
      if (existingIdx >= 0) {
        serverOrders[existingIdx] = { ...serverOrders[existingIdx], ...normalizedOrder, updated_at: new Date().toISOString() };
      } else {
        serverOrders.unshift({
          ...normalizedOrder,
          created_at: order.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Keep memory clean
    if (serverOrders.length > 500) {
      serverOrders.length = 500;
    }

    return res.json({ success: true, count: orders.length, orders: serverOrders.slice(0, 50) });
  } catch (err: any) {
    console.error("Order save error:", err);
    return res.status(500).json({ error: err.message || "Failed to process order" });
  }
});

// API Endpoint to patch/update order status (e.g. cancellation)
app.patch("/api/orders/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
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
app.get("/api/orders", (req, res) => {
  const { user_id, shop_id } = req.query;
  let filtered = [...serverOrders];
  if (user_id) {
    filtered = filtered.filter((o) => String(o.user_id) === String(user_id));
  }
  if (shop_id) {
    filtered = filtered.filter((o) => String(o.shop_id) === String(shop_id));
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
