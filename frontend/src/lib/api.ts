import { getCsrfToken, setCsrfToken } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

const DEMO_NOW = Date.now();

function demoDate(offsetHours: number): string {
  return new Date(DEMO_NOW + offsetHours * 60 * 60 * 1000).toISOString();
}

const DEMO_OFFERS: FoodOffer[] = [
  {
    id: 1, merchant_id: 101,
    merchant: { id: 101, business_name: "کافه سبز", city: "کرمانشاه", address: "بلوار طاق‌بستان", latitude: 34.329, longitude: 47.077 },
    title: "باکس صبحانه ویژه", description: "ترکیبی از صبحانه تازه و خوراکی‌های روز کافه با تخفیف ویژه.",
    original_price: 180000, sale_price: 89000, quantity: 8, available_quantity: 5,
    pickup_start: demoDate(1), pickup_end: demoDate(4), image_url: null, is_active: true, created_at: demoDate(-1),
  },
  {
    id: 2, merchant_id: 102,
    merchant: { id: 102, business_name: "فست‌فود هفت", city: "کرمانشاه", address: "خیابان برق", latitude: 34.317, longitude: 47.082 },
    title: "باکس پیتزا و سیب‌زمینی", description: "غذای مازاد تازه امشب با قیمت کمتر؛ مناسب یک نفر.",
    original_price: 320000, sale_price: 159000, quantity: 6, available_quantity: 3,
    pickup_start: demoDate(2), pickup_end: demoDate(5), image_url: null, is_active: true, created_at: demoDate(-0.5),
  },
  {
    id: 3, merchant_id: 103,
    merchant: { id: 103, business_name: "رستوران خانه", city: "کرمانشاه", address: "میدان آزادگان", latitude: 34.301, longitude: 47.088 },
    title: "باکس شام خانوادگی", description: "چند غذای محبوب رستوران برای جلوگیری از هدررفت مواد غذایی.",
    original_price: 540000, sale_price: 249000, quantity: 4, available_quantity: 2,
    pickup_start: demoDate(1.5), pickup_end: demoDate(4.5), image_url: null, is_active: true, created_at: demoDate(-2),
  },
  {
    id: 4, merchant_id: 101,
    merchant: { id: 101, business_name: "کافه سبز", city: "کرمانشاه", address: "بلوار طاق‌بستان", latitude: 34.329, longitude: 47.077 },
    title: "باکس در انتظار بررسی", description: "پیشنهاد نمونه برای نمایش صف بررسی مدیر.",
    original_price: 210000, sale_price: 99000, quantity: 5, available_quantity: 5,
    pickup_start: demoDate(2), pickup_end: demoDate(5), image_url: null,
    is_active: true, moderation_status: "PENDING", moderation_reason: null, moderated_at: null, created_at: demoDate(-0.2),
  },
];

