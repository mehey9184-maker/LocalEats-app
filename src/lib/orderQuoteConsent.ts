export interface CreateOrderItemInput {
  menu_item_id: string;
  quantity: number;
  variant_id?: string;
  notes?: string;
}

export interface QuoteOrderRequestData {
  idempotency_key: string;
  shop_id: string | number;
  items: CreateOrderItemInput[];
  delivery_type: "delivery" | "collection";
  delivery_schedule_mode: "standard";
  delivery_coordinates?: {
    lat: number;
    lng: number;
  };
  tip_amount: number;
  payment_method: "cash" | "card_machine" | "cash_on_arrival";
  customer_details: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    delivery_instructions?: string;
  };
}

export interface CreateOrderRequestData extends QuoteOrderRequestData {
  accepted_total_price: number;
}

export interface AuthoritativeOrderQuote {
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  discount_amount: number;
  tip_amount: number;
  total_price: number;
  delivery_type: QuoteOrderRequestData["delivery_type"];
  payment_method: QuoteOrderRequestData["payment_method"];
}

export class OrderApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OrderApiError";
  }
}

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const child = (value as Record<string, unknown>)[key];
        if (child !== undefined) result[key] = canonicalize(child);
        return result;
      }, {});
  }
  return value;
};

export const fingerprintOrderIntent = (request: QuoteOrderRequestData): string =>
  JSON.stringify(canonicalize(request));

export const retainQuoteConsentForIntent = <T extends { fingerprint: string }>(
  storedQuote: T | null,
  currentFingerprint: string | null,
): T | null =>
  storedQuote && currentFingerprint === storedQuote.fingerprint
    ? storedQuote
    : null;

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

export const freezeOrderIntent = (request: QuoteOrderRequestData): QuoteOrderRequestData =>
  deepFreeze(JSON.parse(JSON.stringify(request)) as QuoteOrderRequestData);

export const createOrderRequestFromQuote = (
  frozenRequest: QuoteOrderRequestData,
  quote: AuthoritativeOrderQuote,
): CreateOrderRequestData => ({
  ...freezeOrderIntent(frozenRequest),
  accepted_total_price: quote.total_price,
});

const readApiError = (
  payload: Record<string, unknown>,
  fallback: string,
  status: number,
): OrderApiError =>
  new OrderApiError(
    typeof payload.error === "string" ? payload.error : fallback,
    typeof payload.code === "string" ? payload.code : undefined,
    status,
  );

export async function requestAuthoritativeOrderQuote(
  request: QuoteOrderRequestData,
  apiBaseUrl: string,
  authHeaders: Record<string, string>,
  fetchImplementation: typeof fetch = fetch,
): Promise<AuthoritativeOrderQuote> {
  if (Object.prototype.hasOwnProperty.call(request, "accepted_total_price")) {
    throw new OrderApiError("A quote request cannot contain price consent.");
  }

  const response = await fetchImplementation(
    `${apiBaseUrl.replace(/\/+$/, "")}/api/v1/orders/quote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(request),
    },
  );
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new OrderApiError(
      "LocalEats order service returned an invalid quote response.",
      undefined,
      response.status,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new OrderApiError(
      "LocalEats order service returned an invalid quote response.",
      undefined,
      response.status,
    );
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new OrderApiError("LocalEats order service returned an invalid quote response.");
  }
  const payload = data as Record<string, unknown>;
  if (!response.ok) {
    throw readApiError(payload, "The final order total could not be confirmed.", response.status);
  }
  if (payload.success !== true || !payload.quote || typeof payload.quote !== "object" || Array.isArray(payload.quote)) {
    throw new OrderApiError("LocalEats order service returned an invalid quote response.");
  }

  const rawQuote = payload.quote as Record<string, unknown>;
  const money = (field: keyof AuthoritativeOrderQuote): number => {
    const value = rawQuote[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new OrderApiError(`LocalEats order service returned an invalid quote ${field}.`);
    }
    return value;
  };
  const deliveryType = rawQuote.delivery_type;
  const paymentMethod = rawQuote.payment_method;
  if (deliveryType !== "delivery" && deliveryType !== "collection") {
    throw new OrderApiError("LocalEats order service returned an invalid quote delivery type.");
  }
  if (paymentMethod !== "cash" && paymentMethod !== "cash_on_arrival" && paymentMethod !== "card_machine") {
    throw new OrderApiError("LocalEats order service returned an invalid quote payment method.");
  }
  if (deliveryType !== request.delivery_type || paymentMethod !== request.payment_method) {
    throw new OrderApiError("LocalEats order service returned a quote for a different order intent.");
  }

  return {
    subtotal: money("subtotal"),
    delivery_fee: money("delivery_fee"),
    service_fee: money("service_fee"),
    discount_amount: money("discount_amount"),
    tip_amount: money("tip_amount"),
    total_price: money("total_price"),
    delivery_type: deliveryType,
    payment_method: paymentMethod,
  };
}
