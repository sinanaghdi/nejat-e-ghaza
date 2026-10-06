import { Link } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { formatToman } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";

type CartItem = { offer: FoodOffer; quantity: number };

type Props = {
  user: User | null;
  cartCount: number;
  cart: CartItem[];
  onUpdateQuantity: (offerId: number, quantity: number) => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function CartPage({
  user,
  cartCount,
  cart,
  onUpdateQuantity,
  onOrders,
  onMerchant,
  onLogin,
  onLogout,
}: Props) {
  const total = cart.reduce((sum, item) => sum + item.offer.sale_price * item.quantity, 0);

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
          <p className="eyebrow">سفارش شما</p>
          <h1>سبد خرید</h1>
          <p>{cart.length ? "قبل از پرداخت، اقلام و تعداد را بررسی کن." : "هنوز چیزی برای خرید انتخاب نکرده‌ای."}</p>
        </header>

        {cart.length === 0 ? (
          <section className="state-card">
            <div className="state-icon">🛒</div>
            <h3>سبد خرید خالی است</h3>
            <p>از بین پیشنهادهای امروز یک غذا انتخاب کن.</p>
            <Link className="primary-button" to="/offers">دیدن پیشنهادها</Link>
          </section>
        ) : (
          <section className="checkout-layout">
            <div className="cart-page-items">
              {cart.map((item) => (
                <article className="cart-item cart-page-item" key={item.offer.id}>
                  <div className="cart-item-image">
                    {item.offer.image_url ? <img src={item.offer.image_url} alt="" /> : "🍱"}
                  </div>
                  <div className="cart-item-info">
                    <span className="merchant">{item.offer.merchant.business_name}</span>
                    <strong>{item.offer.title}</strong>
                    <span>{formatToman(item.offer.sale_price)}</span>
                    <div className="mini-quantity">
                      <button type="button" onClick={() => onUpdateQuantity(item.offer.id, item.quantity - 1)} aria-label="کاهش تعداد">−</button>
                      <b>{item.quantity}</b>
                      <button type="button" onClick={() => onUpdateQuantity(item.offer.id, item.quantity + 1)} aria-label="افزایش تعداد">+</button>
                    </div>
                  </div>
                  <strong className="cart-page-subtotal">{formatToman(item.offer.sale_price * item.quantity)}</strong>
                </article>
              ))}
            </div>

            <aside className="checkout-summary">
              <p className="eyebrow">خلاصه</p>
              <h2>جمع سفارش</h2>
              <div className="cart-summary"><span>مبلغ کل</span><strong>{formatToman(total)}</strong></div>
              <Link className="primary-button full-button" to="/checkout">ادامه و پرداخت</Link>
              <Link className="secondary-button full-button" to="/offers">افزودن پیشنهاد دیگر</Link>
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
