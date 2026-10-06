import { useEffect, useState } from "react";
import { ApiError, getOrders, type Order } from "../lib/api";
import { getToken } from "../lib/auth";
import type { AuthMode } from "./useAuth";

type Params = {
  isOrdersPage: boolean;
  openAuth: (mode: AuthMode) => void;
};

export function useOrders({ isOrdersPage, openAuth }: Params) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  async function loadOrders() {
    const token = getToken();
    if (!token) {
      openAuth("login");
      return;
    }

    setOrdersLoading(true);
    setOrdersError("");

    try {
      setOrders(await getOrders(token));
    } catch (err) {
      setOrdersError(
        err instanceof ApiError
          ? err.message
          : "دریافت سفارش‌ها انجام نشد.",
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    if (isOrdersPage && getToken()) {
      void loadOrders();
    }
  }, [isOrdersPage]);

  async function openOrders() {
    const token = getToken();
    if (!token) {
      openAuth("login");
      return;
    }

    setOrdersOpen(true);
    await loadOrders();
  }

  function clearOrders() {
    setOrders([]);
    setOrdersOpen(false);
  }

  return {
    orders,
    ordersOpen,
    ordersLoading,
    ordersError,
    setOrdersOpen,
    clearOrders,
    loadOrders,
    openOrders,
  };
}
