const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ projectId: "localeats-5e26e" });
const db = getFirestore("ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe");

async function check() {
  try {
    const shop = await db.collection("shops").doc("18").get();
    console.log("Success! Shop exists:", shop.exists);
  } catch (e) {
    console.error("Admin SDK DB Error:", e.message);
  }
}
check();
