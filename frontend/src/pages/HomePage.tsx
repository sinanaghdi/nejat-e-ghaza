import { Link } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { formatToman, formatPickupTime } from "../lib/formatters";
import { getStitchFoodImage } from "../lib/stitchAssets";
import { Header } from "../components/Header";
import { OfferCard } from "../components/OfferCard";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { SafeImage } from "../components/SafeImage";
import { UiIcon } from "../components/UiIcon";

type Props = {
  user: User | null;
  cartCount: number;
  loading: boolean;
  error: string;
  featuredOffers: FoodOffer[];
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onRetry: () => void;
  onOffer: (offer: FoodOffer) => void;
  onExploreCity: (city: string) => void;
  onQuickSearch: (query: string) => void;
};

const categories = [
  { label: "همه بسته‌ها", query: "", icon: "✳" },
  { label: "نان و شیرینی", query: "نان شیرینی", icon: "🥐" },
  { label: "غذای گرم", query: "غذای گرم", icon: "🍲" },
  { label: "میوه و سبزی", query: "میوه سبزی", icon: "🥬" },
  { label: "کافه و دسر", query: "کافه دسر", icon: "☕" },
];

export function HomePage({
  user, cartCount, loading, error, featuredOffers, onCart, onOrders,
  onMerchant, onLogin, onLogout, onRetry, onOffer, onExploreCity, onQuickSearch,
}: Props) {
  const spotlight = featuredOffers[0];
  const discount = spotlight && spotlight.original_price > 0
    ? Math.max(0, Math.round((1 - spotlight.sale_price / spotlight.original_price) * 100))
    : 0;

  return (
    <main className="app stitch-app home-app">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />

      <section className="stitch-location-ribbon">
        <div className="stitch-content stitch-ribbon-inner">
          <span><UiIcon name="pin" size={15} /> محدوده‌های پایلوت</span>
          <div role="group" aria-label="انتخاب شهر">
            <button type="button" onClick={() => onExploreCity("")}>همه مناطق</button>
            <button type="button" onClick={() => onExploreCity("بابلسر")}>بابلسر</button>
            <button type="button" onClick={() => onExploreCity("آمل")}>آمل</button>
          </div>
        </div>
      </section>

      <section className="stitch-content stitch-home-hero">
        <div className="stitch-hero-copy">
          <span className="stitch-kicker"><span className="stitch-kicker-dot" /> سهم سبز محلهٔ تو</span>
          <h1>غذای خوب،<br /><em>سهم تو.</em></h1>
          <p>بسته‌های مازادِ قابل‌مصرف از کافه‌ها، نانوایی‌ها و رستوران‌های اطراف را با قیمت مناسب پیدا کن؛ رزرو کن و در بازهٔ مشخص از فروشنده تحویل بگیر.</p>
          <div className="stitch-hero-actions">
            <Link to="/offers" className="stitch-button stitch-button-accent">کشف بسته‌های امروز <UiIcon name="arrow-left" size={17} /></Link>
            <a href="#stitch-how-it-works" className="stitch-text-link">چطور کار می‌کند؟</a>
          </div>
          <div className="stitch-hero-assurances">
            <span><UiIcon name="check" size={14} /> قیمت روشن</span>
            <span><UiIcon name="clock" size={14} /> زمان دریافت مشخص</span>
            <span><UiIcon name="store" size={14} /> فروشندهٔ محلی</span>
          </div>
        </div>

        <div className="stitch-hero-visual">
          <div className="stitch-hero-main-photo">
            <SafeImage
              src={spotlight?.image_url || getStitchFoodImage(spotlight?.title || "بسته نان و شیرینی", spotlight?.description || "")}
              alt={spotlight ? `تصویر نمونه ${spotlight.title}` : "تصویر نمونه بسته غذایی"}
              loading="eager"
              fetchPriority="high"
              fallback={<span aria-hidden="true">🥖</span>}
            />
            <span className="stitch-photo-label">سهم امروز تو</span>
          </div>
          {spotlight ? (
            <button type="button" className="stitch-hero-offer-float" onClick={() => onOffer(spotlight)}>
              <span className="stitch-float-kicker">پیشنهاد موجود</span>
              <strong>{spotlight.title}</strong>
              <small>{spotlight.merchant.business_name} · {spotlight.merchant.city}</small>
              <span className="stitch-float-price">{formatToman(spotlight.sale_price)} {discount > 0 && <b>{discount.toLocaleString("fa-IR")}٪ تخفیف</b>}</span>
              <span className="stitch-float-time">دریافت تا {formatPickupTime(spotlight.pickup_end)}</span>
            </button>
          ) : (
            <div className="stitch-hero-offer-float">
              <span className="stitch-float-kicker">بسته‌های روزانه</span>
              <strong>پیشنهادهای تازه را ببین</strong>
              <small>بابلسر و آمل · تحویل حضوری</small>
              <Link to="/offers" className="stitch-text-link">رفتن به بازار ←</Link>
            </div>
          )}
          <div className="stitch-hero-stamp" aria-hidden="true"><span>سهم</span><strong>سبز</strong><small>سهمینو</small></div>
        </div>
      </section>

      <section className="stitch-content stitch-how-strip" id="stitch-how-it-works">
        <div><span>۱</span><strong>بسته را پیدا کن</strong><small>از میان پیشنهادهای فعال</small></div>
        <div><span>۲</span><strong>رزرو و پرداخت</strong><small>با قیمت و زمان شفاف</small></div>
        <div><span>۳</span><strong>حضوری تحویل بگیر</strong><small>با کد اختصاصی سفارش</small></div>
      </section>

      <section className="stitch-content stitch-category-section">
        <div className="stitch-section-heading">
          <div><p className="stitch-kicker">از کجا شروع کنیم؟</p><h2>امروز هوس چه چیزی کردی؟</h2></div>
          <Link to="/offers" className="stitch-text-link">همهٔ بسته‌ها ←</Link>
        </div>
        <div className="stitch-category-chips">
          {categories.map((category, index) => (
            <button type="button" key={category.label} className={index === 0 ? "stitch-category-chip is-active" : "stitch-category-chip"} onClick={() => onQuickSearch(category.query)}>
              <span>{category.icon}</span>{category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="stitch-content stitch-featured-section">
        <div className="stitch-section-heading">
          <div><p className="stitch-kicker">موجودی قابل‌رزرو</p><h2>بسته‌های شانس نزدیک شما</h2><p>موجودی، قیمت و بازهٔ دریافت هر پیشنهاد از اطلاعات ثبت‌شده توسط فروشنده می‌آید.</p></div>
          <Link to="/offers" className="stitch-button stitch-button-outline">مشاهدهٔ همه</Link>
        </div>

        {loading && <div className="stitch-offer-grid" aria-label="در حال بارگذاری">{[1, 2, 3].map((item) => <div className="stitch-offer-skeleton" key={item}><span /><i /><i /><b /></div>)}</div>}
        {!loading && error && <div className="stitch-state-card stitch-error-card" role="alert"><h3>پیشنهادهای امروز دریافت نشدند</h3><p>{error}</p><button className="stitch-button stitch-button-secondary" onClick={onRetry}>تلاش دوباره</button></div>}
        {!loading && !error && featuredOffers.length === 0 && <div className="stitch-state-card"><span className="stitch-state-illustration">🍽️</span><h3>فعلاً بستهٔ فعالی برای نمایش نداریم</h3><p>ممکن است پیشنهادهای تازه در طول روز اضافه شوند. بعداً دوباره سر بزن.</p><Link to="/offers" className="stitch-button stitch-button-primary">رفتن به بازار</Link></div>}
        {!loading && !error && featuredOffers.length > 0 && <div className="stitch-offer-grid">{featuredOffers.map((offer) => <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />)}</div>}
        {!loading && !error && featuredOffers.length > 0 && <div className="stitch-centered-cta"><Link to="/offers" className="stitch-button stitch-button-primary">کشف بسته‌های بیشتر <UiIcon name="arrow-left" size={16} /></Link></div>}
      </section>

      <section className="stitch-content stitch-trust-panel">
        <div className="stitch-trust-symbol"><UiIcon name="shield-check" size={30} /></div>
        <div><p className="stitch-kicker">اعتماد و شفافیت</p><h2>مازاد بودن، به معنی تاریخ‌گذشته بودن نیست.</h2><p>پیش از رزرو، توضیحات فروشنده و زمان دریافت را بررسی کن. دربارهٔ ترکیبات، آلرژن‌ها یا شرایط نگهداری که ثبت نشده‌اند، مستقیم از فروشنده سؤال کن.</p><Link to="/safety" className="stitch-text-link">راهنمای ایمنی غذا ←</Link></div>
      </section>

      <section className="stitch-content stitch-merchant-cta">
        <div><p className="stitch-kicker">برای کسب‌وکارهای محلی</p><h2>مازاد امروزت می‌تواند سهم فردا باشد.</h2><p>با ثبت موجودی و زمان دریافت روشن، محصولات قابل‌مصرف روز را به مشتریان محله معرفی کن.</p></div>
        <Link to="/for-restaurants" className="stitch-button stitch-button-accent">آشنایی با همکاری <UiIcon name="arrow-left" size={16} /></Link>
      </section>

      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </main>
  );
}
