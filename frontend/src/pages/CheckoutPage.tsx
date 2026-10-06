import { Link } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { formatPickupTime, formatToman } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";

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
  user,
  cartCount,
  cart,
  loading,
  error,
  message,
  onSubmit,
  onOrders,
  onMerchant,
  onLogin,
  onLogout,
}: Props) {
  const total = cart.reduce((sum, item) => sum + item.offer.sale_price * item.quantity, 0);
  const merchant = cart[0]?.offer.merchant;

  return (
    <main className="app">
      <Header
        user={user}
        cartCount={cartCount}
        onCart={() => undefined}
        onOrders={onOrders}
        onMerchant={onMerchant}
        onLogin={onLogin}
        onLogout={onLogout}
      />
      <section className="page-shell">
        <header className="page-header">
          <p className="eyebrow">مرحله آخر</p>
          <h1>تأیید و پرداخت</h1>
          <p>جزئیات سفارش را بررسی کن و سپس وارد فرآیند پرداخت شو.</p>
        </header>

        {!cart.length ? (
          <section className="state-card">
            <div className="state-icon">🛒</div>
            <h3>سبد خرید خالی است</h3>
            <Link className="primary-button" to="/offers">بازگشت به پیشنهادها</Link>
          </section>
        ) : (
          <section className="checkout-layout">
            <div className="checkout-review">
              <div className="profile-card">
                <div className="profile-avatar" aria-hidden="true">🏪</div>
                <div className="profile-main">
                  <span className="eyebrow">فروشگاه</span>
                  <h2>{merchant?.business_name}</h2>
                  <p>{merchant?.city} · {merchant?.address}</p>
                </div>
              </div>

              {cart.map((item) => (
                <article className="order-item-row checkout-item" key={item.offer.id}>
                  <div>
                    <strong>{item.offer.title}</strong>
                    <span>{item.quantity} عدد · دریافت تا {formatPickupTime(item.offer.pickup_end)}</span>
                  </div>
                  <strong>{formatToman(item.offer.sale_price * item.quantity)}</strong>
                </article>
              ))}
            </div>

            <aside className="checkout-summary">
              <p className="eyebrow">مبلغ نهایی</p>
              <h2>{formatToman(total)}</h2>
              <p className="checkout-note">مبلغ از سفارش ثبت‌شده در سرور محاسبه می‌شود.</p>
              {error && <p className="form-message error-message">{error}</p>}
              {message && <p className="form-message success-message">{message}</p>}
              <button className="primary-button full-button" type="button" onClick={onSubmit} disabled={loading}>
                {loading ? "در حال ثبت و انتقال..." : user ? "ثبت سفارش و پرداخت" : "ورود و ادامه"}
              </button>
              <Link className="secondary-button full-button" to="/cart">بازگشت به سبد</Link>
            </aside>
          </section>
        )}
      </section>
      <MobileBottomNav
        cartCount={cartCount}
        userRole={user?.role || null}
        onCart={() => undefined}
      />
    </main>
  );
}
