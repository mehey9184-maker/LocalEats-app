import { supabase } from "../lib/supabase";
import { DEFAULT_COORDS, calculateDistance } from "../utils";
import { toast } from "sonner";

/**
 * Global auto-assignment service for riders.
 * Filters out cash and cash_on_arrival transactions, dispatching only digital prepaid orders.
 */
export const autoAssignClosestRiderService = async (
  orderId: string,
  customCoords?: { lat: number; lng: number }
) => {
  try {
    // 1. Exclude cash_on_arrival / cash orders from rider auto-assignment
    const { data: orderToCheck } = await supabase
      .from("orders")
      .select("id, shop_id, payment_method, is_delivery, latitude:lat, longitude:lng")
      .eq("id", orderId)
      .maybeSingle();

    if (orderToCheck) {
      const isCashOrder =
        orderToCheck.payment_method === "cash_on_arrival" ||
        orderToCheck.payment_method === "cash";
      if (isCashOrder) {
        console.log(
          `[AutoAssign] Order ${orderId} is cash/cash_on_arrival. Skipping rider assignment. Riders only receive digital prepaid orders.`
        );
        return;
      }
    }

    // 2. Fetch shop location if not provided
    let shopLat = customCoords?.lat || DEFAULT_COORDS.lat;
    let shopLng = customCoords?.lng || DEFAULT_COORDS.lng;

    if (!customCoords && orderToCheck?.shop_id) {
      const { data: shopData } = await supabase
        .from("shops")
        .select("latitude:lat, longitude:lng")
        .eq("id", orderToCheck.shop_id)
        .maybeSingle();
      if (shopData) {
        shopLat = Number(shopData.latitude) || shopLat;
        shopLng = Number(shopData.longitude) || shopLng;
      }
    }

    // 3. Get online, available riders
    const { data: onlineRiders, error: riderError } = await supabase
      .from("rider_profiles")
      .select("id, name, full_name, phone, avatar_url, vehicle_type, rating, latitude, longitude, is_online, current_order_id")
      .eq("is_online", true)
      .is("current_order_id", null);

    if (riderError || !onlineRiders || onlineRiders.length === 0) {
      console.log("[AutoAssign] No free riders available for auto-assignment");
      return;
    }

    // 4. Get active locations updated in the last 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: locations, error: locError } = await supabase
      .from("rider_locations")
      .select("rider_id, latitude, longitude, heading, speed, updated_at")
      .in(
        "rider_id",
        onlineRiders.map((r) => r.id)
      )
      .gt("updated_at", tenMinutesAgo);

    if (locError || !locations || locations.length === 0) {
      console.log("[AutoAssign] No recent rider locations found for auto-assignment");
      return;
    }

    // 5. Find the closest rider to the vendor location
    let closestRiderId: string | null = null;
    let minDistance = Infinity;

    locations.forEach((loc) => {
      const dist = calculateDistance(
        shopLat,
        shopLng,
        Number(loc.latitude),
        Number(loc.longitude)
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestRiderId = loc.rider_id;
      }
    });

    if (closestRiderId) {
      const { error: assignError } = await supabase
        .from("orders")
        .update({
          rider_id: closestRiderId,
          delivery_status: "rider_assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (assignError) throw assignError;

      await supabase
        .from("rider_profiles")
        .update({ current_order_id: orderId })
        .eq("id", closestRiderId);

      console.log(`[AutoAssign] Auto-assigned rider ${closestRiderId} to order ${orderId}`);
      toast.success(`Rider auto-assigned to Order #${orderId.slice(0, 5)}`, {
        description: "Assigned closest available digital courier partner.",
      });
    }
  } catch (err) {
    console.error("[AutoAssign] Auto-assignment failed:", err);
  }
};
