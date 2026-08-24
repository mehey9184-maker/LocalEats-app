"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
exports.calculateDistance = calculateDistance;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
// Initialize Firebase Admin SDK if not already initialized
if (!(0, app_1.getApps)().length) {
    (0, app_1.initializeApp)();
}
const db = (0, firestore_1.getFirestore)("ai-studio-localeatsvendord-a61b068b-3029-4d93-ba41-626b03a23bbe");
/**
 * Haversine formula to calculate great-circle distance between two GPS coordinates in kilometers.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2)
        return 0;
    const R = 6371; // Earth radius in km
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * toRad) *
            Math.cos(lat2 * toRad) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/**
 * Authoritative Server-Side Order Creation Firebase Callable Cloud Function.
 */
exports.createOrder = (0, https_1.onCall)({
    cors: true,
    maxInstances: 10,
}, async (request) => {
    // 1. Authenticate Request
    if (!request.auth || !request.auth.uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to place an order. Anonymous guest sessions are supported.");
    }
    const userId = request.auth.uid;
    // 2. Validate Request Shape & Essential Inputs
    const data = request.data;
    if (!data || typeof data !== "object") {
        throw new https_1.HttpsError("invalid-argument", "Missing request payload.");
    }
    const { idempotency_key, shop_id, items, delivery_type, delivery_schedule_mode, delivery_coordinates, promo_code, tip_amount, payment_method, customer_details, } = data;
    if (!idempotency_key || typeof idempotency_key !== "string" || !idempotency_key.trim()) {
        throw new https_1.HttpsError("invalid-argument", "A valid idempotency_key is required.");
    }
    if (!shop_id || (typeof shop_id !== "string" && typeof shop_id !== "number")) {
        throw new https_1.HttpsError("invalid-argument", "A valid shop_id is required.");
    }
    if (!Array.isArray(items) || items.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Order must contain at least one item.");
    }
    if (delivery_type !== "delivery" && delivery_type !== "collection") {
        throw new https_1.HttpsError("invalid-argument", "delivery_type must be 'delivery' or 'collection'.");
    }
    if (delivery_schedule_mode !== "standard" && delivery_schedule_mode !== "express") {
        throw new https_1.HttpsError("invalid-argument", "delivery_schedule_mode must be 'standard' or 'express'.");
    }
    if (delivery_type === "delivery") {
        if (!delivery_coordinates ||
            typeof delivery_coordinates.lat !== "number" ||
            typeof delivery_coordinates.lng !== "number" ||
            isNaN(delivery_coordinates.lat) ||
            isNaN(delivery_coordinates.lng) ||
            delivery_coordinates.lat < -90 ||
            delivery_coordinates.lat > 90 ||
            delivery_coordinates.lng < -180 ||
            delivery_coordinates.lng > 180) {
            throw new https_1.HttpsError("invalid-argument", "Valid delivery GPS coordinates (lat between -90 and 90, lng between -180 and 180) are required for delivery.");
        }
    }
    // Validate quantities
    for (const item of items) {
        if (!item.menu_item_id || typeof item.menu_item_id !== "string") {
            throw new https_1.HttpsError("invalid-argument", "Each item must have a valid menu_item_id.");
        }
        if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
            throw new https_1.HttpsError("invalid-argument", `Invalid quantity for item ${item.menu_item_id}. Must be positive integer.`);
        }
    }
    // Validate tip
    const rawTip = typeof tip_amount === "number" && isFinite(tip_amount) ? tip_amount : 0;
    if (rawTip < 0) {
        throw new https_1.HttpsError("invalid-argument", "Tip amount cannot be negative.");
    }
    const validatedTip = Number(Math.min(1000, rawTip).toFixed(2));
    const shopIdStr = String(shop_id);
    const orderRef = db.collection("orders").doc(idempotency_key);
    // 3. Check Idempotency First (Atomic Transaction)
    // Run atomic check and order creation
    const result = await db.runTransaction(async (transaction) => {
        const existingDoc = await transaction.get(orderRef);
        if (existingDoc.exists) {
            const existingData = existingDoc.data();
            if (existingData.user_id !== userId) {
                throw new https_1.HttpsError("permission-denied", "This order key is already assigned to a different user identity.");
            }
            return {
                success: true,
                order_id: idempotency_key,
                subtotal: Number(existingData.subtotal || 0),
                delivery_fee: Number(existingData.delivery_fee || 0),
                service_fee: Number(existingData.service_fee || 0),
                discount_amount: Number(existingData.discount_amount || 0),
                tip_amount: Number(existingData.tip_amount || 0),
                total_price: Number(existingData.total_price || 0),
                status: String(existingData.status || "pending"),
                delivery_status: String(existingData.delivery_status || "none"),
                message: "Order already processed with this idempotency key.",
            };
        }
        // 4. Retrieve Authoritative Shop Details
        const shopDocRef = db.collection("shops").doc(shopIdStr);
        const shopDoc = await transaction.get(shopDocRef);
        if (!shopDoc.exists) {
            throw new https_1.HttpsError("not-found", `Shop '${shopIdStr}' does not exist.`);
        }
        const shopData = shopDoc.data();
        const isShopActive = shopData.is_active !== false &&
            shopData.active !== false &&
            shopData.status !== "inactive";
        if (!isShopActive) {
            throw new https_1.HttpsError("failed-precondition", "This shop is currently inactive and cannot accept orders.");
        }
        const shopLat = Number(shopData.latitude ?? shopData.lat ?? shopData.location?.lat);
        const shopLng = Number(shopData.longitude ?? shopData.lng ?? shopData.location?.lng);
        const shopRadiusLimit = Number(shopData.shopRadiusLimit ??
            shopData.delivery_radius_km ??
            shopData.delivery_radius ??
            5.0);
        // 5. Retrieve Authoritative Menu Items and Compute Subtotal
        let calculatedSubtotal = 0;
        const orderItemsSnapshot = [];
        for (const reqItem of items) {
            let menuItemData = null;
            // Strategy A: Root `menu_items` collection
            const menuItemDocRef = db.collection("menu_items").doc(reqItem.menu_item_id);
            const menuItemDoc = await transaction.get(menuItemDocRef);
            if (menuItemDoc.exists) {
                menuItemData = menuItemDoc.data();
            }
            // Strategy B: Embedded shop menu array
            if (!menuItemData && Array.isArray(shopData.menu)) {
                menuItemData = shopData.menu.find((m) => String(m.id) === reqItem.menu_item_id);
            }
            // Strategy C: Embedded shop items array
            if (!menuItemData && Array.isArray(shopData.items)) {
                menuItemData = shopData.items.find((m) => String(m.id) === reqItem.menu_item_id);
            }
            if (!menuItemData) {
                throw new https_1.HttpsError("not-found", `Menu item '${reqItem.menu_item_id}' not found in shop catalog.`);
            }
            // Verify shop ownership
            const itemShopId = String(menuItemData.shop_id || menuItemData.shopId || menuItemData.store_id || shopIdStr);
            if (itemShopId !== shopIdStr) {
                throw new https_1.HttpsError("failed-precondition", `Menu item '${reqItem.menu_item_id}' does not belong to shop '${shopIdStr}'.`);
            }
            // Verify item availability
            const isItemAvailable = menuItemData.is_available !== false &&
                menuItemData.available !== false &&
                menuItemData.status !== "deleted" &&
                menuItemData.active !== false;
            if (!isItemAvailable) {
                throw new https_1.HttpsError("failed-precondition", `Menu item '${menuItemData.name || reqItem.menu_item_id}' is currently unavailable.`);
            }
            // Read authoritative price from Firestore (NEVER TRUST CLIENT PRICE)
            const authoritativeUnitPrice = Number(menuItemData.price || 0);
            if (authoritativeUnitPrice < 0 || isNaN(authoritativeUnitPrice)) {
                throw new https_1.HttpsError("failed-precondition", `Invalid price for item '${reqItem.menu_item_id}'.`);
            }
            const lineItemTotal = authoritativeUnitPrice * reqItem.quantity;
            calculatedSubtotal += lineItemTotal;
            orderItemsSnapshot.push({
                menu_item_id: reqItem.menu_item_id,
                name: String(menuItemData.name || menuItemData.title || "Menu Item"),
                price: Number(authoritativeUnitPrice.toFixed(2)),
                quantity: reqItem.quantity,
                notes: reqItem.notes || "",
                ...(reqItem.variant_id ? { variant_id: reqItem.variant_id } : {}),
            });
        }
        calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));
        // 6. Calculate Delivery Fee
        let calculatedDeliveryFee = 0;
        if (delivery_type === "collection") {
            calculatedDeliveryFee = 0.0;
        }
        else {
            if (isNaN(shopLat) || isNaN(shopLng)) {
                throw new https_1.HttpsError("failed-precondition", "Shop location coordinates are not configured for delivery.");
            }
            const distance = calculateDistance(shopLat, shopLng, delivery_coordinates.lat, delivery_coordinates.lng);
            let baseDeliveryFee = 0;
            if (distance <= 3.0) {
                baseDeliveryFee = 5.0;
            }
            else if (distance <= shopRadiusLimit) {
                baseDeliveryFee = 10.0;
            }
            else {
                throw new https_1.HttpsError("failed-precondition", `Delivery distance (${distance.toFixed(1)} km) exceeds the shop delivery limit (${shopRadiusLimit.toFixed(1)} km).`);
            }
            const expressFee = delivery_schedule_mode === "express" ? 10.0 : 0.0;
            calculatedDeliveryFee = Number((baseDeliveryFee + expressFee).toFixed(2));
        }
        // 7. Calculate Service Fee
        const calculatedServiceFee = calculatedSubtotal > 0 ? 2.5 : 0.0;
        // 8. Validate Promo Code & Calculate Discount
        let calculatedDiscount = 0;
        if (promo_code && typeof promo_code === "string" && promo_code.trim()) {
            const cleanCode = promo_code.trim().toUpperCase();
            const promoDocRef = db.collection("promo_codes").doc(cleanCode);
            const promoDoc = await transaction.get(promoDocRef);
            let promoData = null;
            if (promoDoc.exists) {
                promoData = promoDoc.data();
            }
            else {
                // Fallback query by code field
                const promoQuery = await db
                    .collection("promo_codes")
                    .where("code", "==", cleanCode)
                    .limit(1)
                    .get();
                if (!promoQuery.empty) {
                    promoData = promoQuery.docs[0].data();
                }
            }
            if (promoData) {
                const isPromoActive = promoData.is_active !== false && promoData.active !== false;
                if (!isPromoActive) {
                    throw new https_1.HttpsError("failed-precondition", `Promo code '${cleanCode}' is not active.`);
                }
                if (promoData.expiry_date) {
                    const expiry = new Date(promoData.expiry_date);
                    if (new Date() > expiry) {
                        throw new https_1.HttpsError("failed-precondition", `Promo code '${cleanCode}' has expired.`);
                    }
                }
                if (promoData.shop_id && String(promoData.shop_id) !== shopIdStr) {
                    throw new https_1.HttpsError("failed-precondition", `Promo code '${cleanCode}' is not valid for this shop.`);
                }
                if (promoData.min_order_amount && calculatedSubtotal < Number(promoData.min_order_amount)) {
                    throw new https_1.HttpsError("failed-precondition", `Minimum order subtotal of R${Number(promoData.min_order_amount).toFixed(2)} required for '${cleanCode}'.`);
                }
                if (cleanCode === "BICYCLE5" && delivery_type !== "delivery") {
                    throw new https_1.HttpsError("failed-precondition", "This voucher code is only valid for Delivery orders.");
                }
                const discountType = promoData.discount_type || promoData.type;
                const discountVal = Number(promoData.discount_value || promoData.value || 0);
                if (discountType === "percent" || discountType === "percentage") {
                    calculatedDiscount = (calculatedSubtotal * discountVal) / 100;
                }
                else if (discountType === "fixed") {
                    calculatedDiscount = Math.min(calculatedSubtotal, discountVal);
                }
                else if (discountType === "delivery_free") {
                    calculatedDiscount = Math.min(calculatedDeliveryFee, discountVal);
                }
                if (promoData.max_discount_amount && calculatedDiscount > Number(promoData.max_discount_amount)) {
                    calculatedDiscount = Number(promoData.max_discount_amount);
                }
            }
            else {
                throw new https_1.HttpsError("invalid-argument", `Promo code '${cleanCode}' is invalid.`);
            }
        }
        calculatedDiscount = Number(calculatedDiscount.toFixed(2));
        // 9. Calculate Authoritative Total
        const calculatedTotalPrice = Number(Math.max(0, calculatedSubtotal -
            calculatedDiscount +
            calculatedDeliveryFee +
            calculatedServiceFee +
            validatedTip).toFixed(2));
        // 10. Determine Initial Status and Delivery Status
        const isCash = payment_method === "cash" ||
            payment_method === "cash_on_arrival";
        const initialDeliveryStatus = isCash
            ? "none"
            : delivery_type === "delivery"
                ? "finding_rider"
                : "none";
        const secureDeliveryPin = delivery_type === "delivery"
            ? Math.floor(1000 + Math.random() * 9000).toString()
            : null;
        const customerName = customer_details?.name?.trim() || "Valued Customer";
        const customerPhone = customer_details?.phone?.trim() || "";
        const customerEmail = customer_details?.email?.trim() || "";
        const customerAddress = customer_details?.address?.trim() || "";
        const customerCity = customer_details?.city?.trim() || "Local";
        const deliveryInstructions = customer_details?.delivery_instructions?.trim() || "";
        // 11. Write Authoritative Order Document
        const nowIso = new Date().toISOString();
        const authoritativeOrderData = {
            id: idempotency_key,
            user_id: userId,
            shop_id: shopIdStr,
            created_at: nowIso,
            updated_at: nowIso,
            status: "pending",
            is_delivery: delivery_type === "delivery",
            order_type: delivery_type,
            delivery_status: initialDeliveryStatus,
            payment_method: payment_method || "cash",
            subtotal: calculatedSubtotal,
            delivery_fee: calculatedDeliveryFee,
            service_fee: calculatedServiceFee,
            discount_amount: calculatedDiscount,
            tip_amount: validatedTip,
            total_price: calculatedTotalPrice,
            items: orderItemsSnapshot,
            product_name: orderItemsSnapshot.length > 0
                ? `${orderItemsSnapshot[0].quantity}x ${orderItemsSnapshot[0].name}${orderItemsSnapshot.length > 1 ? ` + ${orderItemsSnapshot.length - 1} more` : ""}`
                : "Food Order",
            quantity: orderItemsSnapshot.reduce((acc, it) => acc + it.quantity, 0),
            customer_name: customerName,
            phone: customerPhone,
            email: customerEmail,
            address: customerAddress,
            city: customerCity,
            country: "South Africa",
            latitude: delivery_type === "delivery" ? delivery_coordinates.lat : null,
            longitude: delivery_type === "delivery" ? delivery_coordinates.lng : null,
            lat: delivery_type === "delivery" ? delivery_coordinates.lat : null,
            lng: delivery_type === "delivery" ? delivery_coordinates.lng : null,
            delivery_instructions: deliveryInstructions,
            delivery_pin: secureDeliveryPin,
            idempotency_key: idempotency_key,
        };
        transaction.set(orderRef, authoritativeOrderData);
        return {
            success: true,
            order_id: idempotency_key,
            subtotal: calculatedSubtotal,
            delivery_fee: calculatedDeliveryFee,
            service_fee: calculatedServiceFee,
            discount_amount: calculatedDiscount,
            tip_amount: validatedTip,
            total_price: calculatedTotalPrice,
            status: "pending",
            delivery_status: initialDeliveryStatus,
        };
    });
    return result;
});
//# sourceMappingURL=index.js.map