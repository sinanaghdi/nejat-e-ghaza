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

export function getOffers(): Promise<FoodOffer[]> {
  return request<FoodOffer[]>("/api/offers");
}
