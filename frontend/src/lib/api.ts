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

async function authRequest<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
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

export type OfferSort = "newest" | "price_asc" | "price_desc" | "discount" | "distance";

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
  return request<FoodOffer[]>(`/api/offers${suffix}`);
}

export function getOffer(offerId: number): Promise<FoodOffer> {
  return request<FoodOffer>(`/api/offers/${offerId}`);
}

export function registerUser(payload: { name: string; email: string; password: string }): Promise<User> {
  return request<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload: { email: string; password: string }): Promise<TokenResponse> {
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
  status: "PENDING" | "PAID" | "READY_FOR_PICKUP" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  pickup_code: string;
  created_at: string;
  items: OrderItem[];
}

export function getCurrentUser(token: string): Promise<User> {
  return authRequest<User>("/api/auth/me", token);
}

export function createOrder(token: string, items: OrderItemCreate[]): Promise<Order> {
  return authRequest<Order>("/api/orders", token, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
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

export function createPayment(token: string, orderId: number): Promise<PaymentStartResponse> {
  return authRequest<PaymentStartResponse>(`/api/payments/orders/${orderId}`, token, { method: "POST" });
}
export function getOrders(token: string): Promise<Order[]> {
  return authRequest<Order[]>("/api/orders", token);
}

export function getOrder(token: string, orderId: number): Promise<Order> {
  return authRequest<Order>(`/api/orders/${orderId}`, token);
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

export function getMerchantProfile(token: string): Promise<MerchantProfile> {
  return authRequest<MerchantProfile>("/api/merchant/profile", token);
}

export function createMerchantProfile(token: string, payload: Omit<MerchantProfile, "id" | "user_id">): Promise<MerchantProfile> {
  return authRequest<MerchantProfile>("/api/merchant/profile", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getMyOffers(token: string): Promise<FoodOffer[]> {
  return authRequest<FoodOffer[]>("/api/offers/mine", token);
}

export function createOffer(token: string, payload: OfferPayload): Promise<FoodOffer> {
  return authRequest<FoodOffer>("/api/offers", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deactivateOffer(token: string, offerId: number): Promise<FoodOffer> {
  return authRequest<FoodOffer>(`/api/offers/${offerId}`, token, { method: "DELETE" });
}

export function updateOrderStatus(token: string, orderId: number, status: Order["status"]): Promise<Order> {
  return authRequest<Order>(`/api/orders/${orderId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
