const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWidget.tsx', 'utf8');

// Replace import
code = code.replace('import { supabase, getFreshChannel } from "../lib/supabase";', '');

// Replace markAsRead
code = code.replace(/const markAsRead = async \(\) => \{[\s\S]*?markAsRead\(\);/m, `
      const currentUserId = userId || "guest_user";
      const markAsRead = async () => {
        await FirestoreService.markMessagesAsRead(orderId, currentUserId);
        if (onUnreadCountChange) onUnreadCountChange(0);
      };
      markAsRead();
`);

// Replace handleSend supabase logic
const handleSendReplacement = `
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
`;
// find where handleSend supabase logic starts
// we will just replace the body of handleSend
code = code.replace(/const handleSend = async \(e: React.FormEvent\) => \{[\s\S]*?  const formatTime/m, `const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isActive || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsSending(true);
${handleSendReplacement}
  const formatTime`);

fs.writeFileSync('src/components/ChatWidget.tsx', code);
