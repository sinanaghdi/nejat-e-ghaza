import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Order, User } from "../lib/api";
import { cancelOrder, createPayment, getOrder } from "../lib/api";
import { getToken } from "../lib/auth";
import { formatOrderDate, formatToman } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";

const statusLabels: Record<Order["status"], string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت شده",
  READY_FOR_PICKUP: "آماده دریافت",
  COMPLETED: "تکمیل شده",
  CANCELLED: "لغو شده",
  EXPIRED: "منقضی شده",
};

type Props = {
  orderId: number;
  user: User | null;
  cartCount: number;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function OrderDetailPage({
  orderId,
  user,
  cartCount,
  onCart,
  onOrders,
  onMerchant,
  onLogin,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getOrder(getToken(), orderId)
      .then((value) => {
        if (active) setOrder(value);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "سفارش پیدا نشد.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  async function handleRetryPayment() {
    if (!order || order.status !== "PENDING") return;

    setPaymentLoading(true);
    setPaymentMessage("");
    setCancelError("");
    try {
      const payment = await createPayment(getToken(), order.id);
      if (payment.payment.provider === "zarinpal") {
        window.location.assign(payment.checkout_url);
        return;
      }
      setOrder((current) => current ? { ...current, status: "PAID" } : current);
      setPaymentMessage("پرداخت دمو با موفقیت ثبت شد. سفارش آماده پردازش فروشنده است.");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "شروع پرداخت انجام نشد.");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleCancelOrder() {
    if (!order || order.status !== "PENDING") return;
    if (!window.confirm("سفارش در حال انتظار پرداخت لغو شود؟")) return;

    setCancelLoading(true);
    setCancelError("");
    try {
      const updated = await cancelOrder(getToken(), order.id);
      setOrder(updated);
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "لغو سفارش انجام نشد.");
    } finally {
      setCancelLoading(false);
    }
  }

  return (
    <main className="app">
      <Header
        user={user}
        cartCount={cartCount}
        onCart={onCart}
        onOrders={onOrders}
        onMerchant={onMerchant}
        onLogin={onLogin}
        onLogout={onLogout}
      />
      <section className="page-shell">
        <button className="back-button" type="button" onClick={() => navigate(-1)}>→ بازگشت به سفارش‌ها</button>

        {!user && !loading && (
          <section className="state-card">
            <div className="state-icon">🔐</div>
            <h3>ابتدا وارد حساب شو</h3>
            <p>برای مشاهده جزئیات سفارش باید وارد حساب کاربری باشی.</p>
            <button className="primary-button" type="button" onClick={onLogin}>ورود</button>
          </section>
        )}

        {loading && <div className="state-card"><div className="spinner" />در حال دریافت سفارش...</div>}

        {!loading && error && (
          <div className="state-card error-state">
            <div className="state-icon">!</div>
            <h3>سفارش پیدا نشد</h3>
            <p>{error}</p>
            <Link className="secondary-button compact" to="/orders">بازگشت به سفارش‌ها</Link>
          </div>
        )}

        {!loading && !error && order && (
          <section className="order-detail-card">
            <header className="page-header">
              <p className="eyebrow">جزئیات سفارش</p>
              <h1>سفارش #{order.id}</h1>
              <span className={`profile-role status-${order.status.toLowerCase()}`}>
                {statusLabels[order.status]}
              </span>
            </header>

            <div className="pickup-code large-pickup-code">
              <span>کد دریافت</span>
              <strong>{order.pickup_code}</strong>
            </div>

            <div className="order-detail-items">
              {order.items.map((item) => (
                <div className="order-item-row" key={item.id}>
                  <span>غذا #{item.food_offer_id} × {item.quantity}</span>
                  <strong>{formatToman(item.subtotal)}</strong>
                </div>
              ))}
            </div>

            <div className="order-total">
              <span>مبلغ کل</span>
              <strong>{formatToman(order.total_amount)}</strong>
            </div>

            {cancelError && <p className="form-message error-message">{cancelError}</p>}
            {paymentMessage && <p className="form-message success-message">{paymentMessage}</p>}
            {order.status === "PENDING" && (
              <div className="order-action-stack">
                <button
                  className="primary-button"
                  type="button"
                  disabled={paymentLoading}
                  onClick={() => void handleRetryPayment()}
                >
                  {paymentLoading ? "در حال آماده‌سازی پرداخت..." : "ادامه پرداخت"}
                </button>
                <button
                  className="secondary-button danger-action"
                  type="button"
                  disabled={cancelLoading || paymentLoading}
                  onClick={() => void handleCancelOrder()}
                >
                  {cancelLoading ? "در حال لغو..." : "لغو سفارش"}
                </button>
              </div>
            )}

            <time className="order-date" dateTime={order.created_at}>
              ثبت شده در {formatOrderDate(order.created_at)}
            </time>
          </section>
        )}
      </section>
      <MobileBottomNav
        cartCount={cartCount}
        userRole={user?.role || null}
        onCart={onCart}
      />
    </main>
  );
}
