import { Link } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { QuantityControl } from "../components/QuantityControl";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { formatPickupTime, formatToman } from "../lib/formatters";

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

export function OfferDetailPage({ offer, loading, error, user, cartCount, quantity, onQuantityChange, onAddToCart, onBack, onCart }: Props) {
  if (loading) return <main className="page-shell"><div className="state-card"><div className="spinner" />در حال دریافت پیشنهاد...</div></main>;
  if (error || !offer) return <main className="page-shell"><div className="state-card error-state"><div className="state-icon">!</div><h3>{error || "این پیشنهاد پیدا نشد."}</h3><p>ممکن است پیشنهاد غیرفعال شده یا دیگر موجود نباشد.</p><button className="secondary-button compact" type="button" onClick={onBack}>بازگشت به پیشنهادها</button></div></main>;

  const discount = discountPercent(offer);
  const lowStock = offer.available_quantity > 0 && offer.available_quantity <= 3;

  return (
    <>
      <main className="page-shell offer-detail-page reference-detail-page">
        <nav className="marketplace-breadcrumb" aria-label="مسیر صفحه">
          <Link to="/">نجات غذا</Link><span aria-hidden="true">‹</span><Link to="/offers">کاوش پیشنهادها</Link><span aria-hidden="true">‹</span><strong>{offer.title}</strong>
        </nav>
        <button className="back-button" type="button" onClick={onBack}><span aria-hidden="true">→</span> بازگشت به پیشنهادها</button>

        <div className="detail-layout-grid">
          <section className="offer-detail-main">
            <div className="detail-gallery-card">
              <div className="detail-image detail-image-page">
                {offer.image_url ? <img src={offer.image_url} alt={offer.title} /> : <span className="detail-image-fallback" aria-hidden="true">🍱</span>}
                {discount > 0 && <span className="discount-badge">{discount.toLocaleString("fa-IR")}٪ تخفیف</span>}
                {lowStock && <span className="stock-badge">فقط {offer.available_quantity.toLocaleString("fa-IR")} عدد باقی مانده</span>}
              </div>
              <div className="detail-gallery-caption"><span>تصویر بستهٔ پیشنهادی</span><span>جزئیات نهایی در محل فروشنده قابل بررسی است</span></div>
            </div>

            <section className="detail-info-card">
              <div className="detail-label-row"><span className="offer-detail-kicker">بستهٔ نجات روزانه</span><span className="detail-status-chip"><span aria-hidden="true">●</span> {offer.available_quantity > 0 && offer.is_active ? "قابل‌بررسی برای رزرو" : "در دسترس نیست"}</span></div>
              <h1>{offer.title}</h1>
              <Link className="detail-merchant-link" to={`/merchants/${offer.merchant_id}`}>
                <span className="offer-merchant-avatar" aria-hidden="true">{offer.merchant.business_name.trim().slice(0, 1) || "ن"}</span>
                <span><strong>{offer.merchant.business_name}</strong><small><span aria-hidden="true">⌖</span> {offer.merchant.city} · {offer.merchant.address}</small></span>
                <span className="detail-link-chevron" aria-hidden="true">←</span>
              </Link>
              {offer.description && <div className="detail-description-block"><h2>دربارهٔ این بسته</h2><p>{offer.description}</p></div>}
            </section>

            <section className="detail-info-card detail-attributes-card">
              <div className="section-heading"><div><p className="eyebrow">پیش از رزرو</p><h2>زمان‌بندی، آدرس و قوانین تحویل حضوری</h2></div></div>
              <div className="pickup-detail-grid">
                <div className="pickup-detail-item"><span aria-hidden="true">◷</span><div><small>شروع بازهٔ دریافت</small><strong>{formatPickupTime(offer.pickup_start)}</strong></div></div>
                <div className="pickup-detail-item"><span aria-hidden="true">◴</span><div><small>پایان بازهٔ دریافت</small><strong>{formatPickupTime(offer.pickup_end)}</strong></div></div>
                <div className="pickup-detail-item"><span aria-hidden="true">⌖</span><div><small>نشانی فروشگاه</small><strong>{offer.merchant.address}</strong></div></div>
                <div className="pickup-detail-item"><span aria-hidden="true">▣</span><div><small>موجودی اعلام‌شده</small><strong>{offer.available_quantity.toLocaleString("fa-IR")} بسته</strong></div></div>
              </div>
              <p className="detail-note">تحویل به‌صورت حضوری در نشانی فروشنده انجام می‌شود. برای جلوگیری از از دست رفتن بازهٔ دریافت، زمان شروع و پایان را پیش از ثبت سفارش بررسی کن.</p>
            </section>

            <section className="detail-info-card safety-detail-card">
              <div className="safety-symbol" aria-hidden="true">✓</div>
              <div><p className="eyebrow">شفافیت ترکیبات و سلامت غذا</p><h2>حساسیت غذایی داری؟ قبل از رزرو سؤال کن.</h2><p>اطلاعات حساسیت‌زاها، مواد اولیه و شرایط نگهداری فقط زمانی قابل اتکاست که فروشنده آن را مشخص کرده باشد. اگر در توضیحات این بسته ثبت نشده، پیش از رزرو با فروشنده هماهنگ کن.</p><Link to="/safety" className="text-link">راهنمای ایمنی غذا <span aria-hidden="true">←</span></Link></div>
            </section>
          </section>

          <aside className="detail-booking-aside" aria-label="خلاصه رزرو">
            <div className="booking-card">
              <div className="booking-card-heading"><span className="eyebrow">قیمت بسته</span>{discount > 0 && <span className="discount-pill">{discount.toLocaleString("fa-IR")}٪ تخفیف</span>}</div>
              <div className="detail-price"><strong>{formatToman(offer.sale_price)}</strong>{offer.original_price > offer.sale_price && <del>{formatToman(offer.original_price)}</del>}</div>
              {discount > 0 && <p className="savings-copy">صرفه‌جویی نسبت به قیمت اصلی: <strong>{formatToman(offer.original_price - offer.sale_price)}</strong></p>}
              <div className="booking-divider" />
              <div className="booking-meta-line"><span>موجودی فعلی</span><strong>{offer.available_quantity.toLocaleString("fa-IR")} بسته</strong></div>
              <div className="booking-meta-line"><span>بازهٔ دریافت</span><strong>{formatPickupTime(offer.pickup_start)} تا {formatPickupTime(offer.pickup_end)}</strong></div>
              <div className="booking-quantity">
                <span>تعداد بسته</span>
                <QuantityControl value={quantity} max={offer.available_quantity} onChange={onQuantityChange} />
              </div>
              <div className="booking-total"><span>جمع این انتخاب</span><strong>{formatToman(offer.sale_price * quantity)}</strong></div>
              <button className="primary-button full-button reserve-cta" type="button" onClick={onAddToCart} disabled={!offer.is_active || offer.available_quantity < 1}>
                <span aria-hidden="true">▱</span> افزودن به سبد خرید
              </button>
              <p className="booking-disclaimer"><span aria-hidden="true">ⓘ</span> این مرحله فقط بسته را به سبد خرید اضافه می‌کند؛ سفارش و پرداخت هنوز نهایی نشده‌اند.</p>
            </div>
            <div className="booking-reassurance"><span aria-hidden="true">✓</span><p><strong>قیمت شفاف</strong><small>قیمت اصلی و قیمت فروش در همین صفحه نمایش داده شده‌اند.</small></p></div>
            <div className="booking-reassurance"><span aria-hidden="true">◷</span><p><strong>تحویل حضوری</strong><small>برای دریافت، در بازهٔ تعیین‌شده به فروشگاه مراجعه کن.</small></p></div>
          </aside>
        </div>

        <section className="related-offers-note">
          <span aria-hidden="true">✳</span><div><strong>به دنبال گزینه‌های بیشتری هستی؟</strong><p>پیشنهادهای دیگر را ببین و قیمت و زمان دریافتشان را مقایسه کن.</p></div><Link className="secondary-button compact" to="/offers">دیدن همه پیشنهادها <span aria-hidden="true">←</span></Link>
        </section>
      </main>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </>
  );
}
