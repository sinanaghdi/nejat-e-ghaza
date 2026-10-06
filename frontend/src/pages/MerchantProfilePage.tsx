import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { FoodOffer, User } from "../lib/api";
import { getOffers } from "../lib/api";
import { OfferCard } from "../components/OfferCard";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";

type Props = {
  merchantId: number;
  user: User | null;
  cartCount: number;
  onOffer: (offer: FoodOffer) => void;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function MerchantProfilePage({
  merchantId,
  user,
  cartCount,
  onOffer,
  onCart,
  onOrders,
  onMerchant,
  onLogin,
  onLogout,
}: Props) {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<FoodOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    getOffers()
      .then((items) => {
        if (!active) return;
        setOffers(items.filter((offer) => offer.merchant_id === merchantId));
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "اطلاعات فروشگاه دریافت نشد.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [merchantId]);

  const merchant = offers[0]?.merchant;

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

      <section className="page-shell merchant-profile-page">
        <button className="back-button" type="button" onClick={() => navigate(-1)}>
          → بازگشت
        </button>

        {loading && (
          <div className="state-card">
            <div className="spinner" />
            در حال دریافت فروشگاه...
          </div>
        )}

        {!loading && error && (
          <div className="state-card error-state">
            <div className="state-icon">!</div>
            <h3>فروشگاه پیدا نشد</h3>
            <p>{error}</p>
            <Link className="secondary-button compact" to="/offers">
              مشاهده پیشنهادها
            </Link>
          </div>
        )}

        {!loading && !error && !merchant && (
          <div className="state-card">
            <div className="state-icon">🏪</div>
            <h3>این فروشگاه پیشنهاد فعالی ندارد</h3>
            <p>ممکن است پیشنهادهای آن تمام یا غیرفعال شده باشند.</p>
            <Link className="secondary-button compact" to="/offers">
              بازگشت به بازار
            </Link>
          </div>
        )}

        {!loading && !error && merchant && (
          <>
            <section className="merchant-profile-hero">
              <div className="merchant-profile-avatar" aria-hidden="true">🏪</div>
              <div>
                <p className="eyebrow">فروشگاه نجات غذا</p>
                <h1>{merchant.business_name}</h1>
                <p>{merchant.city} · {merchant.address}</p>
                <span className="profile-role">{offers.length} پیشنهاد فعال</span>
              </div>
            </section>

            <section className="section compact-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">امروز</p>
                  <h2>پیشنهادهای این فروشگاه</h2>
                </div>
              </div>
              <div className="offer-grid">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} onSelect={onOffer} />
                ))}
              </div>
            </section>
          </>
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
