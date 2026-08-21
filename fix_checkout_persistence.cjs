const fs = require('fs');
let file = fs.readFileSync('src/screens/CheckoutScreen.tsx', 'utf8');

const oldLogic = `        // Direct Firestore Real-time Persistence for live client and driver tracking
        try {
          await Promise.allSettled(
            cleanOrderData.map((ord) => FirestoreService.saveOrder(ord))
          );
        } catch (fsErr) {
          console.info("[Checkout] Firestore sync notice:", fsErr);
        }`;

const newLogic = `        // Direct Firestore Real-time Persistence for live client and driver tracking
        console.log(\`[CHECKOUT] Persisting order \${cleanOrderData.map(o => o.id).join(', ')}\`);
        const fsResults = await Promise.allSettled(
          cleanOrderData.map((ord) => FirestoreService.saveOrder(ord))
        );
        
        const failedFs = fsResults.filter(res => res.status === "rejected");
        if (failedFs.length > 0) {
          console.error(\`[CHECKOUT] Firestore persistence failed \${cleanOrderData.map(o => o.id).join(', ')}\`);
          if (failedFs.length === cleanOrderData.length) {
            throw new Error("Order submission failed: Could not persist to database.");
          } else {
            throw new Error("PARTIAL PERSISTENCE REQUIRES FUTURE TRANSACTION/ORDER-BATCH DESIGN");
          }
        }
        console.log(\`[CHECKOUT] Firestore persistence succeeded \${cleanOrderData.map(o => o.id).join(', ')}\`);`;

file = file.replace(oldLogic, newLogic);
fs.writeFileSync('src/screens/CheckoutScreen.tsx', file);
