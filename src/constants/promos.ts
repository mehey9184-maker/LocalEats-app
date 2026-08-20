export const LOCAL_PROMO_DB: Record<
  string,
  {
    code: string;
    type: "percent" | "fixed" | "delivery_free";
    value: number;
    expiry_date: string;
    is_active: boolean;
  }
> = {
  LOCALEATS10: {
    code: "LOCALEATS10",
    type: "percent",
    value: 10,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  },
  FIRSTTREAT: {
    code: "FIRSTTREAT",
    type: "fixed",
    value: 15,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  },
  BICYCLE5: {
    code: "BICYCLE5",
    type: "delivery_free",
    value: 5,
    expiry_date: "2027-12-31T23:59:59Z",
    is_active: true,
  },
  EXPIRED20: {
    code: "EXPIRED20",
    type: "percent",
    value: 20,
    expiry_date: "2025-01-01T00:00:00Z",
    is_active: true,
  },
  EXPIREDHALF: {
    code: "EXPIREDHALF",
    type: "percent",
    value: 50,
    expiry_date: "2026-05-01T00:00:00Z",
    is_active: true,
  },
};

export const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
