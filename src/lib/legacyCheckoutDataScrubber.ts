const SCRUB_VERSION_KEY = "localeats_checkout_storage_scrub_v1";
const SCRUB_VERSION = "complete";

const JSON_STORAGE_KEYS = [
  "cached_orders",
  "admin_cached_orders",
  "offline_orders_queue",
  "offline_request_queue_v2",
] as const;

const TEXT_STORAGE_KEYS = [
  "localeats_last_instructions",
  "localeats_last_order_notes",
] as const;

const SENSITIVE_FIELD_NAMES = new Set([
  "cardholder",
  "cardnumber",
  "cardcvv",
  "cvv",
  "cvc",
  "cardexpiry",
  "expiry",
  "savedcards",
  "selectedsavedcardid",
  "savecardforfuture",
  "cardtype",
  "terminalid",
  "terminalbrand",
]);

const normalizeFieldName = (fieldName: string) =>
  fieldName.replace(/[^a-z0-9]/gi, "").toLowerCase();

export function stripLegacyCardMachinePaymentSegment(value: string): string {
  if (!/\[CARD_MACHINE_PAYMENT:/i.test(value)) return value;

  return value
    .replace(
      /\s*(?:•\s*)?\[CARD_MACHINE_PAYMENT:[^\]]*\]\s*(?:•\s*)?/gi,
      " • ",
    )
    .replace(/\s*•\s*•\s*/g, " • ")
    .replace(/^\s*•\s*|\s*•\s*$/g, "")
    .trim();
}

export function sanitizeLegacyCheckoutValue(value: unknown): unknown {
  if (typeof value === "string") {
    return stripLegacyCardMachinePaymentSegment(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeLegacyCheckoutValue);
  }

  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, childValue] of Object.entries(value)) {
      if (SENSITIVE_FIELD_NAMES.has(normalizeFieldName(key))) continue;
      sanitized[key] = sanitizeLegacyCheckoutValue(childValue);
    }
    return sanitized;
  }

  return value;
}

export function normalizeCheckoutPaymentMethod(
  deliveryType: "collection" | "delivery",
  paymentMethod: "cash" | "card_machine",
): "cash" | "card_machine" | "cash_on_arrival" {
  if (deliveryType === "delivery") return "cash_on_arrival";
  return paymentMethod;
}

export function hasUnsupportedPaidCustomizations(
  cart: Array<{
    selectedCustomizations?: Array<{ price?: unknown }>;
  }>,
): boolean {
  return cart.some((item) =>
    (item.selectedCustomizations || []).some(
      (customization) => Number(customization.price) > 0,
    ),
  );
}

export function containsPotentialCardCredential(value: string): boolean {
  const cardNumberPattern = /\b(?:\d[ -]?){12,18}\d\b/;
  const securityCodePattern = /\b(?:cvv|cvc)\s*[:#-]?\s*\d{3,4}\b/i;
  const expiryPattern = /\b(?:card\s*)?(?:exp(?:iry|ires)?|expiration)\s*[:#-]?\s*\d{1,2}\s*\/\s*\d{2,4}\b/i;
  const cardPinPattern = /\bcard\s+pin\s*[:#-]?\s*\d{4,6}\b/i;

  return (
    cardNumberPattern.test(value) ||
    securityCodePattern.test(value) ||
    expiryPattern.test(value) ||
    cardPinPattern.test(value)
  );
}

function scrubJsonStorageKey(storage: Storage, key: string) {
  const rawValue = storage.getItem(key);
  if (rawValue === null) return;

  try {
    const parsedValue = JSON.parse(rawValue);
    const sanitizedValue = sanitizeLegacyCheckoutValue(parsedValue);
    storage.setItem(key, JSON.stringify(sanitizedValue));
  } catch {
    // Known order/queue data that cannot be parsed cannot be safely inspected.
    storage.removeItem(key);
  }
}

function scrubLegacyRequestQueueDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") return Promise.resolve();

  const listDatabases = indexedDB.databases?.bind(indexedDB);
  if (!listDatabases) return Promise.resolve();

  return listDatabases()
    .then((databases) => {
      if (!databases.some((database) => database.name === "localeats_request_queue_db")) {
        return;
      }

      return new Promise<void>((resolve, reject) => {
        const openRequest = indexedDB.open("localeats_request_queue_db");
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          const database = openRequest.result;
          if (!database.objectStoreNames.contains("request_queue")) {
            database.close();
            resolve();
            return;
          }

          const transaction = database.transaction("request_queue", "readwrite");
          const store = transaction.objectStore("request_queue");
          const getAllRequest = store.getAll();

          getAllRequest.onerror = () => reject(getAllRequest.error);
          getAllRequest.onsuccess = () => {
            for (const entry of getAllRequest.result) {
              store.put(sanitizeLegacyCheckoutValue(entry));
            }
          };
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        };
      });
    })
    .then(() => undefined);
}

export function runLegacyCheckoutDataScrub(): void {
  if (typeof window === "undefined") return;

  try {
    if (window.localStorage.getItem(SCRUB_VERSION_KEY) === SCRUB_VERSION) return;

    window.localStorage.removeItem("localeats_saved_cards");
    for (const key of TEXT_STORAGE_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value !== null) {
        window.localStorage.setItem(
          key,
          stripLegacyCardMachinePaymentSegment(value),
        );
      }
    }
    for (const key of JSON_STORAGE_KEYS) {
      scrubJsonStorageKey(window.localStorage, key);
    }

    void scrubLegacyRequestQueueDatabase()
      .then(() => {
        window.localStorage.setItem(SCRUB_VERSION_KEY, SCRUB_VERSION);
      })
      .catch(() => {
        // Leave the marker unset so the narrowly scoped scrub retries next load.
      });
  } catch {
    // Storage may be unavailable in private browsing or hardened environments.
  }
}
