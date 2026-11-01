import { Link } from "react-router-dom";
import type { Order } from "../lib/api";
import { formatToman, formatOrderDate } from "../lib/formatters";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { UiIcon } from "../components/UiIcon";

type Props = {
  orders: Order[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  userRole?: string | null;
  cartCount?: number;
  onCart?: () => void;
};

const statuses: Record<Order["status"], string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  READY_FOR_PICKUP: "آمادهٔ دریافت",
  COMPLETED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  EXPIRED: "منقضی‌شده",
};

export function OrdersPage({ orders, loading, error, onRetry, userRole = "CUSTOMER", cartCount = 0, onCart = () => {} }: Props) {
  const awaitingPickup = orders.filter((order) => order.status === "READY_FOR_PICKUP").length;
  const completed = orders.filter((order) => order.status === "COMPLETED").length;

  return (
    <main className="stitch-app">
      <section className="stitch-content stitch-account-page">
        <div className="stitch-account-hero">
          <p className="stitch-kicker">حساب من · سابقهٔ خرید</p>
          <h1>سفارش‌های تو</h1>
          <p>وضعیت سفارش‌ها و کد دریافت اختصاصی هر سفارش را اینجا پیگیری کن.</p>
        </div>

        {!loading && !error && (
          <div className="stitch-account-stats">
            <div><strong>{orders.length.toLocaleString("fa-IR")}</strong><small>کل سفارش‌ها</small></div>
            <div><strong>{awaitingPickup.toLocaleString("fa-IR")}</strong><small>آمادهٔ دریافت</small></div>
            <div><strong>{completed.toLocaleString("fa-IR")}</strong><small>تحویل‌شده</small></div>
          </div>
        )}

        {loading && <section className="stitch-state-card" role="status">در حال دریافت سفارش‌ها...</section>}
        {!loading && error && <section className="stitch-state-card stitch-error-card" role="alert"><h3>دریافت سفارش‌ها انجام نشد</h3><p>{error}</p><button type="button" className="stitch-button stitch-button-secondary" onClick={onRetry}>تلاش دوباره</button></section>}
        {!loading && !error && orders.length === 0 && (
          <section className="stitch-empty-card"><span className="stitch-state-illustration">📦</span><h2>هنوز سفارشی نداری</h2><p>از بسته‌های موجود در بازار سهمینو، اولین انتخابت را انجام بده.</p><Link className="stitch-button stitch-button-primary" to="/offers">کشف بسته‌های امروز</Link></section>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="stitch-orders-list">
            {orders.map((order) => (
              <article className="stitch-order-card" key={order.id}>
                <div className="stitch-order-top">
                  <div><strong>سفارش #{order.id}</strong><div className="stitch-order-date">{formatOrderDate(order.created_at)}</div></div>
                  <span className={order.status === "CANCELLED" || order.status === "EXPIRED" ? "stitch-status-pill is-danger" : order.status === "PENDING" ? "stitch-status-pill is-warning" : "stitch-status-pill"}>{statuses[order.status]}</span>
                </div>

                <div className="stitch-order-items">
                  {order.items.map((item) => <div key={item.id}><span>بستهٔ #{item.food_offer_id} × {item.quantity.toLocaleString("fa-IR")}</span><strong>{formatToman(item.subtotal)}</strong></div>)}
                </div>

                <div className="stitch-order-bottom">
                  <span className="stitch-order-date">مبلغ سفارش</span>
                  <strong className="stitch-order-total">{formatToman(order.total_amount)}</strong>
                </div>

                {order.status !== "CANCELLED" && order.status !== "EXPIRED" && (
                  <div className="stitch-pickup-ticket">
                    <small>کد دریافت اختصاصی تو</small>
                    <strong>{order.pickup_code}</strong>
                    <span className="stitch-copy-hint">این کد را هنگام تحویل به فروشنده اعلام کن؛ پیشاپیش در اختیار دیگران قرار نده.</span>
                    <span className="stitch-copy-hint">QR خودکار در نسخهٔ فعلی فعال نیست؛ کد بالا برای تأیید دستی استفاده می‌شود.</span>
                  </div>
                )}

                <div className="stitch-order-actions">
                  <Link to={`/orders/${order.id}`} className="stitch-button stitch-button-outline">جزئیات سفارش <UiIcon name="arrow-left" size={16} /></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <MobileBottomNav cartCount={cartCount} userRole={userRole} onCart={onCart} />
    </main>
  );
}
