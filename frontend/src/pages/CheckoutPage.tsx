import { Link } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { formatPickupTime, formatToman } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { UiIcon } from "../components/UiIcon";

type CartItem = { offer: FoodOffer; quantity: number };

type Props = {
  user: User | null;
  cartCount: number;
  cart: CartItem[];
  loading: boolean;
  error: string;
  message: string;
  onSubmit: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function CheckoutPage({
  user, cartCount, cart, loading, error, message, onSubmit,
  onOrders, onMerchant, onLogin, onLogout,
}: Props) {
  const total = cart.reduce((sum, item) => sum + item.offer.sale_price * item.quantity, 0);
  const merchant = cart[0]?.offer.merchant;

  return (
    <main className="stitch-app">
      <Header user={user} cartCount={cartCount} onCart={() => {}} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />
      <section className="stitch-content stitch-checkout-page">
        <div className="stitch-breadcrumb"><Link to="/">سهمینو</Link><span>←</span><Link to="/cart">سبد خرید</Link><span>←</span><strong>تأیید و پرداخت</strong></div>
        <header className="stitch-section-heading" style={{ marginTop: 18 }}>
          <div><p className="stitch-kicker">تقریباً آماده‌ای</p><h1 style={{ margin: 0, color: "var(--stitch-pine)", fontSize: "1.8rem" }}>تأیید سفارش</h1><p>جزئیات بسته‌ها، فروشگاه و زمان دریافت را قبل از پرداخت بررسی کن.</p></div>
        </header>

        <div className="stitch-stepper" aria-label="مراحل سفارش">
          <div className="stitch-step is-done"><span>✓</span><b>سبد خرید</b></div>
          <div className="stitch-step is-current"><span>۲</span><b>تأیید سفارش</b></div>
          <div className="stitch-step"><span>۳</span><b>پرداخت</b></div>
        </div>

        {!cart.length ? (
          <section className="stitch-empty-card">
            <span className="stitch-state-illustration">🛍️</span>
            <h2>سبد خرید خالی است</h2>
            <p>برای ادامه، ابتدا یک بسته از پیشنهادهای موجود انتخاب کن.</p>
            <Link className="stitch-button stitch-button-primary" to="/offers">دیدن بسته‌ها</Link>
          </section>
        ) : (
          <div className="stitch-checkout-layout">
            <div style={{ display: "grid", gap: 14 }}>
              <section className="stitch-checkout-panel">
                <h2>فروشگاه و محل دریافت</h2>
                <div className="stitch-pickup-option">
                  <UiIcon name="store" size={23} />
                  <div><strong>{merchant?.business_name}</strong><p>{merchant?.city} · {merchant?.address}</p><p>تحویل حضوری از فروشنده؛ زمان هر بسته در فهرست زیر درج شده است.</p></div>
                </div>
                <div className="stitch-divider" />
                <div className="stitch-pickup-option">
                  <UiIcon name="clock" size={23} />
                  <div><strong>بازه‌های دریافت هر بسته</strong><p>زمان شروع و پایان دقیق هر پیشنهاد در فهرست بسته‌ها نمایش داده شده است؛ برای هر بسته همان بازه را رعایت کن.</p></div>
                </div>
              </section>

              <section className="stitch-checkout-panel">
                <h2>خلاصهٔ بسته‌ها</h2>
                {cart.map((item) => (
                  <article className="stitch-checkout-item" key={item.offer.id}>
                    <span><strong>{item.offer.title}</strong><small>{item.quantity.toLocaleString("fa-IR")} بسته · دریافت {formatPickupTime(item.offer.pickup_start)} تا {formatPickupTime(item.offer.pickup_end)}</small></span>
                    <strong>{formatToman(item.offer.sale_price * item.quantity)}</strong>
                  </article>
                ))}
              </section>

              <section className="stitch-checkout-panel">
                <h2>روش پرداخت</h2>
                <div className="stitch-payment-option">
                  <UiIcon name="wallet" size={22} />
                  <div><strong>درگاه پرداخت فعال سامانه</strong><p>روش پرداخت بر اساس تنظیمات درگاه در سرور انتخاب می‌شود. گزینهٔ کیف پول، کد تخفیف و پرداخت نقدی در محل در این نسخه به API متصل نیستند.</p></div>
                </div>
              </section>

              <section className="stitch-note-card">
                <span className="stitch-note-icon">ⓘ</span>
                <div><strong>پیش از ثبت سفارش</strong><p>همهٔ بسته‌های یک سفارش باید متعلق به یک فروشنده باشند. سفارش نهایی و موجودی از سمت سرور بررسی می‌شوند؛ این صفحه صرفاً پیش‌نمایش سبد است.</p></div>
              </section>
            </div>

            <aside className="stitch-checkout-summary">
              <p className="stitch-kicker">خلاصهٔ پرداخت</p>
              <h2>مبلغ سفارش</h2>
              <div className="stitch-checkout-total"><span>تعداد بسته‌ها</span><strong>{cart.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("fa-IR")}</strong></div>
              <div className="stitch-checkout-total"><span>مجموع اقلام</span><strong>{formatToman(total)}</strong></div>
              <div className="stitch-checkout-total"><span>هزینهٔ ارسال</span><strong>تحویل حضوری</strong></div>
              <div className="stitch-checkout-total stitch-checkout-grand"><span>مبلغ نهایی</span><strong>{formatToman(total)}</strong></div>
              {error && <p className="form-message error-message" role="alert">{error}</p>}
              {message && <p className="form-message success-message" role="status">{message}</p>}
              <button className="stitch-button stitch-button-primary" type="button" style={{ width: "100%" }} onClick={user ? onSubmit : onLogin} disabled={loading}>
                {loading ? "در حال ثبت سفارش..." : user ? "ثبت سفارش و ادامه به درگاه" : "ورود و ادامه"}
                <UiIcon name="arrow-left" size={17} />
              </button>
              <Link className="stitch-button stitch-button-outline" style={{ width: "100%", marginTop: 9 }} to="/cart">بازگشت به سبد خرید</Link>
              <p className="stitch-legal-hint">با ثبت سفارش، شرایط استفاده و قواعد ایمنی و بازپرداخت سهمینو را می‌پذیری. لغو و وضعیت پرداخت مطابق وضعیت ثبت‌شده در سرور انجام می‌شود.</p>
            </aside>
          </div>
        )}
      </section>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role ?? null} onCart={() => {}} />
    </main>
  );
}
