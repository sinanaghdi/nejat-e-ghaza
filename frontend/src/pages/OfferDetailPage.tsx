import { Link } from "react-router-dom";
import { SafeImage } from "../components/SafeImage";
import type { FoodOffer, User } from "../lib/api";
import { QuantityControl } from "../components/QuantityControl";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { formatPickupTime, formatToman } from "../lib/formatters";
import { getStitchFoodImage } from "../lib/stitchAssets";
import { UiIcon } from "../components/UiIcon";

type Props = {
  offer: FoodOffer | null;
  loading: boolean;
  error: string;
  user: User | null;
  cartCount: number;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => void;
  onBack: () => void;
  onCart: () => void;
};

function discountPercent(offer: FoodOffer) {
  if (!offer.original_price) return 0;
  return Math.max(0, Math.round((1 - Number(offer.sale_price) / Number(offer.original_price)) * 100));
}

export function OfferDetailPage({
  offer, loading, error, user, cartCount, quantity,
  onQuantityChange, onAddToCart, onBack, onCart,
}: Props) {
  if (loading) {
    return <main className="stitch-app"><div className="stitch-content stitch-detail-page"><section className="stitch-state-card" role="status">در حال دریافت جزئیات بسته...</section></div></main>;
  }
  if (error || !offer) {
    return (
      <main className="stitch-app">
        <div className="stitch-content stitch-detail-page">
          <section className="stitch-state-card stitch-error-card" role="alert">
            <h3>{error || "این بسته پیدا نشد."}</h3>
            <p>ممکن است فروشنده آن را غیرفعال کرده یا موجودی آن تمام شده باشد.</p>
            <button className="stitch-button stitch-button-secondary" onClick={onBack}>بازگشت به بسته‌ها</button>
          </section>
        </div>
      </main>
    );
  }

  const discount = discountPercent(offer);
  const available = offer.is_active && offer.available_quantity > 0 && new Date(offer.pickup_end).getTime() > Date.now();
  const total = offer.sale_price * quantity;

  return (
    <main className="stitch-app">
      <section className="stitch-content stitch-detail-page">
        <nav className="stitch-breadcrumb" aria-label="مسیر صفحه">
          <Link to="/">سهمینو</Link><span>←</span><Link to="/offers">بسته‌ها</Link><span>←</span><strong>{offer.title}</strong>
        </nav>

        <div className="stitch-detail-layout" style={{ marginTop: 18 }}>
          <div className="stitch-detail-main">
            <div className="stitch-detail-photo">
              <SafeImage
                src={offer.image_url || getStitchFoodImage(offer.title, offer.description || "")}
                alt={offer.image_url ? offer.title : `تصویر نمونه ${offer.title}`}
                loading="eager"
                fallback={<span className="stitch-food-placeholder">🍱</span>}
              />
              {discount > 0 && <span className="stitch-discount-badge" style={{ position: "absolute", top: 14, insetInlineStart: 14 }}>{discount.toLocaleString("fa-IR")}٪ تخفیف</span>}
            </div>

            <section className="stitch-detail-info">
              <div className="stitch-section-heading">
                <div><p className="stitch-kicker">بستهٔ مازادِ قابل‌مصرف</p><h1>{offer.title}</h1></div>
                <span className={available ? "stitch-status-pill" : "stitch-status-pill is-danger"}>{available ? "قابل رزرو" : "در دسترس نیست"}</span>
              </div>
              {offer.description && <p>{offer.description}</p>}

              <Link className="stitch-detail-seller" to={`/merchants/${offer.merchant_id}`}>
                <span className="stitch-merchant-avatar">{offer.merchant.business_name.trim().slice(0, 1) || "س"}</span>
                <span><strong>{offer.merchant.business_name}</strong><small><UiIcon name="pin" size={13} /> {offer.merchant.city} · {offer.merchant.address}</small></span>
                <UiIcon name="arrow-left" size={18} />
              </Link>
            </section>

            <section className="stitch-detail-info">
              <p className="stitch-kicker">پیش از رزرو بررسی کن</p>
              <h2 style={{ margin: "0 0 14px", color: "var(--stitch-pine)", fontSize: "1.08rem" }}>زمان و شیوهٔ دریافت</h2>
              <div className="stitch-detail-timing">
                <div><small>شروع دریافت</small><strong>{formatPickupTime(offer.pickup_start)}</strong></div>
                <div><small>پایان دریافت</small><strong>{formatPickupTime(offer.pickup_end)}</strong></div>
                <div><small>نشانی فروشگاه</small><strong>{offer.merchant.address}</strong></div>
                <div><small>موجودی اعلام‌شده</small><strong>{offer.available_quantity.toLocaleString("fa-IR")} بسته</strong></div>
              </div>
              <p style={{ margin: "15px 0 0", fontSize: ".75rem" }}>تحویل در محل فروشنده و در بازهٔ درج‌شده انجام می‌شود. هزینهٔ ارسال یا پیک در این نسخه ارائه نمی‌شود.</p>
            </section>

            <section className="stitch-note-card">
              <div className="stitch-note-icon"><UiIcon name="shield-check" size={20} /></div>
              <div>
                <strong>اطلاعات غذا و حساسیت‌ها</strong>
                <p>اطلاعات مواد اولیه، آلرژن‌ها و شرایط نگهداری فقط در صورتی قابل اتکاست که فروشنده آن را ثبت کرده باشد. موارد ثبت‌نشده را پیش از رزرو از فروشنده بپرس.</p>
                <Link to="/safety" className="stitch-text-link">راهنمای ایمنی غذا ←</Link>
              </div>
            </section>
          </div>

          <aside className="stitch-booking-card">
            <p className="stitch-kicker">قیمت و رزرو</p>
            <h2>این بسته را انتخاب کن</h2>
            <div className="stitch-booking-price">
              {formatToman(offer.sale_price)}
              {offer.original_price > offer.sale_price && <del>{formatToman(offer.original_price)}</del>}
            </div>
            {discount > 0 && <span className="stitch-saving-chip">صرفه‌جویی {discount.toLocaleString("fa-IR")}٪ نسبت به قیمت اصلی</span>}
            <div className="stitch-divider" />
            <div className="stitch-booking-total"><span>موجودی فعلی</span><strong>{offer.available_quantity.toLocaleString("fa-IR")} بسته</strong></div>
            <div className="stitch-booking-total"><span>بازهٔ دریافت</span><strong>{formatPickupTime(offer.pickup_start)} تا {formatPickupTime(offer.pickup_end)}</strong></div>
            <div className="stitch-booking-qty">
              <span>تعداد بسته</span>
              <QuantityControl value={quantity} max={offer.available_quantity} onChange={onQuantityChange} />
            </div>
            <div className="stitch-booking-total"><span>جمع این انتخاب</span><strong>{formatToman(total)}</strong></div>
            <button className="stitch-button stitch-button-primary" style={{ width: "100%" }} type="button" onClick={onAddToCart} disabled={!available || quantity < 1}>
              افزودن به سبد <UiIcon name="bag" size={18} />
            </button>
            <p className="stitch-booking-note">افزودن به سبد به‌تنهایی سفارش یا پرداخت را نهایی نمی‌کند. موجودی هنگام ثبت سفارش در سرور دوباره بررسی می‌شود.</p>
          </aside>
        </div>
      </section>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role ?? null} onCart={onCart} />
    </main>
  );
}
