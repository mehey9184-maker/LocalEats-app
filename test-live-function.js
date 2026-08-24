import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("./firebase-applet-config.json"));
const app = initializeApp({
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey
});
const auth = getAuth(app);
const functions = getFunctions(app); 

async function runTests() {
  try {
    const userCred = await signInAnonymously(auth);
    console.log("Signed in anonymously as:", userCred.user.uid);

    const createOrder = httpsCallable(functions, "createOrder");

    console.log("\n--- Testing COLLECTION Order ---");
    const collectionPayload = {
      idempotency_key: "test-collection-" + Date.now(),
      shop_id: "18",
      items: [{ menu_item_id: "doc_1786657005423_bgzhw", quantity: 1 }],
      delivery_type: "collection",
      delivery_schedule_mode: "standard",
      tip_amount: 0,
      payment_method: "cash",
      customer_details: {
        name: "Test User",
        phone: "+27820000000",
        email: "test@example.com",
        address: "N/A",
        city: "Tembisa",
        delivery_instructions: ""
      }
    };
    const colRes = await createOrder(collectionPayload);
    console.log("Collection order success:", colRes.data);
  } catch (e) {
    console.error("Test failed:", e.message);
  } finally {
    process.exit(0);
  }
}
runTests();
