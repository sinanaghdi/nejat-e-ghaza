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
  onNearby: () => void;
  onRetry: () => void;
  onOffer: (offer: FoodOffer) => void;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

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
    <main className="app">
      <Header
        user={user}
        cartCount={cartCount}
        onCart={onCart}
        onOrders={onOrders}
        onMerchant={onMerchant}
        onLogin={onLogin}
        onLogout={onLogout}
      />
      <section className="page-shell marketplace-page">
        <header className="page-header marketplace-header">
          <p className="eyebrow">بازار نجات غذا</p>
          <h1>غذاهای اضافه امروز را پیدا کن</h1>
          <p>جست‌وجو کن، پیشنهادهای نزدیک را ببین و قبل از تمام شدن رزرو کن.</p>
        </header>

        <div className="discovery-toolbar" role="search">
          <div className="search-field">
            <label htmlFor="marketplace-search">جست‌وجوی غذا یا فروشگاه</label>
            <input
              id="marketplace-search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch();
              }}
              placeholder="مثلاً پیتزا، کافه سبز..."
            />
          </div>
          <div className="search-field city-field">
            <label htmlFor="marketplace-city">شهر</label>
            <input
              id="marketplace-city"
              value={city}
              onChange={(event) => onCityChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch();
              }}
              placeholder="مثلاً کرمانشاه"
            />
          </div>
          <div className="search-field sort-field">
            <label htmlFor="marketplace-sort">مرتب‌سازی</label>
            <select
              id="marketplace-sort"
              value={sort}
              onChange={(event) =>
                onSortChange(event.target.value as Props["sort"])
              }
            >
              <option value="newest">جدیدترین</option>
              <option value="discount">بیشترین تخفیف</option>
              <option value="price_asc">ارزان‌ترین</option>
              <option value="price_desc">گران‌ترین</option>
            </select>
          </div>
          <button className="primary-button discovery-button" type="button" onClick={onSearch}>
            جست‌وجو
          </button>
          <button
            className={`secondary-button nearby-button${nearby ? " active" : ""}`}
            type="button"
            onClick={onNearby}
            disabled={locationStatus === "loading"}
          >
            {locationStatus === "loading"
              ? "در حال دریافت موقعیت..."
              : nearby
                ? "پیشنهادهای نزدیک فعال است"
                : "نزدیک من"}
          </button>
        </div>

        <div className="section-heading">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h2>همه پیشنهادهای فعال</h2>
          </div>
          <span className="offer-count">
            {loading ? "در حال دریافت..." : `${offers.length} پیشنهاد`}
          </span>
        </div>

        {loading && (
          <div className="offer-grid" aria-label="در حال بارگذاری">
            {[1, 2, 3, 4].map((item) => (
              <div className="offer-card skeleton-card" key={item}>
                <div className="skeleton skeleton-image" />
                <div className="offer-content">
                  <div className="skeleton skeleton-line short" />
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line price" />
                  <div className="skeleton skeleton-button" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="state-card error-state">
            <div className="state-icon">!</div>
            <h3>پیشنهادها بارگذاری نشدند</h3>
            <p>{error}</p>
            <button className="secondary-button compact" type="button" onClick={onRetry}>
              تلاش دوباره
            </button>
          </div>
        )}

        {!loading && !error && offers.length === 0 && (
          <div className="state-card">
            <div className="state-icon">🍽️</div>
            <h3>فعلاً پیشنهادی پیدا نشد</h3>
            <p>فیلترها را تغییر بده یا دوباره جست‌وجو کن.</p>
          </div>
        )}

        {!loading && !error && offers.length > 0 && (
          <div className="offer-grid">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />
            ))}
          </div>
        )}
      </section>
      <MobileBottomNav
        cartCount={cartCount}
        userRole={user?.role || null}
        onCart={onCart}
      />
    </main>
  );
}
