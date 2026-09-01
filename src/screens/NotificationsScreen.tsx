import React from "react";
import { ArrowLeft, Bell, Trash2, CheckCircle2, ShoppingBag, Info, AlertTriangle } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp?: string | number;
  read?: boolean;
  type?: "order" | "promo" | "info" | "warning" | string;
  orderId?: string;
}

interface NotificationsScreenProps {
  notifications: NotificationItem[];
  onBack: () => void;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationsScreen({
  notifications = [],
  onBack,
  onRead,
  onDelete,
}: NotificationsScreenProps) {
  const getIcon = (type?: string) => {
    switch (type) {
      case "order":
        return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTime = (timestamp?: string | number) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return String(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Notifications
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Stay updated on order status & alerts
            </p>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Bell className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
              No notifications yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              You will receive live delivery updates, order confirmations, and special offers here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => onRead(n.id)}
              className={`p-4 rounded-2xl border transition duration-200 flex items-start gap-3.5 relative overflow-hidden ${
                n.read
                  ? "bg-white/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 opacity-80"
                  : "bg-white dark:bg-slate-800 border-orange-200 dark:border-orange-900/40 shadow-sm"
              }`}
            >
              {!n.read && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-orange-500 ring-4 ring-orange-100 dark:ring-orange-950/40" />
              )}
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 ml-2">
                    {formatTime(n.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                  {n.message}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(n.id);
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                title="Delete notification"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
