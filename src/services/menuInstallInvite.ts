const DISMISSAL_KEY = 'localeats_menu_install_dismissed_until';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;

export function createMenuInstallInvite(storage: StorageAccess | null, now = Date.now) {
  const viewed = new Set<string>();
  let dismissedUntil = 0;
  try {
    const saved = Number(storage?.getItem(DISMISSAL_KEY));
    if (Number.isFinite(saved) && saved > now() && saved <= now() + SEVEN_DAYS) dismissedUntil = saved;
  } catch { /* Browsing works when storage is blocked. */ }
  return {
    viewItem(shopId: string, itemId: string) {
      if (shopId && itemId) viewed.add(JSON.stringify([shopId, itemId]));
    },
    visible: () => viewed.size >= 2 && dismissedUntil <= now(),
    dismiss() {
      dismissedUntil = now() + SEVEN_DAYS;
      try { storage?.setItem(DISMISSAL_KEY, String(dismissedUntil)); } catch { /* Keep in-memory dismissal. */ }
    },
  };
}
