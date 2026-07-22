import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  RefreshCw,
  Phone,
  ClipboardList,
  Info,
  ChevronUp,
  ChevronDown,
  Check,
  Headset,
  Ban,
  AlertCircle,
  Loader2,
  Clock,
  MapPin,
  Utensils,
  Truck,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Order, Shop } from "../types";
import { supabase } from "../lib/supabase";
import { safeLocalStorageGet, safeLocalStorageSet, formatRand } from "../utils";
import { ChatWidget, DeliveryChatWidget } from "../components/ChatWidget";

interface RealTimeCountdownProps {
  createdAt: string;
  status: string;
  isDelivery?: boolean;
}

export function RealTimeCountdown({ createdAt, status, isDelivery }: RealTimeCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    let orderTime = new Date(createdAt).getTime();
    if (isNaN(orderTime)) {
      orderTime = Date.now();
    }
    
    // Kitchen preparation takes 15 mins. Delivery adds another 10 mins (total 25 mins).
    const prepDurationMs = 15 * 60 * 1000;
    const deliveryDurationMs = 10 * 60 * 1000;
    
    const targetDuration = isDelivery ? (prepDurationMs + deliveryDurationMs) : prepDurationMs;
    const targetTime = orderTime + targetDuration;

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      
      if (status === "completed" || status === "delivered") {
        setSecondsLeft(0);
      } else if (status === "cancelled") {
        setSecondsLeft(null);
      } else {
        setSecondsLeft(diff);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt, status, isDelivery]);

  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 mt-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        Order cancelled
      </div>
    );
  }

  if (status === "completed" || status === "delivered" || secondsLeft === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 mt-2 animate-pulse">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Arrived & Delivered!
      </div>
    );
  }

  if (secondsLeft === null) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const totalSeconds = isDelivery ? 25 * 60 : 15 * 60;
  const percentage = Math.min(100, Math.max(0, (secondsLeft / totalSeconds) * 100));

  const radius = 18;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 rounded-[24px] mt-3 shadow-xs w-full">
      <div className="flex items-center gap-3">
        <div className="relative size-12 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="24"
              cy="24"
              r={radius}
              className="stroke-slate-100 dark:stroke-slate-850 fill-transparent"
              strokeWidth={strokeWidth}
            />
            <motion.circle
              cx="24"
              cy="24"
              r={radius}
              className="stroke-orange-500 dark:stroke-orange-400 fill-transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "linear" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-orange-500">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
        </div>

        <div>
          <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
            {status === "ready" ? "Rider Transfer" : "Estimated Food Prep"}
          </h5>
          <p className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 leading-none">
            {status === "ready" ? "On the way" : "Crafting your order"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span className="font-mono text-base font-black text-orange-600 dark:text-orange-400 tracking-tight leading-none">
          {formattedTime}
        </span>
        <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1.5 leading-none animate-pulse">
          Remaining
        </span>
      </div>
    </div>
  );
}

