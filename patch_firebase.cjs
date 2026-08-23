const fs = require('fs');
const code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const insertPos = code.indexOf('listenToOrderMessages(');
if (insertPos !== -1) {
  const newMethod = `
  async markMessagesAsRead(orderId: string, currentUserId: string): Promise<void> {
    try {
      const q = query(collection(db, "messages"), where("order_id", "==", String(orderId)), where("is_read", "==", false));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach((docSnap) => {
        if (docSnap.data().sender_id !== currentUserId) {
          batch.update(docSnap.ref, { is_read: true, read_at: new Date().toISOString() });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (e) {
      console.warn("[FirestoreService] markMessagesAsRead error:", e);
    }
  },
  `;
  const newCode = code.slice(0, insertPos) + newMethod + code.slice(insertPos);
  fs.writeFileSync('src/lib/firebase.ts', newCode);
}
