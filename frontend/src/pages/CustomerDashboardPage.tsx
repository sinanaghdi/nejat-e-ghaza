import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Order, User } from "../lib/api";
import { getOrders } from "../lib/api";
import { getToken } from "../lib/auth";
import { formatOrderDate, formatToman } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { UiIcon } from "../components/UiIcon";

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
  const [error, setError] = useState("");

  useEffect(() => {
    if (!props.user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getOrders(getToken())
      .then((items) => { if (active) setOrders(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "دریافت فعالیت حساب ممکن نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [props.user?.id]);

  if (!props.user) {
    return (
      <main className="stitch-app">
        <Header user={null} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
        <section className="stitch-content stitch-account-page"><section className="stitch-empty-card"><UiIcon name="user" size={32} /><h2>برای دیدن حساب وارد شو</h2><p>پس از ورود، سفارش‌ها و فعالیت‌های ثبت‌شدهٔ تو نمایش داده می‌شوند.</p><button className="stitch-button stitch-button-primary" onClick={props.onLogin}>ورود به سهمینو</button></section></section>
      </main>
    );
  }

  const completed = orders.filter((order) => order.status === "COMPLETED");
  const chargedOrders = orders.filter((order) => ["PAID", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status));
  const totalPaid = chargedOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const countReceived = completed.reduce((sum, order) => sum + order.items.reduce((n, item) => n + item.quantity, 0), 0);

  return (
    <main className="stitch-app">
      <Header user={props.user} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
      <section className="stitch-content stitch-account-page">
        <div className="stitch-account-hero">
          <p className="stitch-kicker">خوش آمدی به همراهان سهمینو</p>
          <h1>سلام {props.user.name}</h1>
          <p>خریدها، سفارش‌ها و کدهای دریافت خودت را از اینجا پیگیری کن.</p>
        </div>

        {loading ? <section className="stitch-state-card" style={{ marginTop: 15 }}>در حال دریافت خلاصه حساب...</section> : error ? (
          <section className="stitch-state-card stitch-error-card" style={{ marginTop: 15 }} role="alert"><h3>خلاصه حساب دریافت نشد</h3><p>{error}</p><button className="stitch-button stitch-button-secondary" onClick={() => window.location.reload()}>تلاش دوباره</button></section>
        ) : (
          <>
            <div className="stitch-account-stats">
              <div><strong>{orders.length.toLocaleString("fa-IR")}</strong><small>کل سفارش‌ها</small></div>
              <div><strong>{completed.length.toLocaleString("fa-IR")}</strong><small>تحویل‌شده</small></div>
              <div><strong>{formatToman(totalPaid)}</strong><small>مبلغ سفارش‌های پرداخت‌شده</small></div>
            </div>
            <div className="stitch-account-links">
              <Link to="/offers"><strong>کشف بسته‌های امروز</strong><small>پیشنهادهای فعال نزدیک تو</small></Link>
              <Link to="/orders"><strong>سفارش‌های من</strong><small>وضعیت و کد دریافت</small></Link>
              <Link to="/club"><strong>باشگاه همراهان سبز</strong><small>{countReceived.toLocaleString("fa-IR")} بسته تحویل‌شده ثبت شده</small></Link>
            </div>

            <section className="stitch-section-block">
              <div className="stitch-section-heading"><div><p className="stitch-kicker">فعالیت حساب</p><h2>آخرین سفارش‌ها</h2></div><Link to="/orders" className="stitch-text-link">همه سفارش‌ها ←</Link></div>
              {orders.length === 0 ? (
                <div className="stitch-empty-card"><h3>هنوز سفارشی ثبت نشده</h3><p>اولین بستهٔ خودت را از بازار محلی سهمینو انتخاب کن.</p><Link className="stitch-button stitch-button-primary" to="/offers">رفتن به بازار</Link></div>
              ) : (
                <div className="stitch-activity-list">
                  {orders.slice(0, 4).map((order) => (
                    <Link className="stitch-activity-row" to={`/orders/${order.id}`} key={order.id}>
                      <span className="stitch-activity-check">{order.status === "COMPLETED" ? "✓" : "•"}</span>
                      <span><strong>سفارش #{order.id}</strong><small>{formatOrderDate(order.created_at)} · {order.items.reduce((n, item) => n + item.quantity, 0).toLocaleString("fa-IR")} بسته</small></span>
                      <b>{formatToman(order.total_amount)}</b>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
      <MobileBottomNav cartCount={props.cartCount} userRole={props.user.role} onCart={props.onCart} />
    </main>
  );
}
