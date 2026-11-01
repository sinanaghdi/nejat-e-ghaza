import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Order, User } from "../lib/api";
import { cancelOrder, createPayment, getOrder } from "../lib/api";
import { getToken } from "../lib/auth";
import { formatOrderDate, formatToman } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { UiIcon } from "../components/UiIcon";

const statusLabels: Record<Order["status"], string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  READY_FOR_PICKUP: "آمادهٔ دریافت",
  COMPLETED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  EXPIRED: "منقضی‌شده",
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
    setError("");
    getOrder(getToken(), orderId)
      .then((value) => { if (active) setOrder(value); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "سفارش پیدا نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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
      setPaymentMessage("درخواست پرداخت آزمایشی ساخته شد، اما پرداخت نهایی از این مسیر تأیید نمی‌شود. وضعیت سفارش تا دریافت تأیید معتبر در حالت انتظار می‌ماند.");
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "شروع پرداخت انجام نشد.");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleCancelOrder() {
    if (!order || order.status !== "PENDING") return;
    if (!window.confirm("سفارش در انتظار پرداخت لغو شود؟")) return;
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
    <main className="stitch-app">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />
      <section className="stitch-content stitch-account-page">
        <div className="stitch-breadcrumb"><Link to="/orders">سفارش‌های من</Link><span>←</span><strong>سفارش #{orderId}</strong></div>

        {!user && !loading && (
          <section className="stitch-empty-card"><UiIcon name="user" size={30} /><h2>ابتدا وارد حساب شو</h2><p>برای دیدن جزئیات و کد دریافت باید وارد حساب سفارش‌دهنده شوی.</p><button className="stitch-button stitch-button-primary" onClick={onLogin}>ورود</button></section>
        )}
        {loading && <section className="stitch-state-card" role="status">در حال دریافت جزئیات سفارش...</section>}
        {!loading && error && <section className="stitch-state-card stitch-error-card" role="alert"><h2>جزئیات سفارش دریافت نشد</h2><p>{error}</p><Link className="stitch-button stitch-button-outline" to="/orders">بازگشت به سفارش‌ها</Link></section>}

        {!loading && !error && order && (
          <section style={{ maxWidth: 740, marginInline: "auto" }}>
            <header className="stitch-account-hero">
              <p className="stitch-kicker">رسید سفارش</p>
              <h1>سفارش #{order.id}</h1>
              <p>وضعیت: {statusLabels[order.status]}</p>
            </header>

            {order.status !== "CANCELLED" && order.status !== "EXPIRED" && (
              <section className="stitch-pickup-ticket" style={{ marginTop: 15, padding: 25 }}>
                <span className="stitch-kicker">کد دریافت اختصاصی</span>
                <strong style={{ fontSize: "2rem" }}>{order.pickup_code}</strong>
                <p className="stitch-copy-hint">این کد را هنگام مراجعه به فروشگاه به فروشنده اعلام کن. کد را پیش از حضور در فروشگاه در اختیار دیگران قرار نده.</p>
                <p className="stitch-copy-hint">QR خودکار در نسخهٔ فعلی فعال نیست؛ فروشنده کد را دستی بررسی می‌کند.</p>
                <button type="button" className="stitch-button stitch-button-secondary" onClick={() => {
                  void navigator.clipboard?.writeText(order.pickup_code).catch(() => undefined);
                }}>کپی کد دریافت</button>
              </section>
            )}

            <section className="stitch-checkout-panel" style={{ marginTop: 15 }}>
              <h2>اقلام سفارش</h2>
              {order.items.map((item) => (
                <div className="stitch-checkout-item" key={item.id}>
                  <span><strong>بستهٔ #{item.food_offer_id}</strong><small>تعداد: {item.quantity.toLocaleString("fa-IR")}</small></span>
                  <strong>{formatToman(item.subtotal)}</strong>
                </div>
              ))}
              <div className="stitch-checkout-total stitch-checkout-grand"><span>مبلغ کل</span><strong>{formatToman(order.total_amount)}</strong></div>
              {cancelError && <p className="form-message error-message" role="alert">{cancelError}</p>}
              {paymentMessage && <p className="form-message success-message" role="status">{paymentMessage}</p>}
              {order.status === "PENDING" && (
                <div className="stitch-order-actions" style={{ marginTop: 16 }}>
                  <button className="stitch-button stitch-button-primary" type="button" disabled={paymentLoading} onClick={() => void handleRetryPayment()}>{paymentLoading ? "در حال آماده‌سازی..." : "ادامهٔ پرداخت"}</button>
                  <button className="stitch-button stitch-button-outline" type="button" disabled={cancelLoading || paymentLoading} onClick={() => void handleCancelOrder()}>{cancelLoading ? "در حال لغو..." : "لغو سفارش"}</button>
                </div>
              )}
              <p className="stitch-legal-hint">ثبت این رسید به معنی تکمیل تحویل نیست؛ وضعیت نهایی با تأیید سرور به‌روزرسانی می‌شود.</p>
            </section>
            <Link to="/orders" className="stitch-text-link" style={{ marginTop: 18 }}>بازگشت به همهٔ سفارش‌ها ←</Link>
          </section>
        )}
      </section>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role ?? null} onCart={onCart} />
    </main>
  );
}