function demoDistanceKm(latitude: number, longitude: number, offer: FoodOffer): number {
  if (offer.merchant.latitude === null || offer.merchant.longitude === null) return Number.POSITIVE_INFINITY;
  const toRadians = (value: number) => value * Math.PI / 180;
  const lat1 = toRadians(latitude);
  const lat2 = toRadians(offer.merchant.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(offer.merchant.longitude - longitude);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function demoOffers(filters: OfferFilters = {}): FoodOffer[] {
  let items = DEMO_OFFERS.filter((item) => {
    const merchant = DEMO_ADMIN_MERCHANTS.find((candidate) => candidate.id === item.merchant_id);
    return item.is_active &&
      item.available_quantity > 0 &&
      new Date(item.pickup_end).getTime() > Date.now() &&
      item.moderation_status === "APPROVED" &&
      merchant?.verification_status === "VERIFIED";
  });

  if (filters.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    items = items.filter((item) =>
      [item.title, item.description ?? "", item.merchant.business_name].join(" ").toLowerCase().includes(q)
    );
  }
  if (filters.city?.trim()) {
    const city = filters.city.trim().toLowerCase();
    items = items.filter((item) => item.merchant.city.toLowerCase().includes(city));
  }
  if (filters.min_price !== undefined) {
    items = items.filter((item) => item.sale_price >= filters.min_price!);
  }
  if (filters.max_price !== undefined) {
    items = items.filter((item) => item.sale_price <= filters.max_price!);
  }
  if (filters.radius_km !== undefined && filters.latitude !== undefined && filters.longitude !== undefined) {
    items = items.filter((item) => demoDistanceKm(filters.latitude!, filters.longitude!, item) <= filters.radius_km!);
  }

  if (filters.sort === "price_asc") items.sort((a, b) => a.sale_price - b.sale_price);
  else if (filters.sort === "price_desc") items.sort((a, b) => b.sale_price - a.sale_price);
  else if (filters.sort === "discount") items.sort((a, b) =>
    ((b.original_price - b.sale_price) / b.original_price) -
    ((a.original_price - a.sale_price) / a.original_price)
  );
  else if (filters.sort === "distance" && filters.latitude !== undefined && filters.longitude !== undefined) {
    items.sort((a, b) =>
      demoDistanceKm(filters.latitude!, filters.longitude!, a) -
      demoDistanceKm(filters.latitude!, filters.longitude!, b)
    );
  } else {
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return items;
}


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

export type MerchantVerificationStatus = "PENDING" | "VERIFIED" | "SUSPENDED";
export type OfferModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

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
  moderation_status: OfferModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: "CUSTOMER" | "MERCHANT" | "ADMIN";
}

const DEMO_USERS: Record<User["role"], User> = {
  CUSTOMER: { id: 11, name: "مشتری دمو", email: "customer@demo.local", role: "CUSTOMER" },
  MERCHANT: { id: 21, name: "فروشنده دمو", email: "merchant@demo.local", role: "MERCHANT" },
  ADMIN: { id: 1, name: "مدیر دمو", email: "admin@demo.local", role: "ADMIN" },
};

let DEMO_ORDERS: Order[] = [
  {
    id: 1001,
    customer_id: 11,
    merchant_id: 101,
    total_amount: 178000,
    status: "PAID",
    pickup_code: "4182",
    created_at: "2026-10-06T11:30:00Z",
    items: [{ id: 1, food_offer_id: 1, quantity: 2, unit_price: 89000, subtotal: 178000 }],
  },
];

const DEMO_MERCHANT_PROFILE: MerchantProfile = {
  id: 101,
  user_id: 21,
  business_name: "کافه سبز",
  description: "کافه دمو برای نمایش پنل فروشنده نجات غذا",
  address: "بلوار طاق‌بستان",
  city: "کرمانشاه",
  latitude: 34.329,
  longitude: 47.077,
  verification_status: "VERIFIED",
  verification_reason: null,
};

let DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 9001,
    user_id: 11,
    title: "به نجات غذا خوش آمدی",
    body: "اعلان‌های سفارش و پرداخت از اینجا قابل پیگیری هستند.",
    notification_type: "INFO",
    entity_type: null,
    entity_id: null,
    is_read: false,
    created_at: new Date().toISOString(),
  },
];

