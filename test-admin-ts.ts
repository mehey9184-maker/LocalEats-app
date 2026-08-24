import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp({ projectId: "localeats-5e26e" });
const db = getFirestore("ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe");
async function check() {
  try {
    await db.collection("shops").doc("18").get();
    console.log("SUCCESS");
  } catch(e: any) {
    console.error("FAIL", e.message);
  }
}
check();
