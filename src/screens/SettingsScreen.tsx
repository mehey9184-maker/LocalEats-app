import React from "react";
import {auth, ensureCustomerPushWorkerActive, registerAndSyncPushToken} from "../lib/firebase";
import {
  ArrowLeft,
  User,
  Moon,
  Sun,
  Shield,
  HelpCircle,
  LogOut,
  ShoppingBag,
  Store,
  ChevronRight,
  Wifi,
  Smartphone,
  BellRing,
  Info,
} from "lucide-react";
import { UserProfile } from "../types";

interface SettingsScreenProps {
  userProfile: UserProfile;
  setUserProfile?: (profile: any) => void;
  forcedTheme?: string;
  onSetForcedTheme?: (theme: any) => void;
  onBack: () => void;
  onLogout: () => void;
  onProfile: () => void;
  onOrderHistory: () => void;
  onAdminOrders?: () => void;
  onShopDashboard?: () => void;
  onContactUs?: () => void;
  onUpdateProfile?: (updates: any, optimistic?: boolean, cb?: () => void) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  dataSaverEnabled?: boolean;
  onToggleDataSaver?: () => void;
  triggerHaptic?: (duration?: number) => void;
  isOnline?: boolean;
  [key: string]: any;
}

/**
 * Local-only notification checks. They do not generate pickup orders,
 * write receipts, or report OS delivery from a Firebase provider response.
 */
function CustomerNotificationCheck() {
  const [permission, setPermission] = React.useState<string>("checking");
  const [busy, setBusy] = React.useState<"registration"|"display"|null>(null);
  const [registrationStatus, setRegistrationStatus] = React.useState("");
  const [displayStatus, setDisplayStatus] = React.useState("");

  React.useEffect(() => {
    const refresh = () => {
      setPermission(typeof window !== "undefined" && "Notification" in window
        ? Notification.permission : "unsupported");
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const enableAlerts = async () => {
    if (busy) return;
    setBusy("registration");
    setRegistrationStatus("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) {
        setRegistrationStatus("Browser notifications are not available in this browser or connection.");
        return;
      }
      // Only this explicit button click is permitted to request browser consent.
      const allowed = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
      setPermission(allowed);
      if (allowed !== "granted") {
        setRegistrationStatus("Notifications are blocked. Allow this website in Chrome site settings and enable Chrome in Windows notifications.");
        return;
      }
      // Isolated Preview must not register tokens against the Production API.
      if (!["localeatssa.co.za", "www.localeatssa.co.za"].includes(window.location.hostname)) {
        setRegistrationStatus("Browser permission allowed. Preview does not register a device with the Production API.");
        return;
      }
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setRegistrationStatus("Sign in to LocalEats to register order alerts for this device.");
        return;
      }
      const confirmed = await registerAndSyncPushToken(uid);
      setRegistrationStatus(confirmed
        ? "Order alerts registered with LocalEats for this account. Windows display still requires a device check."
        : "Device registration could not be confirmed. Your pickup status remains available in the app.");
    } catch {
      setRegistrationStatus("Notification registration failed. Check Chrome permission and your connection.");
    } finally {
      setBusy(null);
    }
  };

  const testLocalAlert = async () => {
    if (busy) return;
    setBusy("display");
    setDisplayStatus("");
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) {
        setDisplayStatus("This browser cannot show service-worker notifications.");
        return;
      }
      if (Notification.permission !== "granted") {
        setDisplayStatus("First allow notifications for this website using the Enable alerts button.");
        return;
      }
      const registration = await ensureCustomerPushWorkerActive();
      const tag = "localeats-customer-browser-check-" + Date.now();
      await registration.showNotification("LocalEats browser notification check", {
        body: "Browser-only test. No order, payment or Firebase send was created.",
        icon: "/logo.png",
        tag,
        data: {type: "customer_local_test"},
      });
      const found = await registration.getNotifications({tag});
      setDisplayStatus(found.length > 0
        ? "Chrome reports a local notification. Check for a banner or open Windows Notification Center. Visible delivery still needs your confirmation."
        : "Chrome accepted the local display request, but the alert was not listed. Check Chrome site permission and Windows Settings → System → Notifications, including Do not disturb.");
    } catch {
      setDisplayStatus("Chrome could not display the local alert. Check site permission, service workers and Windows notification settings.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Pickup notification settings" className="rounded-3xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
          <BellRing className="w-5 h-5" aria-hidden="true"/>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Pickup notifications</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{permission === "granted" ? "On by default · browser allowed" : permission === "denied" ? "Blocked in browser settings" : permission === "default" ? "Needs your permission once" : "Browser notifications unavailable"}</p>
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        Notifications help you notice when food is ready. Track pickup remains the source of your actual order status.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { void enableAlerts(); }} disabled={!!busy}
          className="min-h-11 rounded-xl bg-orange-600 text-white px-4 py-2 text-xs font-bold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">
          {busy === "registration" ? "Checking registration…" : permission === "granted" ? "Check order alerts" : "Enable order alerts"}
        </button>
        <button type="button" onClick={() => { void testLocalAlert(); }} disabled={!!busy}
          className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2 text-xs font-bold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500">
          {busy === "display" ? "Testing browser…" : "Test browser alert"}
        </button>
      </div>
      {registrationStatus && <p role="status" aria-live="polite" className="text-xs text-slate-700 dark:text-slate-200">{registrationStatus}</p>}
      {displayStatus && <p role="status" aria-live="polite" className="text-xs text-slate-700 dark:text-slate-200">{displayStatus}</p>}
      <p className="text-[11px] text-slate-500 dark:text-slate-400">The browser-only test does not send a Firebase message or create an order.</p>
    </section>
  );
}

