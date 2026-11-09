import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, X } from "lucide-react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  c1dStagingEnabled,
  runC1DReadOnlyChecks,
  type C1DReport,
  type C1DSafeResult,
} from "../services/c1dIdentityRead";

/**
 * Opt-in C1D verification panel. Does not alter any normal Customer screen.
 * It only appears on isolated Customer staging when the owner visits ?c1d=1.
 * No credential, UID, email, order record or profile data is ever displayed.
 */
export function C1DIdentityPanel() {
  const allowed = c1dStagingEnabled(
    import.meta.env as unknown as Record<string, unknown>,
    typeof window === "undefined" ? "" : window.location.hostname,
    typeof window === "undefined" ? "" : window.location.search,
  );
  const [open, setOpen] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<C1DReport | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeUid = useRef<string | null | undefined>(undefined);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!allowed) return;
    return onIdTokenChanged(auth, user => {
      const nextUid = user && !user.isAnonymous ? user.uid : null;
      if (activeUid.current !== undefined && activeUid.current !== nextUid) {
        pending.current?.abort();
        setRunning(false);
        setReport(null);
        setNotice("The Firebase account changed. Run the checks again for the current account.");
      }
      activeUid.current = nextUid;
      setSignedIn(Boolean(nextUid));
    }, () => {
      pending.current?.abort();
      setRunning(false);
      setSignedIn(false);
      setReport(null);
      setNotice("Firebase authentication could not be verified.");
    });
  }, [allowed]);

  useEffect(() => () => pending.current?.abort(), []);

  if (!allowed || !open) return null;

  const run = async () => {
    const controller = new AbortController();
    pending.current?.abort();
    pending.current = controller;
    setRunning(true);
    setReport(null);
    setNotice(null);
    try {
      // Firebase ID tokens are used only as bearer headers and never logged.
      const summary = await runC1DReadOnlyChecks(
        () => auth.currentUser,
        window.location.origin,
        fetch,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setReport(summary);
        if (summary.outcome === "account-changed") setNotice("Account changed during the check. Nothing was recorded.");
      }
    } catch {
      // Do not display a thrown network/Firebase error (it may contain data).
      if (!controller.signal.aborted) setNotice("The read-only check could not finish. Please check connectivity or CORS.");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setRunning(false);
      }
    }
  };

  const line = (result: C1DSafeResult) => {
    if (result.ownership === "mismatch") return "Owner mismatch — do not approve identity";
    if (result.status === 200 && result.ownership === "match") return "Returned records belong to this Firebase account";
    if (result.status === 200 && result.ownership === "empty") return "Empty history — no cross-account record to compare";
    if (result.status === 404 && result.code === "PROFILE_NOT_FOUND") return "No profile row — ownership still unproven";
    if (result.status === 503) return "Backend unavailable / schema not ready — not an isolation pass";
    if (result.status === 401) return "Authentication rejected — requires investigation if signed in";
    return "Result requires review";
  };

  return (
    <aside role="region" aria-label="C1D staging identity verification" className="fixed bottom-3 right-3 z-[220] w-[calc(100vw-1.5rem)] max-w-md rounded-3xl border border-orange-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:bottom-5 sm:right-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2 text-orange-600">
            <ShieldCheck size={18} aria-hidden="true"/>
            <span className="text-xs font-black uppercase tracking-widest">C1D · Staging only</span>
          </div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">Private API read check</h2>
        </div>
        <button type="button" onClick={() => { pending.current?.abort(); setOpen(false); }}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-white"
          aria-label="Close C1D diagnostics"><X size={19}/></button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        Makes exactly two GET requests: your own profile and order history. No order, profile, payment or notification is created.
      </p>
      <div className="my-3 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-800 dark:bg-slate-800 dark:text-white">
        Firebase account: {signedIn ? "signed in" : "sign in as tester or tester2 first"}
      </div>
      <button type="button" onClick={() => { void run(); }} disabled={running || !signedIn}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
        {running ? <Loader2 size={18} className="animate-spin" aria-hidden="true"/> : <ShieldCheck size={18} aria-hidden="true"/>}
        {running ? "Checking read-only endpoints…" : "Run two read-only GET checks"}
      </button>
      {notice && <p role="status" className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <AlertTriangle size={16} className="shrink-0" aria-hidden="true"/>{notice}</p>}
      {report?.authenticated && (
        <div className="mt-3 max-h-[44vh] space-y-2 overflow-y-auto" aria-live="polite">
          {report.results.map(result => (
            <div key={result.path} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  {result.path === "/api/v1/profiles/me" ? "My profile GET" : "My orders GET"}
                </span>
                <span className="text-xs font-black tabular-nums text-orange-600">HTTP {result.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {line(result)}
              </p>
              {result.code && <p className="mt-1 text-[11px] text-slate-500">Response code: {result.code}</p>}
              {result.count !== null && <p className="mt-1 text-[11px] text-slate-500">Order count: {result.count}</p>}
              <p className="mt-2 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                {result.noStore && result.browserReadable
                  ? <CheckCircle2 size={13} className="text-emerald-600" aria-hidden="true"/>
                  : <AlertTriangle size={13} className="text-amber-600" aria-hidden="true"/>}
                No-store: {result.noStore ? "yes" : "NO"} · Browser API read: {result.browserReadable ? "allowed" : "blocked"}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Repeat once for tester and once for tester2. Share only the HTTP statuses, response codes, and ownership labels. Never share Authorization headers, account tokens or passwords.
      </p>
    </aside>
  );
}
