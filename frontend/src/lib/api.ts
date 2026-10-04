const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = "خطایی در ارتباط با سرور رخ داد.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // Keep the Persian fallback when the response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

async function authRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  if (token && token !== "cookie-session") {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method) && !getCsrfToken()) {
    await getCsrfTokenFromServer();
  }

  const csrfToken = getCsrfToken();
  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  return request<T>(path, {
    ...options,
    headers,
  });
}

async function getCsrfTokenFromServer(): Promise<string> {
  const payload = await request<{ csrf_token: string }>("/api/auth/csrf");
  setCsrfToken(payload.csrf_token);
  return payload.csrf_token;
}

export interface FoodOffer {
  id: number;
  merchant_id: number;
  merchant: {
    id: number;
    business_name: string;
    city: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  };
  title: string;
  description: string | null;
  original_price: number;
  sale_price: number;
  quantity: number;
  available_quantity: number;
  pickup_start: string;
  pickup_end: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "CUSTOMER" | "MERCHANT" | "ADMIN";
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export type OfferSort =
  | "newest"
  | "price_asc"
  | "price_desc"
  | "discount"
  | "distance";

export interface OfferFilters {
  query?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
  sort?: OfferSort;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
}

export function getOffers(filters: OfferFilters = {}): Promise<FoodOffer[]> {
  const params = new URLSearchParams();
  if (filters.query?.trim()) params.set("query", filters.query.trim());
  if (filters.city?.trim()) params.set("city", filters.city.trim());
  if (filters.min_price !== undefined) params.set("min_price", String(filters.min_price));
  if (filters.max_price !== undefined) params.set("max_price", String(filters.max_price));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.latitude !== undefined) params.set("latitude", String(filters.latitude));
  if (filters.longitude !== undefined) params.set("longitude", String(filters.longitude));
  if (filters.radius_km !== undefined) params.set("radius_km", String(filters.radius_km));

  const suffix = params.toString() ? `?${params.toString()}` : "";

  return request<unknown[]>(`/api/offers${suffix}`).then((items) =>
    items.map(normalizeFoodOffer),
  );
}

export function getOffer(offerId: number): Promise<FoodOffer> {
  return request<unknown>(`/api/offers/${offerId}`).then(normalizeFoodOffer);
}

