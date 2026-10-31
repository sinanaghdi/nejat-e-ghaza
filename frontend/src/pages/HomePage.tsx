import { Link } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { formatToman, formatPickupTime } from "../lib/formatters";
import { Header } from "../components/Header";
import { HowItWorks } from "../components/HowItWorks";
import { OfferCard } from "../components/OfferCard";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { SafeImage } from "../components/SafeImage";

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
  { label: "همه پیشنهادها", query: "", glyph: "✳" },
  { label: "غذای اصیل و محلی", query: "غذای محلی", glyph: "🍲" },
  { label: "نان و شیرینی", query: "نان شیرینی", glyph: "🥐" },
  { label: "فست‌فود", query: "برگر پیتزا", glyph: "🍔" },
  { label: "کافه و دسر", query: "کافه دسر", glyph: "☕" },
  { label: "بسته سورپرایز", query: "بسته نجات", glyph: "🎁" },
];

function discountPercent(offer?: FoodOffer) {
  if (!offer || !offer.original_price) return 0;
  return Math.max(0, Math.round((1 - Number(offer.sale_price) / Number(offer.original_price)) * 100));
}

export function HomePage({
  user,
  cartCount,
  loading,
  error,
  featuredOffers,
  onCart,
  onOrders,
  onMerchant,
  onLogin,
  onLogout,
  onRetry,
  onOffer,
  onExploreCity,
  onQuickSearch,
}: Props) {
  const spotlight = featuredOffers[0];
  const spotlightDiscount = discountPercent(spotlight);

  return (
    <main className="app home-app">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />

      <section className="impact-strip">
        <div className="impact-strip-inner">
          <p><span aria-hidden="true">✳</span><strong>یک انتخاب کوچک، دورریز کمتر</strong><span className="impact-strip-copy">بسته‌های مازادِ قابل‌مصرف را از فروشگاه‌های محلی پیدا کن.</span></p>
          <div className="city-switcher" role="group" aria-label="انتخاب شهر برای مشاهده پیشنهادها">
            <button type="button" onClick={() => onExploreCity("")} className="city-chip city-chip-all"><span aria-hidden="true">⌖</span> همه مناطق</button>
            <button type="button" onClick={() => onExploreCity("بابلسر")} className="city-chip">🌊 بابلسر</button>
            <button type="button" onClick={() => onExploreCity("آمل")} className="city-chip">🏔️ آمل</button>
          </div>
        </div>
      </section>

      <section className="reference-hero page-content" aria-labelledby="home-title">
        <div className="hero-panel">
          <div className="hero-panel-orb" aria-hidden="true" />
          <div className="hero-copy-block">
            <span className="hero-kicker"><span aria-hidden="true">✳</span> بازار محلی سهمینو</span>
            <h1 id="home-title">غذای درجه‌یک را<br /><em>هوشمندانه‌تر</em> انتخاب کن.</h1>
            <p>بسته‌های مازادِ کافه‌ها، رستوران‌ها و نانوایی‌های اطراف را با قیمت مناسب پیدا کن؛ رزرو کن و در بازهٔ تحویل مشخص، حضوری از فروشنده تحویل بگیر.</p>
            <div className="hero-actions">
              <Link className="primary-button hero-primary" to="/offers"><span aria-hidden="true">⌕</span> کاوش بسته‌های امروز</Link>
              <a className="hero-secondary-link" href="#how-it-works">چطور کار می‌کند؟ <span aria-hidden="true">←</span></a>
            </div>
            <div className="hero-trust-row">
              <span><b aria-hidden="true">✓</b> قیمت شفاف</span>
              <span><b aria-hidden="true">✓</b> زمان تحویل مشخص</span>
              <span><b aria-hidden="true">✓</b> خرید حضوری از فروشنده</span>
            </div>
          </div>
          <div className="hero-showcase">
            <div className="hero-photo-frame">
              <SafeImage src={spotlight?.image_url} alt={spotlight?.title || "پیشنهاد غذایی سهمینو"} className="hero-photo-image" loading="eager" fetchPriority="high" fallback={<div className="hero-placeholder-food" aria-hidden="true">🍲</div>} />
              <span className="hero-photo-badge"><span aria-hidden="true">✳</span> انتخاب امروز</span>
              <div className="hero-floating-note">
                <span className="floating-note-icon" aria-hidden="true">♻</span>
                <span><strong>سهمینو، انتخاب به‌صرفه</strong><small>برای تو و کسب‌وکارهای محلی</small></span>
              </div>
            </div>
            {spotlight ? (
              <Link to={`/offers/${spotlight.id}`} className="hero-offer-preview" aria-label={`مشاهده بسته ${spotlight.title}`}>
                <span className="hero-preview-top"><small>پیشنهاد برجسته</small>{spotlightDiscount > 0 && <b>{spotlightDiscount.toLocaleString("fa-IR")}٪ تخفیف</b>}</span>
                <strong>{spotlight.title}</strong>
                <span className="hero-preview-merchant">{spotlight.merchant.business_name} · {spotlight.merchant.city}</span>
                <span className="hero-preview-bottom"><b>{formatToman(spotlight.sale_price)}</b><small>تحویل تا {formatPickupTime(spotlight.pickup_end)}</small></span>
              </Link>
            ) : (
              <div className="hero-offer-preview">
                <span className="hero-preview-top"><small>بسته‌های روزانه</small><b>بسته به موجودی فروشگاه</b></span>
                <strong>پیشنهادهای تازه را بررسی کن</strong>
                <span className="hero-preview-merchant">بابلسر و آمل · تحویل حضوری</span>
                <span className="hero-preview-bottom"><Link to="/offers">دیدن پیشنهادها ←</Link><small>موجودی و قیمت در صفحهٔ هر بسته</small></span>
              </div>
            )}
          </div>
        </div>

        <div className="hero-benefits">
          <article><span aria-hidden="true">◇</span><div><strong>قیمت روشن</strong><small>قیمت اصلی و نجات کنار هم</small></div></article>
          <article><span aria-hidden="true">◷</span><div><strong>تحویل زمان‌بندی‌شده</strong><small>بازهٔ دریافت پیش از رزرو</small></div></article>
          <article><span aria-hidden="true">⌖</span><div><strong>محلی و نزدیک</strong><small>تمرکز بر بابلسر و آمل</small></div></article>
        </div>
      </section>

      <section className="category-section page-content" aria-label="دسته‌بندی پیشنهادها">
        <div className="section-heading">
          <div><p className="eyebrow">از کجا شروع کنیم؟</p><h2>امروز دنبال چه چیزی هستی؟</h2></div>
          <Link className="text-link" to="/offers">همه پیشنهادها <span aria-hidden="true">←</span></Link>
        </div>
        <div className="category-pills">
          {categories.map((category, index) => (
            <button key={category.label} type="button" className={index === 0 ? "category-pill category-pill-active" : "category-pill"} onClick={() => onQuickSearch(category.query)}>
              <span aria-hidden="true">{category.glyph}</span>{category.label}
            </button>
          ))}
        </div>
      </section>

      <section id="offers" className="section featured-section">
        <div className="section-heading">
          <div><p className="eyebrow">پیشنهادهای موجود در بازار</p><h2>بسته‌های سهمینو</h2><p className="section-subtitle">قیمت، موجودی و زمان تحویل را در هر کارت بررسی کن.</p></div>
          <Link className="secondary-button compact" to="/offers">مشاهده همه پیشنهادها <span aria-hidden="true">←</span></Link>
        </div>

        {loading && (
          <div className="offer-grid" aria-label="در حال بارگذاری">
            {[1, 2, 3].map((item) => (
              <div className="offer-card skeleton-card" key={item}><div className="skeleton skeleton-image" /><div className="offer-content"><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line price" /><div className="skeleton skeleton-button" /></div></div>
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="state-card error-state"><div className="state-icon">!</div><h3>پیشنهادهای امروز بارگذاری نشدند</h3><p>{error}</p><button className="secondary-button compact" type="button" onClick={onRetry}>تلاش دوباره</button></div>
        )}
        {!loading && !error && featuredOffers.length === 0 && (
          <div className="state-card"><div className="state-icon" aria-hidden="true">🍽️</div><h3>در حال حاضر بستهٔ فعالی در این نمایش نیست</h3><p>همه پیشنهادها را بررسی کن یا بعداً دوباره سر بزن. موجودی در طول روز ممکن است تغییر کند.</p><Link className="primary-button" to="/offers">رفتن به بازار</Link></div>
        )}
        {!loading && !error && featuredOffers.length > 0 && <div className="offer-grid">{featuredOffers.map((offer) => <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />)}</div>}
        {!loading && !error && featuredOffers.length > 0 && <div className="section-cta"><Link className="primary-button" to="/offers">پیدا کردن بسته‌های بیشتر <span aria-hidden="true">←</span></Link></div>}
      </section>

      <HowItWorks />

      <section className="food-safety-callout page-content">
        <div className="safety-symbol" aria-hidden="true">✓</div>
        <div><p className="eyebrow">شفافیت و اعتماد</p><h2>مازاد بودن، به معنی تاریخ‌گذشته بودن نیست.</h2><p>پیش از رزرو، توضیحات فروشنده و بازهٔ تحویل را بخوان. دربارهٔ مواد تشکیل‌دهنده، آلرژن‌ها یا شرایط نگهداری که ثبت نشده‌اند، مستقیماً از فروشنده سؤال کن.</p></div>
        <Link className="secondary-button compact" to="/safety">قوانین ایمنی غذا <span aria-hidden="true">←</span></Link>
      </section>

      <section className="merchant-cta page-content">
        <div><p className="eyebrow">همکاری محلی</p><h2>صاحب کافه، رستوران یا نانوایی هستی؟</h2><p>بسته‌های مازادِ قابل‌مصرف را با موجودی و زمان دریافت شفاف معرفی کن.</p></div>
        <Link className="primary-button" to="/for-restaurants">آشنایی با همکاری فروشندگان <span aria-hidden="true">←</span></Link>
      </section>

      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </main>
  );
}
