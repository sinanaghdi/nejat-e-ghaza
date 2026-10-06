import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Order, User } from "../lib/api";
import { getOrders } from "../lib/api";
import { getToken } from "../lib/auth";
import { formatOrderDate, formatToman } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";

type Props = {
  user: User | null;
  cartCount: number;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function CustomerDashboardPage(props: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!props.user) {
      setLoading(false);
      return;
    }
    getOrders(getToken()).then(setOrders).finally(() => setLoading(false));
  }, [props.user]);

  if (!props.user) {
    return (
      <>
        <Header user={null} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
        <main className="page-shell"><div className="state-card"><div className="state-icon">🔐</div><h3>ابتدا وارد حساب شو</h3><p>برای مشاهده داشبورد شخصی وارد حساب کاربری شوید.</p><button className="primary-button" onClick={props.onLogin}>ورود</button></div></main>
      </>
    );
  }

  const paidOrders = orders.filter((order) => order.status === "PAID" || order.status === "READY_FOR_PICKUP" || order.status === "COMPLETED");
  const totalSpent = paidOrders.reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <main className="app">
      <Header user={props.user} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
      <section className="page-shell dashboard-page">
        <header className="page-header">
          <p className="eyebrow">حساب من</p>
          <h1>سلام {props.user.name}</h1>
          <p>از اینجا خریدها، سفارش‌ها و فعالیت‌های حسابت را مدیریت کن.</p>
        </header>

        <section className="customer-stat-grid">
          <div><strong>{orders.length}</strong><span>سفارش</span></div>
          <div><strong>{paidOrders.length}</strong><span>خرید تکمیل‌شده</span></div>
          <div><strong>{formatToman(totalSpent)}</strong><span>مجموع پرداخت‌ها</span></div>
        </section>

        <section className="dashboard-quick-links">
          <Link to="/offers"><strong>🍱 پیدا کردن غذای جدید</strong><span>پیشنهادهای فعال امروز</span></Link>
          <Link to="/orders"><strong>📦 سفارش‌های من</strong><span>مشاهده وضعیت و کد دریافت</span></Link>
          <Link to="/profile"><strong>👤 پروفایل</strong><span>اطلاعات حساب کاربری</span></Link>
        </section>

        <section className="dashboard-recent">
          <div className="section-heading">
            <div><p className="eyebrow">Recent</p><h2>آخرین سفارش‌ها</h2></div>
            <Link className="secondary-button compact" to="/orders">همه سفارش‌ها</Link>
          </div>

          {loading && <div className="state-card"><div className="spinner" />در حال دریافت...</div>}
          {!loading && orders.length === 0 && <div className="state-card"><div className="state-icon">📦</div><h3>هنوز سفارشی نداری</h3><p>از بازار نجات غذا اولین خریدت را انجام بده.</p></div>}
          {!loading && orders.length > 0 && (
            <div className="dashboard-order-list">
              {orders.slice(0, 3).map((order) => (
                <Link className="dashboard-order-row" to={`/orders/${order.id}`} key={order.id}>
                  <div><strong>سفارش #{order.id}</strong><span>{formatOrderDate(order.created_at)}</span></div>
                  <div><strong>{formatToman(order.total_amount)}</strong><span>{order.status === "PAID" ? "پرداخت شده" : order.status}</span></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
      <MobileBottomNav cartCount={props.cartCount} userRole={props.user.role} onCart={props.onCart} />
    </main>
  );
}
