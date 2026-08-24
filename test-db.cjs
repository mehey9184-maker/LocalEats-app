const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({
  projectId: "localeats-5e26e"
});
const db = getFirestore("ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe");

async function check() {
  try {
    const shop = await db.collection("shops").doc("18").get();
    console.log("Shop 18 exists:", shop.exists);
    const item = await db.collection("menu_items").doc("doc_1786657005423_bgzhw").get();
    console.log("Item exists:", item.exists);
  } catch (e) {
    console.error("Error:", e.message);
  }
}
check();