export function DetailedKitchenStatus({ createdAt, status }: { createdAt: string; status: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const orderTime = new Date(createdAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((now - orderTime) / 60000));

  const milestones = useMemo(() => {
    if (status === "pending") {
      return [
        { label: "Order transmitted to kitchen", done: true, current: false },
        { label: "Awaiting shop owner acceptance & prep queue", done: elapsedMinutes >= 1.5, current: elapsedMinutes < 1.5 },
        { label: "Kitchen ingredient allocation", done: false, current: elapsedMinutes >= 1.5 },
      ];
    } else if (status === "preparing" || status === "confirmed") {
      return [
        { label: "Order accepted by shop owner", done: true, current: false },
        { label: "Ingredients prepped & portioned by chef", done: elapsedMinutes >= 4, current: elapsedMinutes < 4 },
        { label: "Cooking / Grilling in progress", done: elapsedMinutes >= 8, current: elapsedMinutes >= 4 && elapsedMinutes < 8 },
        { label: "Meal plated & quality-inspected", done: elapsedMinutes >= 12, current: elapsedMinutes >= 8 && elapsedMinutes < 12 },
        { label: "Packed in warmth-retaining thermal packaging", done: false, current: elapsedMinutes >= 12 },
      ];
    } else if (status === "ready") {
      return [
        { label: "Cooking completed & inspected", done: true, current: false },
        { label: "Packed in heat-resistant dispatch bundle", done: true, current: false },
        { label: "Food ready! Awaiting driver pickup or hand-over", done: false, current: true },
      ];
    } else {
      return [
        { label: "Food prepared & hand over complete", done: true, current: false },
        { label: "Delivered safely - Enjoy!", done: true, current: false },
      ];
    }
  }, [status, elapsedMinutes]);

  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-150/40 dark:border-slate-800/80 mt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 leading-none">
          <span className="size-1.5 rounded-full bg-orange-600 animate-pulse" />
          Kitchen Timeline Status
        </h4>
        <span className="text-[8px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded leading-none animate-pulse">
          Live Tracker
        </span>
      </div>

      <div className="space-y-3">
        {milestones.map((milestone, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs">
            <div className="mt-0.5 flex flex-col items-center shrink-0">
              <div
                className={`size-4.5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  milestone.done
                    ? "bg-emerald-500 border-emerald-550 text-white"
                    : milestone.current
                    ? "bg-orange-500/10 border-orange-500 text-orange-600 animate-pulse scale-105"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-300"
                }`}
              >
                {milestone.done ? (
                  <Check className="w-2.5 h-2.5 stroke-[4]" />
                ) : milestone.current ? (
                  <span className="size-1.5 rounded-full bg-orange-500 animate-ping" />
                ) : (
                  <span className="size-1.5 rounded-full bg-slate-350 dark:bg-slate-600" />
                )}
              </div>
              {idx < milestones.length - 1 && (
                <div
                  className={`w-[1px] h-4 transition-colors duration-300 ${
                    milestone.done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-[11px] font-semibold leading-tight transition-colors ${
                  milestone.done
                    ? "text-slate-400 line-through dark:text-slate-500"
                    : milestone.current
                    ? "text-slate-900 font-extrabold dark:text-white"
                    : "text-slate-400 dark:text-slate-650"
                }`}
              >
                {milestone.label}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function cleanInstructionsForDisplay(instr?: string) {
  if (!instr) return "";
  return instr.replace(/^📍\s*/, "").trim();
}

export function OrderTrackingScreen({
  orders,
  shops,
  onBack,
  showAlert,
  triggerHaptic,
  syncOfflineOrders,
}: {
  orders: Order[];
  shops: Shop[];
  onBack: () => void;
  showAlert: (title: string, message: string) => void;
  triggerHaptic?: (pattern?: number | number[]) => void;
  syncOfflineOrders?: () => Promise<void>;
}) {
  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
  }>({ isOpen: false, orderId: null });
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [offlineOrders, setOfflineOrders] = useState<any[]>(() => {
    return safeLocalStorageGet("offline_orders_queue", []);
  });
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return safeLocalStorageGet("localeats_order_notifications", true);
  });
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [riders, setRiders] = useState<Record<string, any>>({});
  const [openChatOrderId, setOpenChatOrderId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Fetch unread chat message counts for active delivery orders where read_at is NULL
  useEffect(() => {
    if (!localOrders || localOrders.length === 0) return;

    const activeDeliveryOrders = localOrders.filter(
      (o) => o.is_delivery && o.status !== "completed" && o.status !== "cancelled"
    );

    const fetchUnreadCounts = async () => {
      for (const ord of activeDeliveryOrders) {
        try {
          const { count, error } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("order_id", ord.id)
            .is("read_at", null)
            .neq("sender_id", ord.user_id);

          if (!error && count !== null) {
            setUnreadCounts((prev) => ({ ...prev, [ord.id]: count }));
          } else {
            // Fallback for is_read boolean if read_at is not populated
            const { count: isReadCount } = await supabase
              .from("chat_messages")
              .select("id", { count: "exact", head: true })
              .eq("order_id", ord.id)
              .eq("is_read", false)
              .neq("sender_id", ord.user_id);

            if (isReadCount !== null) {
              setUnreadCounts((prev) => ({ ...prev, [ord.id]: isReadCount }));
            }
          }
        } catch (err) {
          console.error("Error fetching unread chat count:", err);
        }
      }
    };

    fetchUnreadCounts();

    // Subscribe to new chat messages to update unread badge in real-time
    const channel = supabase
      .channel("order_tracking_chat_unread_badge")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg && newMsg.order_id) {
            const match = localOrders.find((o) => o.id === newMsg.order_id);
            if (match && newMsg.sender_id !== match.user_id && !newMsg.read_at && !newMsg.is_read) {
              setUnreadCounts((prev) => ({
                ...prev,
                [newMsg.order_id]: (prev[newMsg.order_id] || 0) + 1,
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [localOrders]);

  // Touch/drag tracking state for Pull-to-Refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const startYRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleOrderDetails = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  useEffect(() => {
    const handleSyncSuccess = () => {
      const freshQueue = safeLocalStorageGet("offline_orders_queue", []);
      setOfflineOrders(freshQueue);
    };
    window.addEventListener("local-orders-synced", handleSyncSuccess);
    return () => window.removeEventListener("local-orders-synced", handleSyncSuccess);
  }, []);

  const handleRetrySync = async (orderId: string) => {
    setRetryingOrderId(orderId);
    triggerHaptic?.(10);
    try {
      if (syncOfflineOrders) {
        await syncOfflineOrders();
        // Reload after a short delay
        setTimeout(() => {
          setOfflineOrders(safeLocalStorageGet("offline_orders_queue", []));
          setRetryingOrderId(null);
        }, 1200);
      } else {
        toast.error("Offline sync is currently unavailable. Please check your network.");
        setRetryingOrderId(null);
      }
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || String(err)));
      setRetryingOrderId(null);
    }
  };

  // Fetch rider profiles for active delivery orders
  useEffect(() => {
    const fetchRiderProfiles = async () => {
      const riderIds = Array.from(
        new Set(localOrders.map((o) => o.rider_id).filter(Boolean))
      ) as string[];
      if (riderIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from("rider_profiles")
          .select("*")
          .in("id", riderIds);
        if (data) {
          const profilesRecord: Record<string, any> = {};
          data.forEach((p) => {
            profilesRecord[p.id] = p;
          });
          setRiders((prev) => ({ ...prev, ...profilesRecord }));
        }
      } catch (err) {
        console.warn("Failed to fetch rider profiles:", err);
      }
    };

    fetchRiderProfiles();
  }, [localOrders]);

  const handleTouchStart = (e: any) => {
    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0 || isRefreshing) return;

    setIsPulling(true);
    startYRef.current = e.touches ? e.touches[0].clientY : e.clientY;
  };

  const handleTouchMove = (e: any) => {
    if (!isPulling || isRefreshing) return;
    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) return;

    const currentY = e.touches ? e.touches[0].clientY : e.clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      const distance = Math.min(diff * 0.45, 120);
      setPullDistance(distance);
      
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= 65) {
      handleRefresh();
    }
    setPullDistance(0);
  };

  const prevStatusesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!notificationsEnabled) {
      localOrders.forEach((order) => {
        prevStatusesRef.current[order.id] = order.status;
      });
      return;
    }

    localOrders.forEach((order) => {
      const prevStatus = prevStatusesRef.current[order.id];
      if (prevStatus && prevStatus !== order.status) {
        if (order.status.toLowerCase() === "ready" || order.status.toLowerCase() === "completed") {
          if (triggerHaptic) {
            triggerHaptic([500, 100, 500, 100, 800]);
          } else if ("vibrate" in navigator) {
            navigator.vibrate([500, 100, 500, 100, 800]);
          }
          
          if (order.status.toLowerCase() === "ready") {
            toast.success(`Your order #${order.id.slice(0, 5)} is ready!`, {
              description: "Please collect it or await your courier.",
            });
          } else if (order.status.toLowerCase() === "completed") {
            toast.success(`Your order #${order.id.slice(0, 5)} has been picked up!`, {
              description: "Enjoy your meal!",
            });
          }
        }
      }
      prevStatusesRef.current[order.id] = order.status;
    });
  }, [localOrders, triggerHaptic, notificationsEnabled]);

  const handleToggleNotifications = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    safeLocalStorageSet("localeats_order_notifications", String(newState));
    if (newState) {
      toast.info("Order notifications enabled");
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    triggerHaptic?.(10);
    try {
      const activeIds = orders.map((o) => o.user_id).filter(Boolean);
      const userId =
        activeIds[0] || (await supabase.auth.getUser()).data.user?.id;
      if (!userId) {
        setIsRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setLocalOrders(data);
        triggerHaptic?.([50, 30, 50]);
      }
    } catch (err: any) {
      console.error("Error refreshing orders manually:", err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    }
  };

  const handleCancelOrder = async () => {
    const orderId = cancellationModal.orderId;
    if (!orderId) return;

    setIsCancelling(true);
    triggerHaptic?.(15);
    try {
      const updatePayload: any = {
        status: "cancelled",
        cancellation_reason: cancelReason,
      };

      let { error } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId);

      if (error && error.message?.includes("cancellation_reason")) {
        delete updatePayload.cancellation_reason;
        const retry = await supabase
          .from("orders")
          .update(updatePayload)
          .eq("id", orderId);
        error = retry.error;
      }

      if (error) throw error;

      toast.success("Order cancelled successfully");
      setLocalOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: "cancelled", cancellation_reason: cancelReason }
            : o
        )
      );
      setCancellationModal({ isOpen: false, orderId: null });
      setCancelReason("");
    } catch (err: any) {
      console.error("Error cancelling order:", err);
      showAlert("Cancellation Failed", err.message || "An error occurred");
    } finally {
      setIsCancelling(false);
    }
  };

  const combinedOrders = useMemo(() => {
    const merged = [...localOrders];
    offlineOrders.forEach((offOrder) => {
      const existsInDb = merged.some(
        (o) => o.id === offOrder.id || (o.product_name === offOrder.product_name && o.created_at === offOrder.created_at)
      );
      if (!existsInDb) {
        merged.push({
          ...offOrder,
          is_offline_queued: true
        });
      }
    });
    return merged;
  }, [localOrders, offlineOrders]);

  const activeOrders = combinedOrders.filter(
    (o) => {
      const s = (o.status || "").toLowerCase();
      return s !== "completed" && s !== "cancelled" && s !== "delivered";
    }
  );

  const activeChatDeliveryOrder = useMemo(() => {
    return combinedOrders.find((o) => {
      if (!o.is_delivery) return false;
      const ds = (o.delivery_status || "").toLowerCase();
      const st = (o.status || "").toLowerCase();
      if (st === "completed" || st === "cancelled" || ds === "delivered" || ds === "cancelled") return false;
      return ds === "accepted" || ds === "picked_up";
    });
  }, [combinedOrders]);

  return (
    <div className="bg-white dark:bg-slate-950 font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col max-w-md mx-auto relative shadow-2xl">
      <header className="sticky top-0 z-50 glass-effect border-b border-primary/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="px-4 py-4 flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-start text-slate-900 dark:text-slate-100 cursor-pointer transition-colors hover:text-orange-500 focus:outline-none shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-black tracking-tight text-center flex-1 line-clamp-1">Track Deliveries</h1>
          <div className="flex items-center gap-1 shrink-0">
            {activeChatDeliveryOrder && (
              <button
                type="button"
                onClick={() => {
                  setOpenChatOrderId(activeChatDeliveryOrder.id);
                  setShowChat(true);
                  setUnreadCounts((prev) => ({ ...prev, [activeChatDeliveryOrder.id]: 0 }));
                }}
                className="relative px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer"
                title="Chat with Rider"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden xs:inline text-[11px]">Chat with Rider</span>
                {(unreadCounts[activeChatDeliveryOrder.id] || 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-bounce">
                    {unreadCounts[activeChatDeliveryOrder.id]}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleToggleNotifications}
              className={`w-9 h-9 flex items-center justify-center cursor-pointer active:scale-95 transition-transform focus:outline-none ${notificationsEnabled ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}
              title="Toggle Notifications"
            >
              {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="w-9 h-9 flex items-center justify-center text-orange-600 dark:text-orange-400 cursor-pointer active:scale-95 transition-transform focus:outline-none"
              title="Refresh Status"
            >
              <RefreshCw
                className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </header>

      <main
        ref={scrollContainerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        className="flex-grow overflow-y-auto px-4 py-6 space-y-6 flex flex-col select-none relative"
      >
        {isRefreshing && (
          <div className="absolute inset-0 bg-slate-900/30 dark:bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center z-50 animate-in fade-in duration-200 pointer-events-auto">
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-3xl shadow-2xl flex flex-col items-center space-y-3 max-w-[240px] text-center">
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-3 border-orange-500/10 border-t-orange-600 dark:border-orange-400/10 dark:border-t-orange-400 animate-spin" />
                <RefreshCw className="w-4 h-4 text-orange-600 dark:text-orange-400 absolute animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Syncing Status</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-1">Retrieving latest status live...</p>
              </div>
            </div>
          </div>
        )}

        {/* Pull-To-Refresh Visual Indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div 
            className="flex justify-center items-center pointer-events-none transition-all duration-300 ease-out"
            style={{ 
              height: isRefreshing ? "48px" : `${pullDistance}px`,
              opacity: isRefreshing ? 1 : Math.min(pullDistance / 60, 1),
              marginTop: isRefreshing ? "0px" : `-${Math.max(0, 48 - pullDistance)}px`,
              marginBottom: "12px"
            }}
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-full shadow-lg flex items-center justify-center gap-2">
              <RefreshCw 
                className={`text-orange-600 dark:text-orange-400 w-4 h-4 ${
                  isRefreshing ? "animate-spin" : ""
                }`} 
                style={{ 
                  transform: isRefreshing ? "none" : `rotate(${pullDistance * 6}deg)` 
                }}
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {isRefreshing ? "Refreshing..." : pullDistance >= 65 ? "Release to Refresh" : "Pull to Refresh"}
              </span>
            </div>
          </div>
        )}

        {activeOrders.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-6 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/10 dark:bg-orange-500/5 rounded-full scale-[2] blur-3xl" />
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 relative z-10 shadow-xl">
                <Truck className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-black text-slate-800 dark:text-white">No Active Deliveries</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed mx-auto font-medium">
                You don't have any deliveries in progress right now. Place an order to see it tracked live step-by-step!
              </p>
            </div>
          </div>
        ) : (
          activeOrders.map((order) => {
            const shop = shops.find((s) => s.id === order.shop_id);
            const isExpanded = !!expandedOrders[order.id];

            if (order.is_offline_queued) {
              return (
                <div
                  key={order.id}
                  className="bg-amber-50/40 dark:bg-amber-950/20 rounded-[32px] p-5 border border-amber-200 dark:border-amber-900/40 shadow-md flex flex-col gap-4 animate-in fade-in duration-500 relative overflow-hidden"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      {shop?.logo ? (
                        <img
                          referrerPolicy="no-referrer"
                          src={shop.logo}
                          alt={shop.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center font-bold">
                          {shop?.name?.charAt(0) || "S"}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                          {shop?.name || "Local Kitchen"}
                        </h3>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5 uppercase tracking-wider">
                          Unsynced Offline Order
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                        {formatRand(order.price + (order.delivery_fee || 0))}
                      </p>
                      <span className="bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 text-[8px] font-black px-2 py-0.5 rounded uppercase leading-none mt-1 inline-block">
                        {order.is_delivery ? "Delivery" : "Collection"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-amber-150 dark:border-amber-900/20 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                          Waiting for kitchen connection
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          Order is stored securely in offline outbox
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
                    Your device is offline or the server connection was lost. The kitchen will receive your order automatically as soon as your connection is restored, or you can manually trigger a synchronization attempt below.
                  </div>

                  <button
                    disabled={retryingOrderId === order.id}
                    onClick={() => handleRetrySync(order.id)}
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-orange-600/10"
                  >
                    {retryingOrderId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {retryingOrderId === order.id ? "Syncing order..." : "Send / Sync Now"}
                  </button>
                </div>
              );
            }

            // Define delivery milestones/steps
            const steps = [
              { s: "pending", label: "Confirmed", icon: <CheckCircle2 className="w-4 h-4" />, desc: "Order confirmed by the shop" },
              { s: "preparing", label: "Preparing", icon: <Utensils className="w-4 h-4" />, desc: "Your meal is being crafted" },
              { s: "ready", label: "Dispatched", icon: <Truck className="w-4 h-4" />, desc: "Courier has departed for delivery" },
              { s: "completed", label: "Arrived", icon: <MapPin className="w-4 h-4" />, desc: "Arrived at your destination" },
            ];

            // Numerical tracking index
            let currentStepIndex = 0;
            if (order.status.toLowerCase() === "pending") currentStepIndex = 0;
            else if (order.status.toLowerCase() === "confirmed") currentStepIndex = 1;
            else if (order.status.toLowerCase() === "preparing") currentStepIndex = 1;
            else if (order.status.toLowerCase() === "ready") currentStepIndex = 2;
            else if (order.status.toLowerCase() === "completed" || order.status.toLowerCase() === "delivered") currentStepIndex = 3;

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-[32px] p-5 border border-slate-100 dark:border-slate-800/80 shadow-md flex flex-col gap-5 animate-in fade-in duration-500 relative overflow-hidden"
              >
                {/* Header Row: Shop Details & Total */}
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3">
                    {shop?.logo ? (
                      <img
                        referrerPolicy="no-referrer"
                        src={shop.logo}
                        alt={shop.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center font-bold">
                        {shop?.name?.charAt(0) || "S"}
                      </div>
                    )}
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                        {shop?.name || "Local Kitchen"}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">
                        Order #{order.id.slice(-6).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                      {formatRand(order.price + (order.delivery_fee || 0))}
                    </p>
                    <span className="bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 text-[8px] font-black px-2 py-0.5 rounded uppercase leading-none mt-1 inline-block">
                      {order.is_delivery ? "Delivery" : "Collection"}
                    </span>
                  </div>
                </div>

                {/* 1. Pending: Looking for a Rider matching state */}
                {order.status === "pending" && order.delivery_status === "finding_rider" && (
                  <div className="p-5 bg-amber-500/10 border-2 border-amber-500/20 rounded-2xl flex gap-4 items-start animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                      <Clock size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-amber-800 dark:text-amber-400">
                        Pending: Looking for a Rider
                      </h4>
                      <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed font-medium">
                        We have automatically dispatched a regional courier match request. Your food preparation begins immediately when a driver accepts!
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. Logistic Dispatch Classification Label */}
                {shop && order.is_delivery && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Truck size={16} className="text-slate-400 shrink-0" />
                      <span>
                        {shop.allow_external_riders ? (
                          <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                            📡 Linked directly to <strong className="font-bold">LocalEats Public Fleet</strong>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            🚴 Serviced by <strong className="font-bold">{shop.name}'s private team</strong>
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-7 leading-normal">
                      {shop.allow_external_riders 
                        ? "Your order is broadcasted to our public courier pool for rapid fulfillment."
                        : "This shop processes its own deliveries to guarantee personal care."
                      }
                    </p>
                  </div>
                )}

                {/* 3. Cash on Arrival Trust Booster Banner */}
                {shop?.cash_trust_enabled && (order.payment_method === "cash_on_arrival" || order.payment_method === "cash") && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3.5 items-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                        <Sparkles size={12} /> Cash-on-Arrival Trust Active
                      </p>
                      <p className="text-[11px] text-emerald-700/90 dark:text-emerald-500/90 font-medium leading-relaxed">
                        Pay safely in cash once your hot meal is in your hands. No prior upfront risk.
                      </p>
                    </div>
                  </div>
                )}

                {/* Delivery/Rider Contact Widget */}
                {order.is_delivery && order.rider_id && riders[order.rider_id] && (
                  <div className="bg-orange-50/50 dark:bg-orange-500/[0.04] p-4 rounded-2xl border border-orange-100/50 dark:border-orange-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 font-black">
                          {riders[order.rider_id].full_name?.charAt(0) || "🚴"}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {riders[order.rider_id].full_name || "Assigned Courier"}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Courier En Route
                          </p>
                        </div>
                      </div>
                      <span className="bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 text-[8px] font-black px-2 py-0.5 rounded uppercase leading-none">
                        Active Delivery
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setOpenChatOrderId(order.id);
                          setUnreadCounts((prev) => ({ ...prev, [order.id]: 0 }));
                        }}
                        className="relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-md shadow-orange-600/20"
                        title="Chat with Rider"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat with Rider</span>
                        {(unreadCounts[order.id] || 0) > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-bounce">
                            {unreadCounts[order.id]}
                          </span>
                        )}
                      </button>

                      {riders[order.rider_id]?.phone && (
                        <button
                          onClick={() => {
                            const cleanPhone = riders[order.rider_id].phone.replace(/[^0-9]/g, "");
                            const url = `https://wa.me/${cleanPhone.startsWith("0") ? "27" + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(`Hi ${riders[order.rider_id].full_name}, I'm checking on my delivery for order #${order.id.slice(0, 5)}!`)}`;
                            window.open(url, "_blank");
                          }}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-md shadow-[#25D366]/10"
                          title="WhatsApp Rider"
                        >
                          <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.705 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </button>
                      )}

                      <button
                        onClick={() => window.open(`tel:${riders[order.rider_id]?.phone || ""}`)}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white border border-slate-200/50 dark:border-slate-700 rounded-xl text-xs font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                        title="Call Courier"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Progress Stepper Visual Progress Tracker */}
                <div className="relative py-3">
                  {/* Track line progress fill */}
                  <div className="absolute top-7 left-6 right-6 h-[3px] bg-slate-100 dark:bg-slate-800/80 rounded-full z-0">
                    <motion.div
                      className="h-full bg-orange-500"
                      initial={{ width: "0%" }}
                      animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>

                  <div className="relative flex justify-between px-1 z-10">
                    {steps.map((item, index) => {
                      const isDone = currentStepIndex >= index;
                      const isCurrent = currentStepIndex === index;

                      return (
                        <div
                          key={item.s}
                          className="flex flex-col items-center space-y-1.5 shrink-0"
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                              isDone
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800 text-slate-350 dark:text-slate-505"
                            } ${isCurrent ? "scale-110 shadow-lg shadow-orange-500/20" : "scale-100"}`}
                          >
                            {isCurrent ? (
                              <div className="relative flex items-center justify-center">
                                <span className="absolute inset-0 rounded-full border border-orange-500 animate-ping opacity-60"></span>
                                {item.icon}
                              </div>
                            ) : isDone ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              item.icon
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold ${
                              isDone ? "text-orange-600 dark:text-orange-400 font-black" : "text-slate-400"
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes & Instructions Summary */}
                {(order.notes || order.delivery_instructions || order.special_instructions) && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-850 rounded-[20px] p-4 space-y-2.5">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 leading-none">
                      <ClipboardList className="w-3.5 h-3.5 text-orange-500" />
                      Delivery & Order Instructions
                    </h4>
                    <div className="space-y-2 text-xs font-medium">
                      {order.notes && (
                        <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Kitchen Notes</p>
                          <p className="text-slate-700 dark:text-slate-300 italic">"{order.notes}"</p>
                        </div>
                      )}
                      {(order.delivery_instructions || order.special_instructions) && (
                        <div className="bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Delivery Info</p>
                          <p className="text-slate-700 dark:text-slate-300">
                            📍 {cleanInstructionsForDisplay(order.delivery_instructions || order.special_instructions)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Countdown & Status Banner */}
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-850 rounded-[20px] p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
                      <Info className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {order.status.toLowerCase() === "pending" && "Waiting for shop acceptance..."}
                        {order.status.toLowerCase() === "confirmed" && "Order accepted! Preparing..."}
                        {order.status.toLowerCase() === "preparing" && "Chef is cooking your meal!"}
                        {order.status.toLowerCase() === "ready" && "Your meal is ready for collection!"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Est. preparation duration: 15-20 minutes
                      </p>
                    </div>
                  </div>

                  <RealTimeCountdown createdAt={order.created_at} status={order.status} isDelivery={order.is_delivery} />

                  {order.is_delivery && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      {shop?.allow_external_riders === false ? (
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1.5 leading-none">
                          <span>🚴</span>
                          <span>Exclusive in-house private courier team</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 leading-none">
                          <span>📡</span>
                          <span>Synced live to LocalEats Public Fleet</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expand Timeline Status trigger */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => toggleOrderDetails(order.id)}
                      className="w-full flex items-center justify-between py-1 px-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-[11px] font-bold transition-colors cursor-pointer select-none"
                    >
                      <span>{isExpanded ? "Hide" : "Show"} Detailed Kitchen Steps</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <DetailedKitchenStatus createdAt={order.created_at} status={order.status} />

                        <button
                          onClick={() => {
                            const subject = `[ORDER SUPPORT] ID: #${order.id.slice(-6)}`;
                            const body = `Hi Support Team,\n\nI need help with my delivery from ${shop?.name || "LocalEats"}.\n\nOrder Details:\nProduct: ${order.product_name} x${order.quantity}\nTotal: ${formatRand(order.price + (order.delivery_fee || 0))}\n\nProblem details:\n`;
                            window.location.href = `mailto:support@localeats.co.za?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100/50 hover:bg-slate-100 dark:bg-slate-800/30 dark:hover:bg-slate-850 border border-slate-200/50 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-bold active:scale-95 transition-all cursor-pointer"
                        >
                          <Headset className="w-3.5 h-3.5 text-slate-400" />
                          <span>Report an Issue / Get Live Support</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancel Action */}
                {["pending", "confirmed"].includes((order.status || "").toLowerCase()) && (
                  <button
                    onClick={() => setCancellationModal({ isOpen: true, orderId: order.id })}
                    className="w-full py-3 bg-red-50 hover:bg-red-100 dark:bg-red-500/[0.06] dark:hover:bg-red-500/[0.12] text-red-600 dark:text-red-400 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 border border-red-200/30 dark:border-red-900/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancel Order
                  </button>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {cancellationModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isCancelling && setCancellationModal({ isOpen: false, orderId: null })}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xs rounded-[32px] p-6 relative z-10 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 mb-4 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white text-center mb-1">
                Cancel Order?
              </h3>
              <p className="text-[10px] text-slate-500 text-center mb-6 uppercase tracking-widest font-bold">
                Please select cancellation reason
              </p>

              <div className="space-y-3 mb-6">
                {["Mistake in order", "Changed my mind", "Waiting too long", "Other"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                      cancelReason.startsWith(reason)
                        ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600"
                        : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
                {cancelReason.startsWith("Other") && (
                  <textarea
                    autoFocus
                    placeholder="Provide details..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none mt-2"
                    rows={2}
                    onChange={(e) => setCancelReason(`Other: ${e.target.value}`)}
                  />
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  disabled={!cancelReason || isCancelling}
                  onClick={handleCancelOrder}
                  className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  Confirm Cancellation
                </button>
                <button
                  disabled={isCancelling}
                  onClick={() => setCancellationModal({ isOpen: false, orderId: null })}
                  className="w-full py-3 bg-white dark:bg-slate-900 text-slate-500 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Active Rider Chat Widget */}
      {(() => {
        const activeChatOrder = localOrders.find((o) => o.id === openChatOrderId) || activeChatDeliveryOrder;
        if (!activeChatOrder) return null;
        const riderProfile = activeChatOrder.rider_id ? riders[activeChatOrder.rider_id] : null;
        const isOpen = showChat || openChatOrderId === activeChatOrder.id;

        return (
          <ChatWidget
            orderId={activeChatOrder.id}
            userId={activeChatOrder.user_id}
            riderName={riderProfile?.full_name || "Assigned Rider"}
            isActive={
              activeChatOrder.status !== "completed" &&
              activeChatOrder.status !== "cancelled" &&
              activeChatOrder.delivery_status !== "delivered"
            }
            isOpen={isOpen}
            onClose={() => {
              setShowChat(false);
              setOpenChatOrderId(null);
            }}
            onUnreadCountChange={(count) =>
              setUnreadCounts((prev) => ({ ...prev, [activeChatOrder.id]: count }))
            }
          />
        );
      })()}
    </div>
  );
}
