import type { Order } from "../lib/api";
import { formatToman } from "../lib/formatters";
import { StatusBadge } from "../components/StatusBadge";

type Props = { orders: Order[]; loading: boolean; error: string; onRetry: () => void; };

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function OrdersPage({ orders, loading, error, onRetry }: Props) {
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">حساب کاربری</p>
        <h1>سفارش‌های من</h1>
        <p>سفارش‌ها، وضعیت و کد دریافت غذاهایت را اینجا دنبال کن.</p>
      </header>
      {loading && <div className="state-card"><div className="spinner" />در حال دریافت سفارش‌ها...</div>}
      {!loading && error && <div className="state-card error-state"><div className="state-icon">!</div><h3>دریافت سفارش‌ها ناموفق بود</h3><p>{error}</p><button className="secondary-button compact" type="button" onClick={onRetry}>تلاش دوباره</button></div>}
      {!loading && !error && orders.length === 0 && <div className="state-card"><div className="state-icon">📦</div><h3>هنوز سفارشی نداری</h3><p>از بین پیشنهادهای موجود، اولین غذایت را نجات بده.</p></div>}
      {!loading && !error && orders.length > 0 && (
        <div className="page-orders-list">
          {orders.map(order => (
            <article className="order-card" key={order.id}>
              <div className="order-card-top"><div><span className="order-label">سفارش</span><strong>#{order.id}</strong></div><StatusBadge status={order.status}/></div>
              <div className="order-items">{order.items.map(item => <div className="order-item-row" key={item.id}><span>غذا #{item.food_offer_id} × {item.quantity}</span><strong>{formatToman(item.subtotal)}</strong></div>)}</div>
              <div className="order-total"><span>مبلغ کل</span><strong>{formatToman(order.total_amount)}</strong></div>
              <div className="pickup-code"><span>کد دریافت</span><strong>{order.pickup_code}</strong></div>
              <time className="order-date" dateTime={order.created_at}>ثبت شده در {formatOrderDate(order.created_at)}</time>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}