function addDemoNotification(
  role: User["role"],
  title: string,
  body: string,
  notificationType: string,
  entityType: string | null = null,
  entityId: number | null = null,
): void {
  DEMO_NOTIFICATIONS.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    user_id: DEMO_USERS[role].id,
    title,
    body,
    notification_type: notificationType,
    entity_type: entityType,
    entity_id: entityId,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

const DEMO_ADMIN_USERS = [
  { id: 1, name: "مدیر دمو", email: "admin@demo.local", role: "ADMIN" as const },
  { id: 11, name: "مشتری دمو", email: "customer@demo.local", role: "CUSTOMER" as const },
  { id: 21, name: "فروشنده دمو", email: "merchant@demo.local", role: "MERCHANT" as const },
];

const DEMO_ADMIN_MERCHANTS: AdminMerchant[] = [
  { id: 101, user_id: 21, business_name: "کافه سبز", address: "بلوار طاق‌بستان", city: "کرمانشاه", verification_status: "VERIFIED", verification_reason: null, created_at: demoDate(-24) },
  { id: 102, user_id: 22, business_name: "فست‌فود هفت", address: "خیابان برق", city: "کرمانشاه", verification_status: "VERIFIED", verification_reason: null, created_at: demoDate(-48) },
  { id: 103, user_id: 23, business_name: "رستوران خانه", address: "میدان آزادگان", city: "کرمانشاه", verification_status: "VERIFIED", verification_reason: null, created_at: demoDate(-72) },
  { id: 104, user_id: 24, business_name: "کافه در انتظار تایید", address: "خیابان دانشگاه", city: "کرمانشاه", verification_status: "PENDING", verification_reason: null, created_at: demoDate(-4) },
];

export interface TokenResponse {
  access_token: string | null;
  token_type: string;
  csrf_token: string;
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
  if (import.meta.env.VITE_DEMO_MODE === "true") return Promise.resolve(demoOffers(filters));
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
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const offer = demoOffers().find((item) => item.id === offerId);
    return offer
      ? Promise.resolve(offer)
      : Promise.reject(new ApiError("پیشنهاد پیدا نشد.", 404));
  }
  return request<unknown>(`/api/offers/${offerId}`).then(normalizeFoodOffer);
}

export function loginDemoUser(role: User["role"]): Promise<TokenResponse> {
  const user = DEMO_USERS[role];
  setCsrfToken("demo-csrf-token");
  return Promise.resolve({
    access_token: `demo:${role}`,
    token_type: "demo",
    csrf_token: "demo-csrf-token",
  });
}

export function getDemoUser(role: User["role"]): User {
  return DEMO_USERS[role];
}

export function registerUser(
  payload: { name: string; email: string; password: string },
): Promise<User> {
  return request<User>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(
  payload: { email: string; password: string },
): Promise<TokenResponse> {
  const response = await request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setCsrfToken(response.csrf_token);
  return response;
}

export interface AppNotification {
  id: number;
  user_id?: number;
  title: string;
  body: string;
  notification_type: string;
  entity_type: string | null;
  entity_id: number | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unread_count: number;
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
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    return role && DEMO_USERS[role]
      ? Promise.resolve(DEMO_USERS[role])
      : Promise.reject(new ApiError("برای دمو وارد نشده‌اید.", 401));
  }
  return authRequest<User>("/api/auth/me", token);
}