export function SettingsScreen({
  userProfile,
  onBack,
  onLogout,
  onProfile,
  onOrderHistory,
  onAdminOrders,
  onShopDashboard,
  onContactUs,
  isDarkMode,
  onToggleDarkMode,
  dataSaverEnabled,
  onToggleDataSaver,
  triggerHaptic,
  isOnline = true,
}: SettingsScreenProps) {
  const isAdmin = userProfile?.role === "admin" || userProfile?.is_admin === true;
  const isMerchant = userProfile?.role === "merchant" || userProfile?.role === "shop_owner" || userProfile?.is_vendor === true;

  const handleAction = (cb?: () => void) => {
    if (triggerHaptic) triggerHaptic(10);
    if (cb) cb();
  };

  const displayName = userProfile?.fullName || userProfile?.name || "Local Foodie";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            App Settings
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Profile Card Summary */}
        <div
          onClick={() => handleAction(onProfile)}
          className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-300 dark:hover:border-orange-700 transition"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-lg">
              {displayName[0]?.toUpperCase() || <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {displayName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {userProfile?.phone || userProfile?.email || "Manage delivery profile"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>

        {/* Preferences Section */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-1">
            Preferences & UI
          </h2>
          <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
            {/* Dark Mode Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dark Mode
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Switch between dark and light themes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                  isDarkMode ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    isDarkMode ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Data Saver Mode */}
            {onToggleDataSaver && (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Data Saver Mode
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Optimizes images and map loading
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleDataSaver}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    dataSaverEnabled ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      dataSaverEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Browser-only push check; preserves the existing Settings controls. */}
        <CustomerNotificationCheck />

        {/* Shortcuts / Navigation */}
        <div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 px-1">
            Activity & Tools
          </h2>
          <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/50">
            <button
              onClick={() => handleAction(onOrderHistory)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Order History
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Past orders, receipts & quick re-orders
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {onShopDashboard && (
              <button
                onClick={() => handleAction(onShopDashboard)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Merchant Portal
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Manage shop status & menu items
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            )}

            {isAdmin && onAdminOrders && (
              <button
                onClick={() => handleAction(onAdminOrders)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Admin Dispatch & Diagnostics
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      System overview & master dispatch
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            )}

            {onContactUs && (
              <button
                onClick={() => handleAction(onContactUs)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/30 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Help & Support
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Get help with an order or send feedback
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => handleAction(onLogout)}
          className="w-full p-4 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-950/50 transition"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>
    </div>
  );
}
