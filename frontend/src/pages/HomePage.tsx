import { Link } from "react-router-dom";
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
  featuredOffers: FoodOffer[];
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onRetry: () => void;
  onOffer: (offer: FoodOffer) => void;
};

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
}: Props) {
  return (
    <main className="app">
      <Header user={user} cartCount={cartCount} onCart={onCart} onOrders={onOrders} onMerchant={onMerchant} onLogin={onLogin} onLogout={onLogout} />
      <Hero />

      <section id="offers" className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Marketplace</p>
            <h2>پیشنهادهای امروز</h2>
          </div>
          <Link className="secondary-button compact" to="/offers">مشاهده همه پیشنهادها</Link>
        </div>

        {loading && (
          <div className="offer-grid" aria-label="در حال بارگذاری">
            {[1, 2, 3].map((item) => (
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
            <h3>پیشنهادهای امروز بارگذاری نشدند</h3>
            <p>{error}</p>
            <button className="secondary-button compact" type="button" onClick={onRetry}>تلاش دوباره</button>
          </div>
        )}

        {!loading && !error && featuredOffers.length === 0 && (
          <div className="state-card">
            <div className="state-icon">🍽️</div>
            <h3>هنوز پیشنهاد فعالی نداریم</h3>
            <p>به‌زودی پیشنهادهای نجات غذا اینجا نمایش داده می‌شوند.</p>
            <Link className="primary-button" to="/offers">رفتن به بازار</Link>
          </div>
        )}

        {!loading && !error && featuredOffers.length > 0 && (
          <div className="offer-grid">
            {featuredOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />
            ))}
          </div>
        )}

        {!loading && !error && featuredOffers.length > 0 && (
          <div className="section-cta">
            <Link className="primary-button" to="/offers">پیدا کردن غذای بیشتر</Link>
          </div>
        )}
      </section>

      <HowItWorks />
      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </main>
  );
}
