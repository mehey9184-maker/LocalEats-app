import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, X, Loader2, Bike, CheckCheck, User } from "lucide-react";

import { FirestoreService } from "../lib/firebase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  user_id?: string;
  sender_type?: "user" | "rider" | string;
  sender_role?: "user" | "rider" | "driver" | "customer" | "merchant" | "system" | string;
  sender_name?: string;
  message_text?: string;
  content?: string;
  message?: string;
  text?: string;
  is_read?: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface ChatWidgetProps {
  orderId: string;
  userId: string;
  riderName?: string;
  isActive: boolean;
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function ChatWidget({
  orderId,
  userId,
  riderName = "Courier",
  isActive,
  isOpen,
  onClose,
  onUnreadCountChange,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Helper to check if a message belongs to current user
  const isUserMessage = (m: ChatMessage) => {
    return (
      m.sender_id === userId ||
      m.sender_type === "customer" ||
      m.sender_role === "customer" ||
      m.sender_type === "client" ||
      m.sender_type === "user" ||
      m.sender_role === "user" ||
      (m.user_id && m.user_id === userId)
    );
  };

  // Helper to extract message text across schema field variations
  const getMessageText = (m: ChatMessage) => {
    return m.message || m.message_text || m.content || m.text || "";
  };

  // Deduplicating append helper
  const appendMessage = (newMsg: ChatMessage) => {
    setMessages((prev) => {
      if (
        prev.some(
          (m) =>
            m.id === newMsg.id ||
            (m.created_at === newMsg.created_at && getMessageText(m) === getMessageText(newMsg))
        )
      ) {
        return prev;
      }
      const updated = [...prev, newMsg];
      const unread = updated.filter(
        (m) => (!m.read_at && !m.is_read) && !isUserMessage(m)
      ).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
      return updated;
    });
  };

  // Fetch messages with network reconnect sync
  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    // Timeout safety fallback (2 seconds) so loading state never gets stuck indefinitely
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 2000);

    const unsubscribe = FirestoreService.listenToOrderMessages(orderId, (list) => {
      if (isMounted) {
        setMessages(list as ChatMessage[]);
        clearTimeout(timeoutId);
        setIsLoading(false);
        const unread = list.filter(
          (m: ChatMessage) => (!m.read_at && !m.is_read) && !isUserMessage(m)
        ).length;
        if (onUnreadCountChange) onUnreadCountChange(unread);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [orderId, userId, riderName, onUnreadCountChange]);

  // Mark unread messages as read when modal opens
  useEffect(() => {
    if (isOpen && orderId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

      const currentUserId = userId || "guest_user";
      const markAsRead = async () => {
        await FirestoreService.markMessagesAsRead(orderId, currentUserId);
        if (onUnreadCountChange) onUnreadCountChange(0);
      };
      markAsRead();

    }
  }, [isOpen, messages.length, orderId, userId, onUnreadCountChange]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isActive || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);

    const effectiveSenderId = userId || "guest_user";
    const effectiveOrderId = orderId;

    try {
      await FirestoreService.sendMessage(effectiveOrderId, effectiveSenderId, "customer", messageText);
      setIsSending(false);
    } catch (err) {
      console.error("Failed to send message", err);
      setIsSending(false);
    }
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-[420px] bg-white dark:bg-slate-900 border-t md:border border-slate-200 dark:border-slate-800 rounded-t-3xl md:rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden h-[85vh] md:h-[580px] max-w-full"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-lg border border-orange-500/30">
                    <Bike className="w-5 h-5 text-orange-400" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-white text-sm line-clamp-1 flex items-center gap-1.5">
                    {riderName}
                    <span className="bg-orange-500/30 text-orange-300 text-[9px] px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider">
                      Rider Chat
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">
                    {isActive ? "Active Delivery Session" : "Delivery Session Ended"}
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

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/50 min-h-[250px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-12 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-500">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  <p className="text-xs font-bold text-center max-w-[220px]">
                    Direct line with your rider. Send delivery updates or location instructions!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = isUserMessage(msg);
                  const text = msg.message_text || msg.content || "";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? "bg-orange-600 text-white font-medium rounded-tr-xs shadow-md shadow-orange-600/10"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-normal rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80 shadow-sm"
                        }`}
                      >
                        {text}
                      </div>
                      <span className="text-[9px] text-slate-400 font-bold mt-1 px-1 flex items-center gap-1">
                        {formatTime(msg.created_at)}
                        {isUser && <CheckCheck className="w-3 h-3 text-orange-500" />}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
              {!isActive ? (
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Delivery Complete
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    This order session has concluded.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${riderName}...`}
                    disabled={isSending}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-orange-500 rounded-full px-4 py-2.5 text-xs font-medium focus:outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="w-10 h-10 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-md shadow-orange-600/20 active:scale-95"
                    title="Send Message"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export DeliveryChatWidget as alias for backward compatibility
export const DeliveryChatWidget = (props: {
  orderId: string;
  userId: string;
  riderName?: string;
  isActive: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-full shadow-xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
      <ChatWidget
        {...props}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
