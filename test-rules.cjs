const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const fs = require('fs');

async function runTests() {
  const testEnv = await initializeTestEnvironment({
    projectId: "demo-project",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "localhost",
      port: 8080
    }
  });

  const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" });
  const bob = testEnv.authenticatedContext("bob", { email: "bob@example.com" });
  const unauth = testEnv.unauthenticatedContext();

  try {
    // 1. Setup test data as admin
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection("shops").doc("shop1").set({ owner_id: "alice" });
      await db.collection("orders").doc("order1").set({ 
        shop_id: "shop1", user_id: "bob", status: "pending", total_price: 100 
      });
      await db.collection("orders").doc("order2").set({ 
        shop_id: "shop1", delivery_status: "finding_rider" 
      });
    });

    // 2. Client query test
    const bobDb = bob.firestore();
    console.log("Client query user_id == bob:", await assertSucceeds(bobDb.collection("orders").where("user_id", "==", "bob").get()).then(() => "SUCCESS").catch(e => "FAIL: " + e.message));
    
    // 3. Merchant query test
    const aliceDb = alice.firestore();
    console.log("Merchant query shop_id == shop1:", await assertSucceeds(aliceDb.collection("orders").where("shop_id", "==", "shop1").get()).then(() => "SUCCESS").catch(e => "FAIL: " + e.message));
    
    // 4. Rider query test
    console.log("Rider query delivery_status == finding_rider:", await assertSucceeds(bobDb.collection("orders").where("delivery_status", "==", "finding_rider").get()).then(() => "SUCCESS").catch(e => "FAIL: " + e.message));

    // 5. Unfiltered query test (App.tsx getAllOrders)
    console.log("getAllOrders query (no filters):", await assertFails(aliceDb.collection("orders").get()).then(() => "FAIL (EXPECTED)").catch(e => "SUCCESS (Allowed)"));

    // 6. Test update
    console.log("Merchant update total_price:", await assertFails(aliceDb.collection("orders").doc("order1").update({ total_price: 10 }))
      .then(() => "FAIL (EXPECTED)").catch(e => "SUCCESS (Allowed)"));

    console.log("Merchant update status:", await assertSucceeds(aliceDb.collection("orders").doc("order1").update({ status: "cooking" }))
      .then(() => "SUCCESS").catch(e => "FAIL: " + e.message));

  } catch (e) {
    console.error(e);
  } finally {
    await testEnv.cleanup();
  }
}
runTests();
