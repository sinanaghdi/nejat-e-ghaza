import type { FoodOffer, User } from "../lib/api";
import { Header } from "../components/Header";
import { OfferCard } from "../components/OfferCard";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { UiIcon } from "../components/UiIcon";

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
  { label: "همه", query: "", icon: "✳" },
  { label: "نان و شیرینی", query: "نان شیرینی", icon: "🥐" },
  { label: "غذای گرم", query: "غذای گرم", icon: "🍲" },
  { label: "میوه و سبزی", query: "میوه سبزی", icon: "🥬" },
  { label: "کافه و دسر", query: "کافه دسر", icon: "☕" },
];

export function OffersPage(props: Props) {
  const {
    user, cartCount, loading, error, offers, search, city, sort, nearby, locationStatus,
    onSearchChange, onCityChange, onSortChange, onSearch, onQuickSearch, onResetFilters,
    onNearby, onRetry, onOffer, onCart, onOrders, onMerchant, onLogin, onLogout,
  } = props;

  return (
    <main className="app stitch-app stitch-marketplace">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />

      <section className="stitch-content stitch-marketplace-heading">
        <div className="stitch-breadcrumb"><a href="#/">سهمینو</a><span>←</span><strong>کاوش بسته‌ها</strong></div>
        <div className="stitch-section-heading stitch-marketplace-title">
          <div><p className="stitch-kicker">بازار محلی سهمینو</p><h1>بسته‌های شانس نزدیک شما</h1><p>پیشنهادهای ثبت‌شده از فروشندگان محلی بابلسر و آمل را ببین و زمان دریافت را پیش از رزرو بررسی کن.</p></div>
          <div className="stitch-marketplace-live"><span /> اطلاعات موجودی از سرویس</div>
        </div>
      </section>

      <section className="stitch-content stitch-marketplace-filter">
        <form className="stitch-filter-form" role="search" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
          <label className="stitch-search-box" htmlFor="marketplace-search">
            <UiIcon name="search" size={20} />
            <span className="sr-only">جست‌وجوی غذا یا فروشگاه</span>
            <input id="marketplace-search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="جست‌وجوی نان، کافه یا غذای امروز..." />
            {search && <button type="button" aria-label="پاک کردن جست‌وجو" onClick={() => onSearchChange("")}>×</button>}
          </label>
          <label className="stitch-select-field"><span>محدوده</span><select value={city} onChange={(event) => onCityChange(event.target.value)}><option value="">همه مناطق</option><option value="بابلسر">بابلسر</option><option value="آمل">آمل</option></select></label>
          <label className="stitch-select-field"><span>مرتب‌سازی</span><select value={sort} onChange={(event) => onSortChange(event.target.value as Props["sort"])}><option value="newest">جدیدترین</option><option value="discount">بیشترین تخفیف</option><option value="price_asc">ارزان‌ترین</option><option value="price_desc">گران‌ترین</option></select></label>
          <button className="stitch-button stitch-button-primary" type="submit">جست‌وجو</button>
          <button className={nearby ? "stitch-button stitch-button-outline is-selected" : "stitch-button stitch-button-outline"} type="button" onClick={onNearby} disabled={locationStatus === "loading"}><UiIcon name="pin" size={16} />{locationStatus === "loading" ? "در حال دریافت..." : "نزدیک من"}</button>
        </form>
        {locationStatus === "denied" && <p className="stitch-inline-note" role="status">موقعیت مکانی در دسترس نیست؛ می‌توانی محدوده را دستی انتخاب کنی.</p>}
        <div className="stitch-category-chips" aria-label="دسته‌بندی سریع">
          {quickCategories.map((category, index) => (
            <button type="button" key={category.label} className={index === 0 && !search ? "stitch-category-chip is-active" : "stitch-category-chip"} onClick={() => onQuickSearch(category.query)}><span>{category.icon}</span>{category.label}</button>
          ))}
          <button type="button" className="stitch-filter-reset" onClick={onResetFilters}>پاک‌کردن فیلترها</button>
        </div>
      </section>

      <section className="stitch-content stitch-marketplace-results">
        <div className="stitch-section-heading">
          <div><p className="stitch-kicker">موجودی قابل‌رزرو</p><h2>همهٔ پیشنهادهای فعال</h2><p>فهرست زیر از API سامانه دریافت می‌شود؛ موجودی ممکن است با رزروهای جدید تغییر کند.</p></div>
          <span className="stitch-results-count">{loading ? "در حال دریافت..." : `${offers.length.toLocaleString("fa-IR")} بسته`}</span>
        </div>
        {loading && <div className="stitch-offer-grid">{[1, 2, 3, 4].map((item) => <div className="stitch-offer-skeleton" key={item}><span /><i /><i /><b /></div>)}</div>}
        {!loading && error && <div className="stitch-state-card stitch-error-card" role="alert"><h3>دریافت پیشنهادها انجام نشد</h3><p>{error}</p><button type="button" className="stitch-button stitch-button-secondary" onClick={onRetry}>تلاش دوباره</button></div>}
        {!loading && !error && offers.length === 0 && <div className="stitch-state-card"><span className="stitch-state-illustration">🍽️</span><h3>با این فیلتر بسته‌ای پیدا نشد</h3><p>شهر یا عبارت جست‌وجو را تغییر بده، یا دوباره همهٔ پیشنهادها را ببین.</p><button className="stitch-button stitch-button-primary" onClick={onResetFilters}>نمایش همه بسته‌ها</button></div>}
        {!loading && !error && offers.length > 0 && <div className="stitch-offer-grid">{offers.map((offer) => <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />)}</div>}
      </section>

      <MobileBottomNav cartCount={cartCount} userRole={user?.role ?? null} onCart={onCart} />
    </main>
  );
}