export function createOrder(
  token: string | null,
  items: OrderItemCreate[],
): Promise<Order> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "CUSTOMER") return Promise.reject(new ApiError("فقط حساب مشتری می‌تواند سفارش ثبت کند.", 403));
    if (!items.length) return Promise.reject(new ApiError("سبد خرید خالی است.", 422));

    const ids = items.map((item) => item.food_offer_id);
    if (new Set(ids).size !== ids.length) return Promise.reject(new ApiError("هر پیشنهاد فقط یک‌بار در سفارش مجاز است.", 422));

    const offers = items.map((item) => DEMO_OFFERS.find((offer) => offer.id === item.food_offer_id));
    if (offers.some((offer) => !offer)) return Promise.reject(new ApiError("یکی از پیشنهادها پیدا نشد.", 404));

    const resolved = offers as FoodOffer[];
    const merchantId = resolved[0].merchant_id;
    if (resolved.some((offer) => offer.merchant_id !== merchantId)) {
      return Promise.reject(new ApiError("در هر سفارش فقط از یک فروشنده خرید کن.", 422));
    }

    for (let index = 0; index < items.length; index += 1) {
      const requested = items[index];
      const offer = resolved[index];
      const merchant = DEMO_ADMIN_MERCHANTS.find((candidate) => candidate.id === offer.merchant_id);
      if (
        !offer.is_active ||
        offer.moderation_status !== "APPROVED" ||
        merchant?.verification_status !== "VERIFIED" ||
        new Date(offer.pickup_end).getTime() <= Date.now()
      ) {
        return Promise.reject(new ApiError("یکی از پیشنهادها دیگر قابل خرید نیست.", 409));
      }
      if (offer.available_quantity < requested.quantity) {
        return Promise.reject(new ApiError("موجودی یکی از پیشنهادها کافی نیست.", 409));
      }
    }

    const orderItems = items.map((requested, index) => {
      const offer = resolved[index];
      offer.available_quantity -= requested.quantity;
      return {
        id: Date.now() + index,
        food_offer_id: offer.id,
        quantity: requested.quantity,
        unit_price: offer.sale_price,
        subtotal: offer.sale_price * requested.quantity,
      };
    });

    const order: Order = {
      id: Date.now(),
      customer_id: 11,
      merchant_id: merchantId,
      total_amount: orderItems.reduce((sum, item) => sum + item.subtotal, 0),
      status: "PENDING",
      pickup_code: String(Math.floor(1000 + Math.random() * 9000)),
      created_at: new Date().toISOString(),
      items: orderItems,
    };

    DEMO_ORDERS.unshift(order);
    addDemoNotification("CUSTOMER", "سفارش ثبت شد", `سفارش #${order.id} ثبت شد و آماده پرداخت است.`, "ORDER", "order", order.id);
    addDemoNotification("MERCHANT", "سفارش جدید", `سفارش #${order.id} برای فروشگاه شما ثبت شد.`, "ORDER", "order", order.id);
    return Promise.resolve(order);
  }

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
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "CUSTOMER") {
      return Promise.reject(new ApiError("فقط مشتری می‌تواند پرداخت را شروع کند.", 403));
    }

    const order = DEMO_ORDERS.find((item) => item.id === orderId);
    if (!order) return Promise.reject(new ApiError("سفارش پیدا نشد.", 404));
    if (order.status !== "PENDING") {
      return Promise.reject(new ApiError("این سفارش در وضعیت قابل پرداخت نیست.", 409));
    }

    const paidAt = new Date().toISOString();
    const referenceId = "DEMO-" + orderId;
    order.status = "PAID";
    addDemoNotification("CUSTOMER", "پرداخت موفق", `پرداخت سفارش #${order.id} با موفقیت ثبت شد.`, "PAYMENT", "order", order.id);
    addDemoNotification("MERCHANT", "پرداخت سفارش تأیید شد", `پرداخت سفارش #${order.id} تأیید شد.`, "PAYMENT", "order", order.id);

    return Promise.resolve({
      payment: {
        id: Date.now(),
        order_id: orderId,
        provider: "mock",
        authority: referenceId,
        reference_id: referenceId,
        amount: order.total_amount,
        status: "PAID",
        created_at: paidAt,
        paid_at: paidAt,
      },
      checkout_url: "#/payment/result?status=success&order_id=" + orderId + "&ref_id=" + referenceId,
    });
  }

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
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "CUSTOMER") return Promise.reject(new ApiError("Customer access required", 403));
    return Promise.resolve(DEMO_ORDERS.filter((order) => order.customer_id === 11));
  }

  return authRequest<unknown[]>("/api/orders", token).then((items) =>
    items.map(normalizeOrder),
  );
}

export function getMerchantOrders(token: string | null): Promise<Order[]> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "MERCHANT") return Promise.reject(new ApiError("Merchant access required", 403));
    return Promise.resolve(DEMO_ORDERS.filter((order) => order.merchant_id === 101));
  }

  return authRequest<unknown[]>("/api/orders/merchant", token).then((items) =>
    items.map(normalizeOrder),
  );
}

