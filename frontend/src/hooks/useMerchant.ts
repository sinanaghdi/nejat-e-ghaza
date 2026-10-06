import { useEffect, useState, type FormEvent } from "react";
import type { FoodOffer, MerchantProfile, OfferPayload, Order } from "../lib/api";
import {
  ApiError,
  createMerchantProfile,
  createOffer,
  deactivateOffer,
  getMerchantProfile,
  getMyOffers,
  getOrders,
  updateOrderStatus,
} from "../lib/api";
import { getToken } from "../lib/auth";
import type { AuthMode } from "./useAuth";

type MerchantForm = {
  business_name: string;
  description: string;
  address: string;
  city: string;
  latitude: string;
  longitude: string;
};

type OfferForm = {
  title: string;
  description: string;
  original_price: string;
  sale_price: string;
  quantity: string;
  pickup_start: string;
  pickup_end: string;
  image_url: string;
};

type Params = {
  isMerchantPage: boolean;
  openAuth: (mode: AuthMode) => void;
};

export function useMerchant({ isMerchantPage, openAuth }: Params) {
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
  const [merchantOffers, setMerchantOffers] = useState<FoodOffer[]>([]);
  const [merchantOrders, setMerchantOrders] = useState<Order[]>([]);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantError, setMerchantError] = useState("");
  const [merchantFormOpen, setMerchantFormOpen] = useState(false);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [merchantForm, setMerchantForm] = useState<MerchantForm>({
    business_name: "",
    description: "",
    address: "",
    city: "",
    latitude: "",
    longitude: "",
  });
  const [offerForm, setOfferForm] = useState<OfferForm>({
    title: "",
    description: "",
    original_price: "",
    sale_price: "",
    quantity: "1",
    pickup_start: "",
    pickup_end: "",
    image_url: "",
  });

  async function loadMerchant() {
    const token = getToken();
    if (!token) return;

    setMerchantLoading(true);
    setMerchantError("");

    try {
      const [profile, offers, orders] = await Promise.all([
        getMerchantProfile(token),
        getMyOffers(token),
        getOrders(token),
      ]);
      setMerchantProfile(profile);
      setMerchantOffers(offers);
      setMerchantOrders(orders);
    } catch (err) {
      setMerchantError(
        err instanceof ApiError
          ? err.message
          : "دریافت اطلاعات فروشگاه انجام نشد.",
      );
    } finally {
      setMerchantLoading(false);
    }
  }

  useEffect(() => {
    if (isMerchantPage) {
      void loadMerchant();
    }
  }, [isMerchantPage]);

  async function openMerchantDashboard() {
    const token = getToken();
    if (!token) {
      openAuth("login");
      return;
    }

    setMerchantOpen(true);
    await loadMerchant();
  }

  async function removeMerchantOffer(offerId: number) {
    const token = getToken();
    if (!token) return;

    try {
      const updated = await deactivateOffer(token, offerId);
      setMerchantOffers((items) =>
        items.map((item) => (item.id === offerId ? updated : item)),
      );
    } catch (err) {
      setMerchantError(
        err instanceof ApiError
          ? err.message
          : "غیرفعال کردن پیشنهاد انجام نشد.",
      );
    }
  }

  async function changeMerchantOrderStatus(
    orderId: number,
    status: Order["status"],
  ) {
    const token = getToken();
    if (!token) return;

    try {
      const updated = await updateOrderStatus(token, orderId, status);
      setMerchantOrders((items) =>
        items.map((item) => (item.id === orderId ? updated : item)),
      );
    } catch (err) {
      setMerchantError(
        err instanceof ApiError
          ? err.message
          : "تغییر وضعیت سفارش انجام نشد.",
      );
    }
  }

  async function submitMerchantProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();
    if (!token) return;

    try {
      const profile = await createMerchantProfile(token, {
        business_name: merchantForm.business_name,
        description: merchantForm.description || null,
        address: merchantForm.address,
        city: merchantForm.city,
        latitude: merchantForm.latitude ? Number(merchantForm.latitude) : null,
        longitude: merchantForm.longitude
          ? Number(merchantForm.longitude)
          : null,
      });
      setMerchantProfile(profile);
      setMerchantFormOpen(false);
      setMerchantError("");
    } catch (err) {
      setMerchantError(
        err instanceof ApiError
          ? err.message
          : "ساخت پروفایل فروشگاه انجام نشد.",
      );
    }
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();
    if (!token) return;

    try {
      const payload: OfferPayload = {
        title: offerForm.title,
        description: offerForm.description || undefined,
        original_price: Number(offerForm.original_price),
        sale_price: Number(offerForm.sale_price),
        quantity: Number(offerForm.quantity),
        pickup_start: new Date(offerForm.pickup_start).toISOString(),
        pickup_end: new Date(offerForm.pickup_end).toISOString(),
        image_url: offerForm.image_url || undefined,
      };
      const offer = await createOffer(token, payload);
      setMerchantOffers((items) => [offer, ...items]);
      setOfferFormOpen(false);
      setMerchantError("");
    } catch (err) {
      setMerchantError(
        err instanceof ApiError
          ? err.message
          : "ایجاد پیشنهاد انجام نشد.",
      );
    }
  }

  return {
    merchantOpen,
    merchantProfile,
    merchantOffers,
    merchantOrders,
    merchantLoading,
    merchantError,
    merchantFormOpen,
    offerFormOpen,
    merchantForm,
    offerForm,
    setMerchantOpen,
    setMerchantFormOpen,
    setOfferFormOpen,
    setMerchantForm,
    setOfferForm,
    openMerchantDashboard,
    removeMerchantOffer,
    changeMerchantOrderStatus,
    submitMerchantProfile,
    submitOffer,
  };
}
