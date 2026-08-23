const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalChatListener.tsx', 'utf8');

code = `
import React, { useEffect, useRef } from "react";
import { Order } from "../types";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface GlobalChatListenerProps {
  activeOrders: Order[];
  currentScreen: string;
  onNavigateToTracking: () => void;
}

export function GlobalChatListener({ activeOrders, currentScreen, onNavigateToTracking }: GlobalChatListenerProps) {
  const seenMessages = useRef(new Set<string>());

  useEffect(() => {
    if (activeOrders.length === 0) return;

    const validOrders = activeOrders.filter(o => o.status !== "completed" && o.status !== "cancelled" && o.delivery_status !== "delivered");
    if (validOrders.length === 0) return;

    const orderIds = validOrders.map(o => String(o.id));
    
    // Firestore 'in' queries are limited to 10 items, slice if necessary
    const batches = [];
    for (let i = 0; i < orderIds.length; i += 10) {
      batches.push(orderIds.slice(i, i + 10));
    }

    const unsubs = batches.map(batch => {
      const q = query(collection(db, "messages"), where("order_id", "in", batch));
      return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const docId = change.doc.id;
            if (seenMessages.current.has(docId)) return;
            seenMessages.current.add(docId);

            const newMsg = change.doc.data();
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
        });
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [activeOrders, currentScreen, onNavigateToTracking]);

  return null;
}
`;

fs.writeFileSync('src/components/GlobalChatListener.tsx', code);
