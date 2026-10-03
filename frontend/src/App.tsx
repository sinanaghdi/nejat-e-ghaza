import { useEffect, useMemo, useState } from "react";
import { ApiError, FoodOffer, getOffers } from "./lib/api";
import { formatPickupTime, formatToman } from "./lib/formatters";

function discountPercent(offer: FoodOffer): number {
  if (offer.original_price <= 0) return 0;
  return Math.round((1 - offer.sale_price / offer.original_price) * 100);
}

function App() {
  const [offers, setOffers] = useState<FoodOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOffers() {
    setLoading(true);
    setError("");
    try {
      setOffers(await getOffers());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffers();
  }, []);

  const availableOffers = useMemo(
    () => offers.filter((offer) => offer.is_active && offer.available_quantity > 0),
    [offers],
  );

  return (
    <main className="app">
      <nav className="nav">
        <a className="brand" href="/" aria-label="صفحه اصلی نجات غذا">
          نجات غذا
        </a>
        <div className="nav-links">
          <a href="#offers">پیشنهادها</a>
          <a href="#how-it-works">چطور کار می‌کند؟</a>
          <button className="login-button" type="button">ورود</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <span className="hero-badge">غذا کمتر هدر برود</span>
          <h1>غذای خوب را<br />نجات بده.</h1>
          <p className="hero-copy">
            غذاهای مازاد کافه‌ها، رستوران‌ها و فست‌فودهای اطراف را با قیمت کمتر
            پیدا کن، رزرو کن و در زمان مشخص تحویل بگیر.
          </p>
          <a className="primary-button" href="#offers">مشاهده پیشنهادهای امروز</a>
        </div>
      </section>

      <section id="offers" className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">تازه و نزدیک</p>
            <h2>پیشنهادهای امروز</h2>
          </div>
          <span className="offer-count">
            {loading ? "در حال دریافت..." : `${availableOffers.length} پیشنهاد فعال`}
          </span>
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
            <h3>پیشنهادها بارگذاری نشدند</h3>
            <p>{error}</p>
            <button className="secondary-button compact" type="button" onClick={() => void loadOffers()}>
              تلاش دوباره
            </button>
          </div>
        )}

        {!loading && !error && availableOffers.length === 0 && (
          <div className="state-card">
            <div className="state-icon">🍽️</div>
            <h3>فعلاً پیشنهادی پیدا نشد</h3>
            <p>پیشنهادهای جدید به‌زودی اینجا نمایش داده می‌شوند.</p>
          </div>
        )}

        {!loading && !error && availableOffers.length > 0 && (
          <div className="offer-grid">
            {availableOffers.map((offer) => (
              <article className="offer-card" key={offer.id}>
                <div className="offer-image">
                  {offer.image_url ? (
                    <img src={offer.image_url} alt={offer.title} />
                  ) : (
                    <span aria-hidden="true">🍱</span>
                  )}
                  {discountPercent(offer) > 0 && (
                    <span className="discount-badge">{discountPercent(offer)}٪ تخفیف</span>
                  )}
                </div>

                <div className="offer-content">
                  <span className="merchant">فروشنده #{offer.merchant_id}</span>
                  <h3>{offer.title}</h3>
                  {offer.description && <p className="description">{offer.description}</p>}

                  <div className="price-row">
                    <div>
                      <strong>{formatToman(offer.sale_price)}</strong>
                      <del>{formatToman(offer.original_price)}</del>
                    </div>
                  </div>

                  <div className="offer-meta">
                    <span>🕐 دریافت تا {formatPickupTime(offer.pickup_end)}</span>
                    <span>📦 {offer.available_quantity} عدد باقی‌مانده</span>
                  </div>

                  <button className="secondary-button" type="button">
                    مشاهده و رزرو
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="how-it-works" className="section steps-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ساده و سریع</p>
            <h2>چطور کار می‌کند؟</h2>
          </div>
        </div>
        <div className="steps">
          <div className="step">
            <span className="step-number">۰۱</span>
            <h3>پیدا کن</h3>
            <p>پیشنهادهای غذایی اطراف خودت را ببین.</p>
          </div>
          <div className="step">
            <span className="step-number">۰۲</span>
            <h3>رزرو کن</h3>
            <p>غذای موردنظرت را با قیمت تخفیف‌خورده سفارش بده.</p>
          </div>
          <div className="step">
            <span className="step-number">۰۳</span>
            <h3>تحویل بگیر</h3>
            <p>در بازه مشخص‌شده به فروشنده مراجعه کن و سفارشت را تحویل بگیر.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
