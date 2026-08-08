import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, X, MessageCircle, Store, Sparkles, Clock, CheckCheck, Loader2 } from "lucide-react";
import { BlurUpImage } from "./BlurUpImage";
import { Shop } from "../types";
import { audioHelper } from "../lib/audioHelper";

interface Message {
  id: string;
  sender: "user" | "shop";
  text: string;
  time: string;
}

interface ShopChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  userProfile?: any;
}

const QUICK_PROMPTS = [
  "🍔 What's your top recommended meal?",
  "🔥 What are your current popular specials?",
  "⏱️ How long is prep time right now?",
  "💵 Is Cash on Delivery accepted?",
  "🥬 Do you have vegetarian or halal options?"
];

export function ShopChatModal({ isOpen, onClose, shop, userProfile }: ShopChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with warm welcome message when opened
  useEffect(() => {
    if (isOpen) {
      const initialMessage: Message = {
        id: "msg-welcome",
        sender: "shop",
        text: `Hi ${userProfile?.full_name ? userProfile.full_name.split(" ")[0] : "there"}! 👋 Welcome to ${shop.name}. I'm your AI Kitchen Assistant. How can I help with recommendations, prep time, or order customisations today?`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([initialMessage]);
    }
  }, [isOpen, shop.name, userProfile?.full_name]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  const generateShopReply = (userQuery: string): string => {
    const queryLower = userQuery.toLowerCase();

    if (queryLower.includes("recommend") || queryLower.includes("top") || queryLower.includes("special") || queryLower.includes("popular")) {
      return `Our customers love our signature items at ${shop.name}! You can check out our featured items on the menu tab. Everything is freshly prepared on order.`;
    }
    if (queryLower.includes("time") || queryLower.includes("prep") || queryLower.includes("long") || queryLower.includes("eta")) {
      return `Our current estimated preparation time is around ${shop.delivery_eta || "20-30 mins"}. We start cooking as soon as your order is confirmed!`;
    }
    if (queryLower.includes("cash") || queryLower.includes("payment") || queryLower.includes("pay")) {
      return `Yes! We accept both Cash on Arrival / Pickup and secure in-app payments. Pick whichever is most convenient for you.`;
    }
    if (queryLower.includes("halal") || queryLower.includes("veg") || queryLower.includes("diet")) {
      return `We take special care with dietary preferences. You can add specific kitchen instructions to any menu item when adding it to your cart!`;
    }
    if (queryLower.includes("location") || queryLower.includes("where") || queryLower.includes("address")) {
      return `We are located at ${shop.address || "in town"}. You can also tap 'Directions' on our shop page for exact navigation!`;
    }

    return `Thanks for reaching out! A kitchen team member at ${shop.name} has received your message. Feel free to place your order or ask any other questions!`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    if (!textToSend) setInputText("");

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      time: now,
    };

    const currentHistory = [...messages, userMsg];
    setMessages(currentHistory);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10);
    }

    setIsTyping(true);

    try {
      const response = await fetch("/api/shop-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          userProfile,
          messages: currentHistory,
          userQuery: text,
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();
      const replyText = data.reply || generateShopReply(text);

      const shopMsg: Message = {
        id: `shop-${Date.now()}`,
        sender: "shop",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, shopMsg]);
      try { audioHelper.play("alert"); } catch { /* ignore */ }
    } catch (err) {
      // Fallback if offline or server endpoint unavailable
      const replyText = generateShopReply(text);
      const shopMsg: Message = {
        id: `shop-${Date.now()}`,
        sender: "shop",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, shopMsg]);
      try { audioHelper.play("alert"); } catch { /* ignore */ }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[100]"
          />

          {/* Chat Window Container */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-[420px] bg-white dark:bg-slate-900 border-t md:border border-slate-200 dark:border-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden h-[85vh] md:h-[600px] max-w-full"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center font-black text-white text-lg overflow-hidden border border-white/20">
                    {shop.logo ? (
                      <BlurUpImage src={shop.logo} alt={shop.name} className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm line-clamp-1 flex items-center gap-1.5">
                    {shop.name}
                    <span className="bg-gradient-to-r from-orange-500/40 to-amber-500/40 text-orange-200 text-[9px] px-2 py-0.5 rounded-full uppercase font-extrabold tracking-wider border border-orange-400/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      AI Kitchen Desk
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    Kitchen Desk Active • Typically replies instantly
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90 cursor-pointer"
                title="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Prompts Bar */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 border-b border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 pl-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-500" /> Quick:
              </span>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-full text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50">
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-orange-600 text-white font-medium rounded-tr-xs shadow-md shadow-orange-600/10"
                          : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-normal rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80 shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold mt-1 px-1 flex items-center gap-1">
                      {msg.time}
                      {isUser && <CheckCheck className="w-3 h-3 text-orange-500" />}
                    </span>
                  </div>
                );
              })}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex flex-col items-start">
                  <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm">
                    <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                    <span className="text-[11px] text-slate-500 font-medium">
                      {shop.name} is typing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask ${shop.name} a question...`}
                className="flex-1 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-orange-500 rounded-full px-4 py-2.5 text-xs font-medium focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="w-10 h-10 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-md shadow-orange-600/20 active:scale-95"
                title="Send Message"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
