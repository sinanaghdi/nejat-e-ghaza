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

export function getOffers(): Promise<FoodOffer[]> {
  return request<FoodOffer[]>("/api/offers");
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