export function getOrder(token: string | null, orderId: number): Promise<Order> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "CUSTOMER") return Promise.reject(new ApiError("Customer access required", 403));
    const order = DEMO_ORDERS.find((item) => item.id === orderId && item.customer_id === 11);
    return order
      ? Promise.resolve({ ...order, items: order.items.map((item) => ({ ...item })) })
      : Promise.reject(new ApiError("سفارش پیدا نشد.", 404));
  }

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
  verification_status: MerchantVerificationStatus;
  verification_reason: string | null;
}

export interface AdminMerchant {
  id: number;
  user_id: number;
  business_name: string;
  address: string;
  city: string;
  verification_status: MerchantVerificationStatus;
  verification_reason: string | null;
  created_at: string;
}

export interface AdminModerationOffer {
  id: number;
  merchant_id: number;
  merchant: FoodOffer["merchant"];
  title: string;
  sale_price: number;
  quantity: number;
  available_quantity: number;
  pickup_start: string;
  pickup_end: string;
  image_url: string | null;
  is_active: boolean;
  moderation_status: OfferModerationStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  created_at: string;
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
  if (import.meta.env.VITE_DEMO_MODE === "true") return Promise.resolve(DEMO_MERCHANT_PROFILE);
  return authRequest<MerchantProfile>("/api/merchant/profile", token);
}

export function getAdminUsers(token: string | null): Promise<User[]> {
  if (import.meta.env.VITE_DEMO_MODE === "true") return Promise.resolve(DEMO_ADMIN_USERS);
  return authRequest<unknown[]>("/api/admin/users", token).then((items) =>
    items.map((value) => {
      const item = value as Record<string, unknown>;
      return {
        id: Number(item.id),
        name: String(item.name),
        email: String(item.email),
        role: String(item.role) as User["role"],
      };
    }),
  );
}

export function getAdminMerchants(token: string | null): Promise<AdminMerchant[]> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "ADMIN") return Promise.reject(new ApiError("Admin access required", 403));
    return Promise.resolve(DEMO_ADMIN_MERCHANTS.map((item) => ({ ...item })));
  }
  return authRequest<AdminMerchant[]>("/api/admin/merchants", token);
}

export function updateMerchantVerification(
  token: string | null,
  merchantId: number,
  status: MerchantVerificationStatus,
  reason?: string,
): Promise<AdminMerchant> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "ADMIN") return Promise.reject(new ApiError("Admin access required", 403));
    const merchant = DEMO_ADMIN_MERCHANTS.find((item) => item.id === merchantId);
    if (!merchant) return Promise.reject(new ApiError("فروشگاه پیدا نشد.", 404));
    if (status === "SUSPENDED" && !reason?.trim()) return Promise.reject(new ApiError("علت تعلیق را وارد کن.", 422));
    merchant.verification_status = status;
    merchant.verification_reason = reason?.trim() || null;
    if (merchant.id === DEMO_MERCHANT_PROFILE.id) {
      DEMO_MERCHANT_PROFILE.verification_status = status;
      DEMO_MERCHANT_PROFILE.verification_reason = merchant.verification_reason;
      addDemoNotification("MERCHANT", "وضعیت فروشگاه تغییر کرد", merchant.verification_reason ? `وضعیت فروشگاه به ${status} تغییر کرد: ${merchant.verification_reason}` : `وضعیت فروشگاه به ${status} تغییر کرد.`, "MODERATION", "merchant", merchant.id);
      return Promise.resolve({ ...merchant });
    }
    return Promise.resolve({ ...merchant });
  }
  return authRequest<AdminMerchant>(`/api/admin/merchants/${merchantId}/verification`, token, {
    method: "PATCH",
    body: JSON.stringify({ status, reason: reason?.trim() || undefined }),
  });
}

export function getAdminPendingOffers(token: string | null): Promise<AdminModerationOffer[]> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "ADMIN") return Promise.reject(new ApiError("Admin access required", 403));
    return Promise.resolve(
      DEMO_OFFERS.filter((item) => item.moderation_status === "PENDING").map((item) => ({ ...item })),
    );
  }
  return authRequest<AdminModerationOffer[]>("/api/admin/offers/pending", token);
}

