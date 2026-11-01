import { Link } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { formatToman, formatPickupTime } from "../lib/formatters";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { SafeImage } from "../components/SafeImage";
import { getStitchFoodImage } from "../lib/stitchAssets";

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

export function CartPage({ user, cartCount, cart, onUpdateQuantity, onOrders, onMerchant, onLogin, onLogout }: Props) {
  const total = cart.reduce((sum, item) => sum + item.offer.sale_price * item.quantity, 0);
  const merchant = cart[0]?.offer.merchant;

  return (
    <main className="stitch-app">
      <Header user={user} cartCount={cartCount} onCart={() => {}} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />
      <section className="stitch-content stitch-checkout-page">
        <div className="stitch-breadcrumb"><Link to="/">سهمینو</Link><span>←</span><strong>سبد خرید</strong></div>
        <header className="stitch-section-heading" style={{ marginTop: 18 }}>
          <div><p className="stitch-kicker">انتخاب‌های تو</p><h1 style={{ margin: 0, color: "var(--stitch-pine)", fontSize: "1.8rem" }}>سبد خرید</h1><p>پیش از ثبت سفارش، تعداد و بازهٔ دریافت را دوباره بررسی کن.</p></div>
        </header>

        {!cart.length ? (
          <section className="stitch-empty-card"><span className="stitch-state-illustration">🛍️</span><h2>سبد خرید هنوز خالی است</h2><p>از میان بسته‌های موجود، یک انتخاب خوب برای خودت پیدا کن.</p><Link className="stitch-button stitch-button-primary" to="/offers">کشف بسته‌ها</Link></section>
        ) : (
          <div className="stitch-checkout-layout">
            <section className="stitch-checkout-panel">
              <div className="stitch-section-heading"><div><p className="stitch-kicker">یک فروشگاه در هر سفارش</p><h2>{merchant?.business_name}</h2><p>{merchant?.city} · {merchant?.address}</p></div></div>
              {cart.map((item) => (
                <article className="stitch-checkout-item" key={item.offer.id}>
                  <SafeImage src={item.offer.image_url || getStitchFoodImage(item.offer.title, item.offer.description || "")} alt="" fallback={<span>🍱</span>} style={{ width: 65, height: 65, borderRadius: 12, objectFit: "cover" }} />
                  <span style={{ flex: 1, minWidth: 0 }}><strong>{item.offer.title}</strong><small>{formatToman(item.offer.sale_price)} · دریافت {formatPickupTime(item.offer.pickup_start)} تا {formatPickupTime(item.offer.pickup_end)}</small>
                    <span className="stitch-merchant-row-actions" style={{ marginTop: 6 }}>
                      <button type="button" aria-label="کاهش تعداد" onClick={() => onUpdateQuantity(item.offer.id, item.quantity - 1)}>−</button>
                      <b style={{ minWidth: 22, textAlign: "center", color: "var(--stitch-pine)" }}>{item.quantity.toLocaleString("fa-IR")}</b>
                      <button type="button" aria-label="افزایش تعداد" disabled={item.quantity >= item.offer.available_quantity} onClick={() => onUpdateQuantity(item.offer.id, item.quantity + 1)}>+</button>
                      <button type="button" className="is-danger" onClick={() => onUpdateQuantity(item.offer.id, 0)}>حذف</button>
                    </span>
                  </span>
                  <strong>{formatToman(item.offer.sale_price * item.quantity)}</strong>
                </article>
              ))}
              <Link to="/offers" className="stitch-text-link" style={{ marginTop: 15 }}>افزودن بستهٔ دیگر از همین فروشگاه ←</Link>
            </section>

            <aside className="stitch-checkout-summary">
              <p className="stitch-kicker">خلاصهٔ سبد</p><h2>مبلغ سفارش</h2>
              <div className="stitch-checkout-total"><span>تعداد بسته</span><strong>{cartCount.toLocaleString("fa-IR")}</strong></div>
              <div className="stitch-checkout-total"><span>مبلغ اقلام</span><strong>{formatToman(total)}</strong></div>
              <div className="stitch-checkout-total"><span>دریافت</span><strong>حضوری</strong></div>
              <div className="stitch-checkout-total stitch-checkout-grand"><span>جمع کل</span><strong>{formatToman(total)}</strong></div>
              <Link className="stitch-button stitch-button-primary" style={{ width: "100%" }} to="/checkout">ادامه و تأیید سفارش ←</Link>
              <p className="stitch-legal-hint">قیمت و موجودی هنگام ثبت سفارش در سرور دوباره بررسی می‌شود.</p>
            </aside>
          </div>
        )}
      </section>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role ?? null} onCart={() => {}} />
    </main>
  );
}
