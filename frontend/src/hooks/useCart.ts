import { useState } from "react";
import type { FoodOffer } from "../lib/api";
import {
  ApiError,
  createOrder,
  createPayment,
} from "../lib/api";
import { getToken } from "../lib/auth";
import type { AuthMode } from "./useAuth";

type CartItem = {
  offer: FoodOffer;
  quantity: number;
};

type Params = {
  openAuth: (mode: AuthMode) => void;
  refreshOffers: () => Promise<void>;
};

export function useCart({ openAuth, refreshOffers }: Params) {
  const [selectedOffer, setSelectedOffer] = useState<FoodOffer | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  function openOffer(offer: FoodOffer) {
    setSelectedOffer(offer);
    setSelectedQuantity(1);
    setOrderError("");
  }

  function addToCart(offerOverride?: FoodOffer) {
    const offerToAdd = offerOverride || selectedOffer;
    if (!offerToAdd) return;

    const existingMerchantId = cart[0]?.offer.merchant_id;
    if (
      existingMerchantId !== undefined &&
      existingMerchantId !== offerToAdd.merchant_id
    ) {
      setOrderError("در هر سفارش فقط می‌توانی از یک فروشنده خرید کنی.");
      return;
    }

    const quantity = Math.min(
      selectedQuantity,
      offerToAdd.available_quantity,
    );

    setCart((current) => {
      const existing = current.find((item) => item.offer.id === offerToAdd.id);

      if (existing) {
        return current.map((item) =>
          item.offer.id === offerToAdd.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + quantity,
                  offerToAdd.available_quantity,
                ),
              }
            : item,
        );
      }

      return [...current, { offer: offerToAdd, quantity }];
    });

    setSelectedOffer(null);
    setCartOpen(true);
  }

  function updateCartQuantity(offerId: number, quantity: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.offer.id === offerId
            ? {
                ...item,
                quantity: Math.max(
                  0,
                  Math.min(quantity, item.offer.available_quantity),
                ),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function submitOrder() {
    const token = getToken();

    if (!token || cart.length === 0) {
      openAuth("login");
      return;
    }

    setOrderLoading(true);
    setOrderError("");
    setOrderMessage("");

    try {
      const order = await createOrder(
        token,
        cart.map((item) => ({
          food_offer_id: item.offer.id,
          quantity: item.quantity,
        })),
      );
      const payment = await createPayment(token, order.id);

      setCart([]);
      setCartOpen(false);
      await refreshOffers();

      if (payment.payment.provider === "zarinpal") {
        window.location.assign(payment.checkout_url);
        return;
      }

      setOrderMessage(
        `سفارش #${order.id} ثبت شد. درگاه آزمایشی فعال است؛ پرداخت واقعی هنوز انجام نشده است.`,
      );
    } catch (err) {
      setOrderError(
        err instanceof ApiError ? err.message : "ثبت سفارش انجام نشد.",
      );
    } finally {
      setOrderLoading(false);
    }
  }

  return {
    selectedOffer,
    selectedQuantity,
    cart,
    cartOpen,
    orderLoading,
    orderMessage,
    orderError,
    setSelectedOffer,
    setSelectedQuantity,
    setCartOpen,
    setOrderMessage,
    setOrderError,
    openOffer,
    addToCart,
    updateCartQuantity,
    submitOrder,
  };
}
