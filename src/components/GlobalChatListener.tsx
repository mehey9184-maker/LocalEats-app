import React, { useEffect } from "react";
import { supabase, getFreshChannel } from "../lib/supabase";
import { Order } from "../types";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

interface GlobalChatListenerProps {
  activeOrders: Order[];
  currentScreen: string;
  onNavigateToTracking: () => void;
}

export function GlobalChatListener({ activeOrders, currentScreen, onNavigateToTracking }: GlobalChatListenerProps) {
  useEffect(() => {
    if (activeOrders.length === 0) return;

    // Filter out orders that are completed or cancelled just in case
    const validOrders = activeOrders.filter(o => o.status !== "completed" && o.status !== "cancelled" && o.delivery_status !== "delivered");
    if (validOrders.length === 0) return;

    // Create a filter string for all active order IDs
    // e.g. order_id=in.(id1,id2,id3)
    const orderIds = validOrders.map(o => `"${o.id}"`).join(",");
    const filter = `order_id=in.(${orderIds})`;

    const channel = getFreshChannel('global_chat_notifications')
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_messages",
          filter: filter,
        },
        (payload) => {
          const newMsg = payload.new as any;
          const isRider =
            newMsg.sender_type === "rider" ||
            newMsg.sender_type === "driver" ||
            newMsg.sender_role === "rider" ||
            newMsg.sender_role === "driver";
          const msgText = newMsg.message || newMsg.message_text || newMsg.content || newMsg.text || "New message from courier";

          if (isRider && currentScreen !== "order-tracking") {
            toast("New Courier Message", {
              description: msgText,
              icon: <MessageCircle className="w-4 h-4 text-orange-500" />,
              action: {
                label: "View Chat",
                onClick: onNavigateToTracking,
              },
              duration: 8000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrders, currentScreen, onNavigateToTracking]);

  return null;
}
