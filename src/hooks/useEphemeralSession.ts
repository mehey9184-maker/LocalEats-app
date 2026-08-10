"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { CartItem } from "../types";

/**
 * Custom React Hook: useEphemeralSession
 * Architected to support the "Anonymous Handshake" Pattern.
 * Automatically initializes and preserves an offline-resilient guest token,
 * and provides state-merging logic to migrate guest carts to active user profiles.
 */
export function useEphemeralSession() {
  const [guestToken, setGuestToken] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let token = localStorage.getItem("localeats_guest_token");
    if (!token) {
      // Generate highly unique UUID or secure fallback identifier
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        token = crypto.randomUUID();
      } else {
        token = "guest_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      }
      localStorage.setItem("localeats_guest_token", token);
    }
    setGuestToken(token);
  }, []);

  /**
   * syncCartWithAccount
   * Merges the ephemeral guest cart items with the active user's persistent cart,
   * then deletes the guest-session DB entry and keeps localStorage synced.
   * 
   * @param userId Authenticated user's unique identifier
   */
  const syncCartWithAccount = useCallback(async (userId: string) => {
    if (!guestToken) {
      return { success: false, error: "Guest session has not been initialized." };
    }

    try {
      // 1. Fetch ephemeral cart from the DB buffer
      const { data: guestCartData, error: guestFetchError } = await supabase
        .from("guest_carts")
        .select("items")
        .eq("guest_token", guestToken)
        .maybeSingle();

      if (guestFetchError) {
        console.info("[useEphemeralSession] Note fetching guest cart:", guestFetchError.message);
        return { success: false, error: guestFetchError.message };
      }

      // If no guest cart items are buffered, exit gracefully
      if (!guestCartData || !guestCartData.items) {
        return { success: true, message: "No buffered guest cart found to merge." };
      }

      const guestItems: CartItem[] = Array.isArray(guestCartData.items)
        ? (guestCartData.items as CartItem[])
        : [];

      if (guestItems.length === 0) {
        return { success: true, message: "Guest cart is empty." };
      }

      // 2. Fetch authenticated user's permanent cart (or initialize empty array if first time)
      const { data: userCartData, error: userFetchError } = await supabase
        .from("active_carts")
        .select("items")
        .eq("user_id", userId)
        .maybeSingle();

      if (userFetchError && userFetchError.code !== "PGRST116") { // PGRST116 is code for 0 rows returned
        console.info("[useEphemeralSession] Note fetching user cart:", userFetchError.message);
        return { success: false, error: userFetchError.message };
      }

      const userItems: CartItem[] = userCartData && Array.isArray(userCartData.items)
        ? (userCartData.items as CartItem[])
        : [];

      // 3. Merge quantities for identical items, otherwise append
      const mergedMap = new Map<string, CartItem>();

      // Populate with existing user items
      userItems.forEach((item) => {
        if (item && item.id) {
          mergedMap.set(item.id, { ...item });
        }
      });

      // Merge guest items
      guestItems.forEach((item) => {
        if (item && item.id) {
          if (mergedMap.has(item.id)) {
            const existing = mergedMap.get(item.id)!;
            existing.quantity += item.quantity;
          } else {
            mergedMap.set(item.id, { ...item });
          }
        }
      });

      const finalMergedItems = Array.from(mergedMap.values());

      // 4. Update the authenticated user's permanent cart in Supabase
      const { error: upsertError } = await supabase
        .from("active_carts")
        .upsert({
          user_id: userId,
          items: finalMergedItems,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.info("[useEphemeralSession] Note upserting merged cart:", upsertError.message);
        return { success: false, error: upsertError.message };
      }

      // 5. Update local storage for immediate UI rendering and consistency
      if (typeof window !== "undefined") {
        const localCart = JSON.parse(localStorage.getItem("cart") || "[]") as CartItem[];
        const localMap = new Map<string, CartItem>();
        
        localCart.forEach((item) => {
          if (item && item.id) localMap.set(item.id, item);
        });

        finalMergedItems.forEach((item) => {
          if (item && item.id) {
            if (localMap.has(item.id)) {
              const localItem = localMap.get(item.id)!;
              localItem.quantity = Math.max(localItem.quantity, item.quantity);
            } else {
              localMap.set(item.id, item);
            }
          }
        });

        localStorage.setItem("cart", JSON.stringify(Array.from(localMap.values())));
      }

      // 6. Delete the ephemeral guest record (POPIA compliance / Data minimization)
      const { error: deleteError } = await supabase
        .from("guest_carts")
        .delete()
        .eq("guest_token", guestToken);

      if (deleteError) {
        console.warn("[useEphemeralSession] Non-blocking: Could not purge guest_cart DB entry:", deleteError);
      }

      return { success: true, mergedCount: finalMergedItems.length };
    } catch (err: any) {
      console.error("[useEphemeralSession] Synchronizing cart error:", err);
      return { success: false, error: err.message || String(err) };
    }
  }, [guestToken]);

  return {
    guestToken,
    syncCartWithAccount
  };
}