export function moderateAdminOffer(
  token: string | null,
  offerId: number,
  status: Exclude<OfferModerationStatus, "PENDING">,
  reason?: string,
): Promise<AdminModerationOffer> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "ADMIN") return Promise.reject(new ApiError("Admin access required", 403));
    const offer = DEMO_OFFERS.find((item) => item.id === offerId);
    if (!offer) return Promise.reject(new ApiError("پیشنهاد پیدا نشد.", 404));
    if (status === "REJECTED" && !reason?.trim()) return Promise.reject(new ApiError("علت رد پیشنهاد را وارد کن.", 422));
    offer.moderation_status = status;
    offer.moderation_reason = reason?.trim() || null;
    offer.moderated_at = new Date().toISOString();
    addDemoNotification("MERCHANT", status === "APPROVED" ? "پیشنهاد تأیید شد" : "پیشنهاد رد شد", `پیشنهاد «${offer.title}» ${status === "APPROVED" ? "تأیید شد." : "رد شد."}`, "MODERATION", "offer", offer.id);
    return Promise.resolve({ ...offer });
  }
  return authRequest<AdminModerationOffer>(`/api/admin/offers/${offerId}/moderation`, token, {
    method: "PATCH",
    body: JSON.stringify({ status, reason: reason?.trim() || undefined }),
  });
}

export function getAdminOrders(token: string | null): Promise<Order[]> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "ADMIN") return Promise.reject(new ApiError("Admin access required", 403));
    return Promise.resolve(DEMO_ORDERS.map((order) => ({
      ...order,
      items: order.items.map((item) => ({ ...item })),
    })));
  }
  return authRequest<unknown[]>("/api/admin/orders", token).then((items) =>
    items.map(normalizeOrder),
  );
}

export function updateUserRole(
  token: string | null,
  userId: number,
  role: User["role"],
): Promise<User> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const current = DEMO_ADMIN_USERS.find((item) => item.id === userId);
    if (!current) return Promise.reject(new ApiError("کاربر پیدا نشد.", 404));
    current.role = role;
    return Promise.resolve({ ...current });
  }

  return authRequest<unknown>(`/api/admin/users/${userId}/role`, token, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  }).then((value) => {
    const item = value as Record<string, unknown>;
    return {
      id: Number(item.id),
      name: String(item.name),
      email: String(item.email),
      role: String(item.role) as User["role"],
    };
  });
}

export function createMerchantProfile(
  token: string | null,
  payload: Omit<MerchantProfile, "id" | "user_id" | "verification_status" | "verification_reason">,
): Promise<MerchantProfile> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    return Promise.resolve({ ...DEMO_MERCHANT_PROFILE, ...payload });
  }
  return authRequest<MerchantProfile>("/api/merchant/profile", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMerchantProfile(
  token: string | null,
  payload: Omit<MerchantProfile, "id" | "user_id" | "verification_status" | "verification_reason">,
): Promise<MerchantProfile> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const updated = { ...DEMO_MERCHANT_PROFILE, ...payload };
    Object.assign(DEMO_MERCHANT_PROFILE, updated);
    return Promise.resolve(updated);
  }
  return authRequest<MerchantProfile>("/api/merchant/profile", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getMyOffers(token: string | null): Promise<FoodOffer[]> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    return Promise.resolve(DEMO_OFFERS.filter((offer) => offer.merchant_id === 101));
  }
  return authRequest<unknown[]>("/api/offers/mine", token).then((items) =>
    items.map(normalizeFoodOffer),
  );
}