export function registerUser(
  payload: { name: string; email: string; password: string },
): Promise<User> {
  return request<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(
  payload: { email: string; password: string },
): Promise<TokenResponse> {
  return request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface OrderItemCreate {
  food_offer_id: number;
  quantity: number;
}

export interface OrderItem {
  id: number;
  food_offer_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  customer_id: number;
  merchant_id: number;
  total_amount: number;
  status:
    | "PENDING"
    | "PAID"
    | "READY_FOR_PICKUP"
    | "COMPLETED"
    | "CANCELLED"
    | "EXPIRED";
  pickup_code: string;
  created_at: string;
  items: OrderItem[];
}

export function getCurrentUser(token: string | null): Promise<User> {
  return authRequest<User>("/api/auth/me", token);
}

export function createOrder(
  token: string | null,
  items: OrderItemCreate[],
): Promise<Order> {
  return authRequest<unknown>("/api/orders", token, {
    method: "POST",
    body: JSON.stringify({ items }),
  }).then(normalizeOrder);
}

export interface PaymentResponse {
  id: number;
  order_id: number;
  provider: string;
  authority: string;
  reference_id: string | null;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export interface PaymentStartResponse {
  payment: PaymentResponse;
  checkout_url: string;
}

export function createPayment(
  token: string | null,
  orderId: number,
): Promise<PaymentStartResponse> {
  return authRequest<unknown>(`/api/payments/orders/${orderId}`, token, {
    method: "POST",
  }).then((payload) => {
    const raw = payload as { payment: unknown; checkout_url: string };
    return {
      payment: normalizePayment(raw.payment),
      checkout_url: raw.checkout_url,
    };
  });
}

export function getOrders(token: string | null): Promise<Order[]> {
  return authRequest<unknown[]>("/api/orders", token).then((items) =>
    items.map(normalizeOrder),
  );
}

export function getOrder(token: string | null, orderId: number): Promise<Order> {
  return authRequest<unknown>(`/api/orders/${orderId}`, token).then(
    normalizeOrder,
  );
}

export interface MerchantProfile {
  id: number;
  user_id: number;
  business_name: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface OfferPayload {
  title: string;
  description?: string;
  original_price: number;
  sale_price: number;
  quantity: number;
  pickup_start: string;
  pickup_end: string;
  image_url?: string;
}

export function getMerchantProfile(token: string | null): Promise<MerchantProfile> {
  return authRequest<MerchantProfile>("/api/merchant/profile", token);
}

export function createMerchantProfile(
  token: string | null,
  payload: Omit<MerchantProfile, "id" | "user_id">,
): Promise<MerchantProfile> {
  return authRequest<MerchantProfile>("/api/merchant/profile", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyOffers(token: string | null): Promise<FoodOffer[]> {
  return authRequest<unknown[]>("/api/offers/mine", token).then((items) =>
    items.map(normalizeFoodOffer),
  );
}

export function createOffer(
  token: string | null,
  payload: OfferPayload,
): Promise<FoodOffer> {
  return authRequest<unknown>("/api/offers", token, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeFoodOffer);
}

export function deactivateOffer(
  token: string | null,
  offerId: number,
): Promise<FoodOffer> {
  return authRequest<unknown>(`/api/offers/${offerId}`, token, {
    method: "DELETE",
  }).then(normalizeFoodOffer);
}

export function updateOrderStatus(
  token: string | null,
  orderId: number,
  status: Order["status"],
): Promise<Order> {
  return authRequest<unknown>(`/api/orders/${orderId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }).then(normalizeOrder);
}

function normalizeFoodOffer(value: unknown): FoodOffer {
  const offer = value as Record<string, unknown>;
  const merchant = offer.merchant as Record<string, unknown>;

  return {
    id: Number(offer.id),
    merchant_id: Number(offer.merchant_id),
    merchant: {
      id: Number(merchant.id),
      business_name: String(merchant.business_name),
      city: String(merchant.city),
      address: String(merchant.address),
      latitude:
        merchant.latitude === null || merchant.latitude === undefined
          ? null
          : Number(merchant.latitude),
      longitude:
        merchant.longitude === null || merchant.longitude === undefined
          ? null
          : Number(merchant.longitude),
    },
    title: String(offer.title),
    description:
      offer.description === null || offer.description === undefined
        ? null
        : String(offer.description),
    original_price: Number(offer.original_price),
    sale_price: Number(offer.sale_price),
    quantity: Number(offer.quantity),
    available_quantity: Number(offer.available_quantity),
    pickup_start: String(offer.pickup_start),
    pickup_end: String(offer.pickup_end),
    image_url:
      offer.image_url === null || offer.image_url === undefined
        ? null
        : String(offer.image_url),
    is_active: Boolean(offer.is_active),
    created_at: String(offer.created_at),
  };
}

function normalizeOrder(value: unknown): Order {
  const order = value as Record<string, unknown>;
  const rawItems = Array.isArray(order.items) ? order.items : [];

  return {
    id: Number(order.id),
    customer_id: Number(order.customer_id),
    merchant_id: Number(order.merchant_id),
    total_amount: Number(order.total_amount),
    status: String(order.status) as Order["status"],
    pickup_code: String(order.pickup_code),
    created_at: String(order.created_at),
    items: rawItems.map((value) => {
      const item = value as Record<string, unknown>;
      return {
        id: Number(item.id),
        food_offer_id: Number(item.food_offer_id),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      };
    }),
  };
}

function normalizePayment(value: unknown): PaymentResponse {
  const payment = value as Record<string, unknown>;

  return {
    id: Number(payment.id),
    order_id: Number(payment.order_id),
    provider: String(payment.provider),
    authority: String(payment.authority),
    reference_id:
      payment.reference_id === null || payment.reference_id === undefined
        ? null
        : String(payment.reference_id),
    amount: Number(payment.amount),
    status: String(payment.status),
    created_at: String(payment.created_at),
    paid_at:
      payment.paid_at === null || payment.paid_at === undefined
        ? null
        : String(payment.paid_at),
  };
}


export function logoutUser(): Promise<{ status: string }> {
  return request<{ status: string }>("/api/auth/logout", {
    method: "POST",
    headers: getCsrfToken()
      ? { "X-CSRF-Token": getCsrfToken() as string }
      : undefined,
  });
}
