import React, {useState} from "react";
import {Bell} from "lucide-react";

/**
 * Optional, post-confirmation-only customer consent prompt.
 * Never places an order, infers delivery, or requests permission on mount.
 */
export function CustomerPostOrderPushPrompt({
  onEnable, onDismiss,
}: {
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Called synchronously from this click to keep the browser's user gesture.
      const registered = await onEnable();
      if (registered) {
        onDismiss();
        return;
      }
      const allowed = typeof Notification !== "undefined" && Notification.permission === "granted";
      setStatus(allowed
        ? "Browser alerts are allowed, but LocalEats has not confirmed device registration. Check your order in Orders."
        : "If alerts are blocked, allow this site in Chrome's permissions and enable Chrome in Windows Notifications.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4"
      onKeyDown={(event) => { if (event.key === "Escape") onDismiss(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="post-order-push-title"
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
        <div className="mb-3 flex items-center gap-3">
          <div className="rounded-2xl bg-orange-100 dark:bg-orange-950/40 p-3 text-orange-600">
            <Bell className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 id="post-order-push-title" className="text-lg font-extrabold text-slate-900 dark:text-white">
            Get notified when your food is ready
          </h2>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Your pickup order was placed. Enable notifications so LocalEats can alert you when the shop marks it Ready.
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          You can always check the real status in Orders, even without notifications.
        </p>
        {status && <p role="status" className="mt-3 text-xs text-slate-700 dark:text-slate-200">{status}</p>}
        <div className="mt-5 grid gap-2">
          <button type="button" autoFocus disabled={busy}
            className="min-h-11 rounded-xl bg-orange-600 px-4 py-2 font-bold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            onClick={() => { void enable(); }}>
            {busy ? "Connecting…" : "Enable notifications"}
          </button>
          <button type="button" disabled={busy}
            className="min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 font-semibold text-slate-700 dark:text-slate-200"
            onClick={onDismiss}>
            Maybe later
          </button>
        </div>
      </section>
    </div>
  );
}
