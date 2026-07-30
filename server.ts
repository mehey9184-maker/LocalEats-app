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
