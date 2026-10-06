import type { FoodOffer, User } from "../lib/api";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { OfferCard } from "../components/OfferCard";
import { MobileBottomNav } from "../components/MobileBottomNav";


type Props = {
  user: User | null;
  cartCount: number;
  loading: boolean;
  error: string;
  availableOffers: FoodOffer[];
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onRetry: () => void;
  onOffer: (offer: FoodOffer) => void;
  search: string;
  city: string;
  sort: "newest" | "price_asc" | "price_desc" | "discount";
  onSearchChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onSortChange: (value: Props["sort"]) => void;
  onSearch: () => void;
  nearby: boolean;
  locationStatus: "idle" | "loading" | "denied" | "ready";
  onNearby: () => void;
};

export function HomePage({ user, cartCount, loading, error, availableOffers, onCart, onOrders, onMerchant, onLogin, onLogout, onRetry, onOffer, search, city, sort, onSearchChange, onCityChange, onSortChange, onSearch, nearby, locationStatus, onNearby }: Props) {
  return (
    <main className="app">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />
      <Hero />
      <section id="offers" className="section">
        <div className="discovery-toolbar" role="search">
          <div className="search-field">
            <label htmlFor="offer-search">جست‌وجوی غذا یا فروشگاه</label>
            <input id="offer-search" value={search} onChange={(event) => onSearchChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} placeholder="مثلاً پیتزا، کافه سبز..." />
          </div>
          <div className="search-field city-field">
            <label htmlFor="offer-city">شهر</label>
            <input id="offer-city" value={city} onChange={(event) => onCityChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") onSearch(); }} placeholder="مثلاً کرمانشاه" />
          </div>
          <div className="search-field sort-field">
            <label htmlFor="offer-sort">مرتب‌سازی</label>
            <select id="offer-sort" value={sort} onChange={(event) => onSortChange(event.target.value as Props["sort"])}>
              <option value="newest">جدیدترین</option>
              <option value="discount">بیشترین تخفیف</option>
              <option value="price_asc">ارزان‌ترین</option>
              <option value="price_desc">گران‌ترین</option>
            </select>
          </div>
          <button className="primary-button discovery-button" type="button" onClick={onSearch}>جست‌وجو</button>
          <button className={`secondary-button nearby-button${nearby ? " active" : ""}`} type="button" onClick={onNearby} disabled={locationStatus === "loading"}>
            {locationStatus === "loading" ? "در حال دریافت موقعیت..." : nearby ? "پیشنهادهای نزدیک فعال است" : "نزدیک من"}
          </button>
        </div>
        <div className="section-heading">
          <div><p className="eyebrow">تازه و نزدیک</p><h2>پیشنهادهای امروز</h2></div>
          <span className="offer-count">{loading ? "در حال دریافت..." : `${availableOffers.length} پیشنهاد فعال`}</span>
        </div>
        {loading && <div className="offer-grid" aria-label="در حال بارگذاری">{[1,2,3].map(item => <div className="offer-card skeleton-card" key={item}><div className="skeleton skeleton-image" /><div className="offer-content"><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line price" /><div className="skeleton skeleton-button" /></div></div>)}</div>}
        {!loading && error && <div className="state-card error-state"><div className="state-icon">!</div><h3>پیشنهادها بارگذاری نشدند</h3><p>{error}</p><button className="secondary-button compact" type="button" onClick={onRetry}>تلاش دوباره</button></div>}
        {!loading && !error && availableOffers.length === 0 && <div className="state-card"><div className="state-icon">🍽️</div><h3>فعلاً پیشنهادی پیدا نشد</h3><p>پیشنهادهای جدید به‌زودی اینجا نمایش داده می‌شوند.</p></div>}
        {!loading && !error && availableOffers.length > 0 && <div className="offer-grid">{availableOffers.map((offer) => <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />)}</div>}
      </section>
      <HowItWorks />
      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </main>
  );
}
