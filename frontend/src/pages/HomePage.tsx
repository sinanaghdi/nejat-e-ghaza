import type { FoodOffer, User } from "../lib/api";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { HowItWorks } from "../components/HowItWorks";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { formatPickupTime, formatToman } from "../lib/formatters";

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
};

function discountPercent(offer: FoodOffer) {
  if (!offer.original_price) return 0;
  return Math.round((1 - Number(offer.sale_price) / Number(offer.original_price)) * 100);
}

export function HomePage({ user, cartCount, loading, error, availableOffers, onCart, onOrders, onMerchant, onLogin, onLogout, onRetry, onOffer }: Props) {
  return (
    <main className="app">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />
      <Hero />
      <section id="offers" className="section">
        <div className="section-heading">
          <div><p className="eyebrow">تازه و نزدیک</p><h2>پیشنهادهای امروز</h2></div>
          <span className="offer-count">{loading ? "در حال دریافت..." : `${availableOffers.length} پیشنهاد فعال`}</span>
        </div>
        {loading && <div className="offer-grid" aria-label="در حال بارگذاری">{[1,2,3].map(item => <div className="offer-card skeleton-card" key={item}><div className="skeleton skeleton-image" /><div className="offer-content"><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line price" /><div className="skeleton skeleton-button" /></div></div>)}</div>}
        {!loading && error && <div className="state-card error-state"><div className="state-icon">!</div><h3>پیشنهادها بارگذاری نشدند</h3><p>{error}</p><button className="secondary-button compact" type="button" onClick={onRetry}>تلاش دوباره</button></div>}
        {!loading && !error && availableOffers.length === 0 && <div className="state-card"><div className="state-icon">🍽️</div><h3>فعلاً پیشنهادی پیدا نشد</h3><p>پیشنهادهای جدید به‌زودی اینجا نمایش داده می‌شوند.</p></div>}
        {!loading && !error && availableOffers.length > 0 && <div className="offer-grid">{availableOffers.map(offer => <article className="offer-card" key={offer.id}><div className="offer-image">{offer.image_url ? <img src={offer.image_url} alt={offer.title} /> : <span aria-hidden="true">🍱</span>}{discountPercent(offer)>0 && <span className="discount-badge">{discountPercent(offer)}٪ تخفیف</span>}</div><div className="offer-content"><span className="merchant">فروشنده #{offer.merchant_id}</span><h3>{offer.title}</h3>{offer.description && <p className="description">{offer.description}</p>}<div className="price-row"><div><strong>{formatToman(offer.sale_price)}</strong><del>{formatToman(offer.original_price)}</del></div></div><div className="offer-meta"><span>🕐 دریافت تا {formatPickupTime(offer.pickup_end)}</span><span>📦 {offer.available_quantity} عدد باقی‌مانده</span></div><button className="secondary-button" type="button" onClick={() => onOffer(offer)}>مشاهده و رزرو</button></div></article>)}</div>}
      </section>
      <HowItWorks />
      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </main>
  );
}
