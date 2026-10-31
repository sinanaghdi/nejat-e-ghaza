import type { FoodOffer, User } from "../lib/api";
import { Header } from "../components/Header";
import { OfferCard } from "../components/OfferCard";
import { MobileBottomNav } from "../components/MobileBottomNav";

type Props = {
  user: User | null;
  cartCount: number;
  loading: boolean;
  error: string;
  offers: FoodOffer[];
  search: string;
  city: string;
  sort: "newest" | "price_asc" | "price_desc" | "discount";
  nearby: boolean;
  locationStatus: "idle" | "loading" | "denied" | "ready";
  onSearchChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSortChange: (value: Props["sort"]) => void;
  onSearch: () => void;
  onQuickSearch: (query: string) => void;
  onResetFilters: () => void;
  onNearby: () => void;
  onRetry: () => void;
  onOffer: (offer: FoodOffer) => void;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

const quickCategories = [
  { label: "همه پیشنهادها", query: "", icon: "✳" },
  { label: "غذای محلی", query: "غذای محلی", icon: "🍲" },
  { label: "نان و شیرینی", query: "نان شیرینی", icon: "🥐" },
  { label: "فست‌فود", query: "برگر پیتزا", icon: "🍔" },
  { label: "کافه و دسر", query: "کافه دسر", icon: "☕" },
  { label: "بسته سورپرایز", query: "بسته غذایی", icon: "🎁" },
];

export function OffersPage({
  user,
  cartCount,
  loading,
  error,
  offers,
  search,
  city,
  sort,
  nearby,
  locationStatus,
  onSearchChange,
  onCityChange,
  onSortChange,
  onSearch,
  onQuickSearch,
  onResetFilters,
  onNearby,
  onRetry,
  onOffer,
  onCart,
  onOrders,
  onMerchant,
  onLogin,
  onLogout,
}: Props) {
  return (
    <main className="app offers-app">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />

      <section className="page-shell marketplace-page">
        <div className="marketplace-intro">
          <div className="marketplace-breadcrumb"><span>سهمینو</span><span aria-hidden="true">‹</span><strong>کاوش پیشنهادها</strong></div>
          <div className="page-header marketplace-header">
            <p className="eyebrow">بازار سهمینو · بابلسر و آمل</p>
            <h1>غذاهای خوب را، هوشمندانه‌تر پیدا کن.</h1>
            <p>قیمت، موجودی و زمان دریافت را قبل از رزرو بررسی کن. سفارش‌ها برای تحویل حضوری از فروشنده محلی هستند.</p>
          </div>
          <div className="marketplace-summary-pills">
            <span><b aria-hidden="true">✓</b> قیمت اصلی و قیمت با تخفیف</span>
            <span><b aria-hidden="true">◷</b> زمان تحویل مشخص</span>
            <span><b aria-hidden="true">⌖</b> محدودهٔ محلی</span>
          </div>
        </div>

        <div className="marketplace-filter-panel">
          <div className="filter-panel-heading"><div><p className="eyebrow">فیلترهای جست‌وجو</p><h2>بستهٔ مناسب خودت را پیدا کن</h2></div><button className="filter-reset" type="button" onClick={onResetFilters}>پاک‌کردن فیلترها</button></div>
          <div className="discovery-toolbar" role="search">
            <div className="search-field">
              <label htmlFor="marketplace-search">جست‌وجوی غذا یا فروشگاه</label>
              <input id="marketplace-search" value={search} onChange={(event) => onSearchChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} placeholder="مثلاً نان تازه، کافه یا بسته شام..." />
            </div>
            <div className="search-field city-field">
              <label htmlFor="marketplace-city">محدودهٔ تحویل</label>
              <select id="marketplace-city" value={city} onChange={(event) => onCityChange(event.target.value)}>
                <option value="">همه مناطق</option>
                <option value="بابلسر">بابلسر</option>
                <option value="آمل">آمل</option>
              </select>
            </div>
            <div className="search-field sort-field">
              <label htmlFor="marketplace-sort">ترتیب نمایش</label>
              <select id="marketplace-sort" value={sort} onChange={(event) => onSortChange(event.target.value as Props["sort"])}>
                <option value="newest">جدیدترین</option>
                <option value="discount">بیشترین تخفیف</option>
                <option value="price_asc">ارزان‌ترین</option>
                <option value="price_desc">گران‌ترین</option>
              </select>
            </div>
            <button className="primary-button discovery-button" type="button" onClick={onSearch}>جست‌وجو <span aria-hidden="true">⌕</span></button>
            <button className={nearby ? "secondary-button nearby-button active" : "secondary-button nearby-button"} type="button" onClick={onNearby} disabled={locationStatus === "loading"}>
              {locationStatus === "loading" ? "در حال دریافت موقعیت..." : nearby ? "پیشنهادهای نزدیک فعال است" : "نزدیک من"}
            </button>
          </div>
          {locationStatus === "denied" && <p className="location-notice" role="status">موقعیت مکانی در دسترس نیست یا اجازه داده نشد؛ می‌توانی با انتخاب شهر جست‌وجو کنی.</p>}
          <div className="category-pills marketplace-category-pills" aria-label="دسته‌بندی‌های سریع">
            {quickCategories.map((category, index) => (
              <button key={category.label} type="button" className={index === 0 && !search ? "category-pill category-pill-active" : "category-pill"} onClick={() => onQuickSearch(category.query)}>
                <span aria-hidden="true">{category.icon}</span>{category.label}
              </button>
            ))}
          </div>
        </div>

        <section className="marketplace-results" aria-labelledby="active-offers-heading">
          <div className="section-heading">
            <div><p className="eyebrow">موجودی قابل‌رزرو</p><h2 id="active-offers-heading">همه پیشنهادهای فعال</h2><p className="section-subtitle">اطلاعات نمایش‌داده‌شده بر اساس پاسخ فعلی سامانه است و ممکن است تغییر کند.</p></div>
            <span className="offer-count">{loading ? "در حال دریافت..." : offers.length.toLocaleString("fa-IR") + " پیشنهاد"}</span>
          </div>

          {loading && <div className="offer-grid" aria-label="در حال بارگذاری">{[1, 2, 3, 4].map((item) => <div className="offer-card skeleton-card" key={item}><div className="skeleton skeleton-image" /><div className="offer-content"><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line price" /><div className="skeleton skeleton-button" /></div></div>)}</div>}
          {!loading && error && <div className="state-card error-state"><div className="state-icon">!</div><h3>پیشنهادها بارگذاری نشدند</h3><p>{error}</p><button className="secondary-button compact" type="button" onClick={onRetry}>تلاش دوباره</button></div>}
          {!loading && !error && offers.length === 0 && <div className="state-card"><div className="state-icon" aria-hidden="true">🍽️</div><h3>فعلاً پیشنهادی پیدا نشد</h3><p>عبارت جست‌وجو یا شهر را تغییر بده. نمایش این صفحه به موجودی و پاسخ سرویس بستگی دارد.</p><button className="secondary-button compact" type="button" onClick={onResetFilters}>نمایش همه پیشنهادها</button></div>}
          {!loading && !error && offers.length > 0 && <div className="offer-grid">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />)}</div>}
        </section>
      </section>

      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </main>
  );
}