export function createOffer(
  token: string | null,
  payload: OfferPayload,
): Promise<FoodOffer> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const offer: FoodOffer = {
      id: Date.now(),
      merchant_id: 101,
      merchant: DEMO_MERCHANT_PROFILE,
      title: payload.title,
      description: payload.description || null,
      original_price: payload.original_price,
      sale_price: payload.sale_price,
      quantity: payload.quantity,
      available_quantity: payload.quantity,
      pickup_start: payload.pickup_start,
      pickup_end: payload.pickup_end,
      image_url: payload.image_url || null,
      is_active: true,
      moderation_status: "PENDING",
      moderation_reason: null,
      moderated_at: null,
      created_at: new Date().toISOString(),
    };
    DEMO_OFFERS.unshift(offer);
    return Promise.resolve(offer);
  }
  return authRequest<unknown>("/api/offers", token, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeFoodOffer);
}

export function updateOffer(
  token: string | null,
  offerId: number,
  payload: OfferPayload,
): Promise<FoodOffer> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    const offer = DEMO_OFFERS.find((item) => item.id === offerId);
    if (role !== "MERCHANT") return Promise.reject(new ApiError("Merchant access required", 403));
    if (!offer || offer.merchant_id !== 101) return Promise.reject(new ApiError("پیشنهاد پیدا نشد.", 404));
    offer.title = payload.title;
    offer.description = payload.description || null;
    offer.original_price = payload.original_price;
    offer.sale_price = payload.sale_price;
    offer.quantity = payload.quantity;
    offer.available_quantity = Math.min(offer.available_quantity, payload.quantity);
    offer.pickup_start = payload.pickup_start;
    offer.pickup_end = payload.pickup_end;
    offer.image_url = payload.image_url || null;
    offer.moderation_status = "PENDING";
    offer.moderation_reason = null;
    offer.moderated_at = null;
    return Promise.resolve({ ...offer });
  }
  return authRequest<unknown>(`/api/offers/${offerId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }).then(normalizeFoodOffer);
}

export function deactivateOffer(
  token: string | null,
  offerId: number,
): Promise<FoodOffer> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "MERCHANT") return Promise.reject(new ApiError("Merchant access required", 403));
    const offer = DEMO_OFFERS.find((item) => item.id === offerId);
    if (!offer || offer.merchant_id !== 101) return Promise.reject(new ApiError("پیشنهاد پیدا نشد.", 404));
    offer.is_active = false;
    return Promise.resolve({ ...offer });
  }

  return authRequest<unknown>(`/api/offers/${offerId}`, token, {
    method: "DELETE",
  }).then(normalizeFoodOffer);
}

export function updateOrderStatus(
  token: string | null,
  orderId: number,
  status: Order["status"],
): Promise<Order> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    const order = DEMO_ORDERS.find((item) => item.id === orderId);
    if (!order) return Promise.reject(new ApiError("سفارش پیدا نشد.", 404));

    const allowed =
      role === "CUSTOMER" ? (order.status === "PENDING" && status === "CANCELLED") :
      role === "MERCHANT" ? (
        (order.status === "PENDING" && status === "CANCELLED") ||
        (order.status === "PAID" && status === "READY_FOR_PICKUP") ||
        (order.status === "READY_FOR_PICKUP" && status === "COMPLETED")
      ) :
      role === "ADMIN";

    if (!allowed) return Promise.reject(new ApiError("تغییر این وضعیت مجاز نیست.", 403));

    if (status === "CANCELLED") {
      for (const item of order.items) {
        const offer = DEMO_OFFERS.find((candidate) => candidate.id === item.food_offer_id);
        if (offer) offer.available_quantity += item.quantity;
      }
    }

    order.status = status;
    if (role === "MERCHANT" || role === "ADMIN") {
      const title =
        status === "READY_FOR_PICKUP" ? "سفارش آماده دریافت است" :
        status === "COMPLETED" ? "سفارش تحویل شد" :
        status === "CANCELLED" ? "سفارش لغو شد" :
        status === "EXPIRED" ? "سفارش منقضی شد" :
        `وضعیت سفارش #${order.id} تغییر کرد`;
      addDemoNotification("CUSTOMER", title, `وضعیت سفارش #${order.id} به‌روزرسانی شد.`, "ORDER", "order", order.id);
    }
    return Promise.resolve({ ...order, items: order.items.map((item) => ({ ...item })) });
  }

  return authRequest<unknown>(`/api/orders/${orderId}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }).then(normalizeOrder);
}

export function cancelOrder(token: string | null, orderId: number): Promise<Order> {
  return updateOrderStatus(token, orderId, "CANCELLED");
}

export function verifyPickupCode(
  token: string | null,
  orderId: number,
  pickupCode: string,
): Promise<Order> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const order = DEMO_ORDERS.find((item) => item.id === orderId);
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (role !== "MERCHANT") return Promise.reject(new ApiError("Merchant access required", 403));
    if (!order || order.merchant_id !== 101) return Promise.reject(new ApiError("سفارش پیدا نشد.", 404));
    if (order.status !== "READY_FOR_PICKUP") return Promise.reject(new ApiError("سفارش آماده تحویل نیست.", 409));
    if (order.pickup_code !== pickupCode.trim()) return Promise.reject(new ApiError("کد دریافت اشتباه است.", 403));
    order.status = "COMPLETED";
    return Promise.resolve({ ...order, items: order.items.map((item) => ({ ...item })) });
  }

  return authRequest<unknown>(`/api/orders/${orderId}/pickup/verify`, token, {
    method: "POST",
    body: JSON.stringify({ pickup_code: pickupCode }),
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
    moderation_status: String(offer.moderation_status ?? "APPROVED") as OfferModerationStatus,
    moderation_reason:
      offer.moderation_reason === null || offer.moderation_reason === undefined
        ? null
        : String(offer.moderation_reason),
    moderated_at:
      offer.moderated_at === null || offer.moderated_at === undefined
        ? null
        : String(offer.moderated_at),
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


export function getNotifications(token: string | null): Promise<NotificationListResponse> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    if (!role) return Promise.reject(new ApiError("ابتدا وارد حساب شوید.", 401));
    const userId = DEMO_USERS[role].id;
    const items = DEMO_NOTIFICATIONS
      .filter((item) => item.user_id === userId)
      .map(({ user_id: _userId, ...item }) => item);
    return Promise.resolve({
      items,
      unread_count: items.filter((item) => !item.is_read).length,
    });
  }
  return authRequest<NotificationListResponse>("/api/notifications", token);
}

export function markNotificationRead(token: string | null, notificationId: number): Promise<AppNotification> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    const userId = role ? DEMO_USERS[role].id : 0;
    const item = DEMO_NOTIFICATIONS.find((notification) => notification.id === notificationId && notification.user_id === userId);
    if (!item) return Promise.reject(new ApiError("اعلان پیدا نشد.", 404));
    item.is_read = true;
    return Promise.resolve({ ...item });
  }
  return authRequest<AppNotification>(`/api/notifications/${notificationId}/read`, token, { method: "PATCH" });
}

export function markAllNotificationsRead(token: string | null): Promise<number> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    const role = token?.startsWith("demo:") ? token.slice(5) as User["role"] : null;
    const userId = role ? DEMO_USERS[role].id : 0;
    let updated = 0;
    for (const item of DEMO_NOTIFICATIONS) {
      if (item.user_id === userId && !item.is_read) {
        item.is_read = true;
        updated += 1;
      }
    }
    return Promise.resolve(updated);
  }
  return authRequest<{ updated_count: number }>("/api/notifications/read-all", token, { method: "POST" })
    .then((result) => result.updated_count);
}


export function logoutUser(): Promise<{ status: string }> {
  if (import.meta.env.VITE_DEMO_MODE === "true") {
    return Promise.resolve({ status: "ok" });
  }
  return authRequest<{ status: string }>("/api/auth/logout", null, {
    method: "POST",
  });
}
