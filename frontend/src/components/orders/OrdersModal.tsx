import type { Order } from "../../lib/api";
import { formatToman } from "../../lib/formatters";
import { StatusBadge } from "../StatusBadge";

type Props = {
  open: boolean;
  orders: Order[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
};

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function OrdersModal({ open, orders, loading, error, onClose, onRetry }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="orders-modal" role="dialog" aria-modal="true" aria-labelledby="orders-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="بستن">×</button>
        <div className="orders-header">
          <p className="eyebrow">حساب کاربری</p>
          <h2 id="orders-title">سفارش‌های من</h2>
          <p>سفارش‌ها و کدهای دریافتت را اینجا ببین.</p>
        </div>

        {loading && <div className="orders-loading"><div className="spinner" /> در حال دریافت سفارش‌ها...</div>}

        {!loading && error && (
          <div className="state-card error-state">
            <div className="state-icon">!</div>
            <h3>دریافت سفارش‌ها ناموفق بود</h3>
            <p>{error}</p>
            <button className="secondary-button compact" type="button" onClick={onRetry}>تلاش دوباره</button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="state-card">
            <div className="state-icon">📦</div>
            <h3>هنوز سفارشی نداری</h3>
            <p>یک پیشنهاد انتخاب کن و اولین غذایت را نجات بده.</p>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-top">
                  <div><span className="order-label">سفارش</span><strong>#{order.id}</strong></div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="order-items">
                  {order.items.map((item) => (
                    <div className="order-item-row" key={item.id}>
                      <span>غذا #{item.food_offer_id} × {item.quantity}</span>
                      <strong>{formatToman(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>
                <div className="order-total"><span>مبلغ کل</span><strong>{formatToman(order.total_amount)}</strong></div>
                <div className="pickup-code"><span>کد دریافت</span><strong>{order.pickup_code}</strong></div>
                <time className="order-date" dateTime={order.created_at}>ثبت شده در {formatOrderDate(order.created_at)}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
