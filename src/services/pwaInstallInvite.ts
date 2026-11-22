type InstallChoice = "accepted" | "dismissed";
type BrowserInstallEvent = Event & {
  prompt: () => Promise<{ outcome?: InstallChoice } | void>;
  userChoice?: Promise<{ outcome: InstallChoice }>;
};

let pendingInstall: BrowserInstallEvent | null = null;
let installedThisSession = false;
const listeners = new Set<() => void>();
const publish = () => { for (const listener of listeners) listener(); };
const standalone = typeof window !== "undefined" ? window.matchMedia("(display-mode: standalone)") : null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    const candidate = event as BrowserInstallEvent;
    if (typeof candidate.prompt !== "function") return;
    event.preventDefault();
    pendingInstall = candidate;
    installedThisSession = false;
    publish();
  });
  window.addEventListener("appinstalled", () => {
    pendingInstall = null;
    installedThisSession = true;
    publish();
  });
  standalone?.addEventListener?.("change", publish);
}

export function subscribeToInstallability(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function appAlreadyInstalled(): boolean {
  const nav = typeof navigator !== "undefined" ? navigator as Navigator & { standalone?: boolean } : null;
  return installedThisSession || standalone?.matches === true || nav?.standalone === true;
}

export function availableInstallEvent(): BrowserInstallEvent | null {
  return pendingInstall;
}

export async function requestNativeInstall(): Promise<InstallChoice | "unavailable" | "error"> {
  const event = pendingInstall;
  if (!event || appAlreadyInstalled()) return "unavailable";
  pendingInstall = null;
  publish();
  try {
    const response = await event.prompt();
    const outcome = response && typeof response === "object" ? response.outcome : undefined;
    return outcome ?? (await event.userChoice)?.outcome ?? "unavailable";
  } catch {
    return "error";
  }
}
