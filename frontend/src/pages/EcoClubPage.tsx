import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Order, User } from "../lib/api";
import { getOrders } from "../lib/api";
import { getToken } from "../lib/auth";
import { formatToman } from "../lib/formatters";
import { SahminoMark } from "../components/SahminoMark";
import { MobileBottomNav } from "../components/MobileBottomNav";

type Props = {
  user: User | null;
  cartCount: number;
  onCart: () => void;
  onLogin: () => void;
};

export function EcoClubPage({ user, cartCount, onCart, onLogin }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let active = true;
    getOrders(getToken())
      .then((items) => { if (active) setOrders(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "دریافت گزارش فعالیت ممکن نشد."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.id]);

  const completed = orders.filter((order) => order.status === "COMPLETED");
  const receivedItems = completed.reduce((sum, order) => (
    sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
  ), 0);
  const paid = orders.filter((order) => ["PAID", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status));
  const totalPaid = paid.reduce((sum, order) => sum + order.total_amount, 0);

  return (
    <main className="app stitch-app stitch-eco-page">
      <section className="stitch-content stitch-narrow">
        <header className="stitch-simple-header">
          <Link to="/" className="stitch-brand-lockup"><SahminoMark /><span><strong>سهمینو</strong><small>باشگاه همراهان سبز</small></span></Link>
          <Link to="/profile" className="stitch-icon-link" aria-label="پروفایل">پروفایل</Link>
        </header>

        <section className="stitch-eco-hero">
          <span className="stitch-eco-orbit" aria-hidden="true" />
          <div className="stitch-eco-mark"><SahminoMark /></div>
          <p className="stitch-kicker">همراهی تو ارزشمند است</p>
          <h1>هر سهم کوچک، یک قدم رو به جلو</h1>
          <p>اینجا خلاصه‌ای از سفارش‌های تحویل‌شده و فعالیت ثبت‌شدهٔ تو در سهمینو را می‌بینی.</p>
        </section>

        {!user ? (
          <section className="stitch-empty-card">
            <h2>برای دیدن فعالیتت وارد حساب شو</h2>
            <p>پس از ورود، سفارش‌های ثبت‌شده و تحویل‌شدهٔ خودت نمایش داده می‌شوند.</p>
            <button className="stitch-button stitch-button-primary" type="button" onClick={onLogin}>ورود به سهمینو</button>
          </section>
        ) : loading ? (
          <section className="stitch-empty-card" role="status">در حال دریافت فعالیت‌های حساب...</section>
        ) : error ? (
          <section className="stitch-empty-card stitch-error-card" role="alert">
            <h2>گزارش فعالیت دریافت نشد</h2><p>{error}</p>
            <button className="stitch-button stitch-button-secondary" onClick={() => window.location.reload()}>تلاش دوباره</button>
          </section>
        ) : (
          <>
            <section className="stitch-impact-summary" aria-label="خلاصه فعالیت واقعی حساب">
              <article><span className="stitch-impact-icon">✓</span><strong>{completed.length.toLocaleString("fa-IR")}</strong><small>سفارش تحویل‌شده</small></article>
              <article><span className="stitch-impact-icon">▦</span><strong>{receivedItems.toLocaleString("fa-IR")}</strong><small>تعداد بستهٔ دریافت‌شده</small></article>
              <article><span className="stitch-impact-icon">ت</span><strong>{formatToman(totalPaid)}</strong><small>مبلغ سفارش‌های پرداخت‌شده</small></article>
            </section>

            <section className="stitch-note-card">
              <div className="stitch-note-icon">🌱</div>
              <div>
                <strong>اثر محیط‌زیستی با دادهٔ قابل اتکا</strong>
                <p>در نسخهٔ فعلی، وزن غذای نجات‌یافته، محاسبهٔ کربن و امتیاز وفاداری از API دریافت نمی‌شوند؛ برای همین عدد تخمینی یا سکهٔ ساختگی نمایش داده نمی‌شود.</p>
              </div>
            </section>

            <section className="stitch-section-block">
              <div className="stitch-section-heading"><div><p className="stitch-kicker">تازه‌ترین فعالیت‌ها</p><h2>قدم‌های اخیر تو</h2></div><Link to="/orders">همه سفارش‌ها ←</Link></div>
              {orders.length === 0 ? (
                <div className="stitch-empty-card"><h3>هنوز سفارشی ثبت نشده است</h3><p>اولین بستهٔ محله‌ات را پیدا کن و پس از دریافت، اینجا دوباره سر بزن.</p><Link className="stitch-button stitch-button-primary" to="/offers">دیدن بسته‌ها</Link></div>
              ) : (
                <div className="stitch-activity-list">
                  {orders.slice(0, 5).map((order) => (
                    <Link to={`/orders/${order.id}`} className="stitch-activity-row" key={order.id}>
                      <span className="stitch-activity-check">{order.status === "COMPLETED" ? "✓" : "•"}</span>
                      <span><strong>سفارش #{order.id}</strong><small>{order.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("fa-IR")} بسته · {new Date(order.created_at).toLocaleDateString("fa-IR")}</small></span>
                      <b>{formatToman(order.total_amount)}</b>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role ?? null} onCart={onCart} />
    </main>
  );
}
