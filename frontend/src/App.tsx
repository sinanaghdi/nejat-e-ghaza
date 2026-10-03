import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, createOrder, FoodOffer, getCurrentUser, getOffers, loginUser, registerUser, User } from "./lib/api";
import { clearToken, getToken, setToken } from "./lib/auth";
import { formatPickupTime, formatToman } from "./lib/formatters";

type AuthMode = "login" | "register";

type CartItem = {
  offer: FoodOffer;
  quantity: number;
};

function discountPercent(offer: FoodOffer): number {
  if (offer.original_price <= 0) return 0;
  return Math.round((1 - offer.sale_price / offer.original_price) * 100);
}

function App() {
  const [offers, setOffers] = useState<FoodOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<FoodOffer | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  async function loadOffers() {
    setLoading(true);
    setError("");
    try {
      setOffers(await getOffers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffers();
    const token = getToken();
    if (!token) return;

    getCurrentUser(token)
      .then(setUser)
      .catch(() => clearToken());
  }, []);

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    setAuthOpen(true);
    setAuthError("");
    setAuthSuccess("");
  }

  function closeAuth() {
    if (!authLoading) setAuthOpen(false);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");

    try {
      if (authMode === "register") {
        await registerUser({ name, email, password });
        setAuthMode("login");
        setPassword("");
        setAuthSuccess("حساب شما ساخته شد. حالا با ایمیل و رمز عبور وارد شوید.");
      } else {
        const token = await loginUser({ email, password });
        setToken(token.access_token);
        const currentUser = await getCurrentUser(token.access_token);
        setUser(currentUser);
        setAuthOpen(false);
        setName("");
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : "عملیات انجام نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setAuthLoading(false);
    }
  }

  function openOffer(offer: FoodOffer) {
    setSelectedOffer(offer);
    setSelectedQuantity(1);
    setOrderError("");
  }

  function addToCart() {
    if (!selectedOffer) return;
    const quantity = Math.min(selectedQuantity, selectedOffer.available_quantity);
    setCart((current) => {
      const existing = current.find((item) => item.offer.id === selectedOffer.id);
      if (existing) {
        return current.map((item) =>
          item.offer.id === selectedOffer.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, selectedOffer.available_quantity) }
            : item,
        );
      }
      return [...current, { offer: selectedOffer, quantity }];
    });
    setSelectedOffer(null);
    setCartOpen(true);
  }

  function updateCartQuantity(offerId: number, quantity: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.offer.id === offerId
            ? { ...item, quantity: Math.max(0, Math.min(quantity, item.offer.available_quantity)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  async function submitOrder() {
    const token = getToken();
    if (!token || cart.length === 0) {
      openAuth("login");
      return;
    }
    setOrderLoading(true);
    setOrderError("");
    setOrderMessage("");
    try {
      const order = await createOrder(token, cart.map((item) => ({
        food_offer_id: item.offer.id,
        quantity: item.quantity,
      })));
      setCart([]);
      setCartOpen(false);
      setOrderMessage(`سفارش #${order.id} با موفقیت ثبت شد. کد دریافت: ${order.pickup_code}`);
      await loadOffers();
    } catch (err) {
      setOrderError(err instanceof ApiError ? err.message : "ثبت سفارش انجام نشد.");
    } finally {
      setOrderLoading(false);
    }
  }

  function handleLogout() {
    clearToken();
    setUser(null);
  }

  const availableOffers = useMemo(
    () => offers.filter((offer) => offer.is_active && offer.available_quantity > 0),
    [offers],
  );

  return (
    <main className="app">
      <nav className="nav">
        <a className="brand" href="/" aria-label="صفحه اصلی نجات غذا">نجات غذا</a>
        <div className="nav-links">
          <a href="#offers">پیشنهادها</a>
          <a href="#how-it-works">چطور کار می‌کند؟</a>
          {user ? (
            <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>سبد خرید{cart.length > 0 && <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}</button>
            <button className="login-button" type="button" onClick={handleLogout}>خروج</button>
          ) : (
            <button className="cart-button" type="button" onClick={() => setCartOpen(true)}>سبد خرید{cart.length > 0 && <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>}</button>
            <button className="login-button" type="button" onClick={() => openAuth("login")}>ورود</button>
          )}
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
            <button className="secondary-button compact" type="button" onClick={() => void loadOffers()}>تلاش دوباره</button>
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
                  {offer.image_url ? <img src={offer.image_url} alt={offer.title} /> : <span aria-hidden="true">🍱</span>}
                  {discountPercent(offer) > 0 && <span className="discount-badge">{discountPercent(offer)}٪ تخفیف</span>}
                </div>
                <div className="offer-content">
                  <span className="merchant">فروشنده #{offer.merchant_id}</span>
                  <h3>{offer.title}</h3>
                  {offer.description && <p className="description">{offer.description}</p>}
                  <div className="price-row">
                    <div><strong>{formatToman(offer.sale_price)}</strong><del>{formatToman(offer.original_price)}</del></div>
                  </div>
                  <div className="offer-meta">
                    <span>🕐 دریافت تا {formatPickupTime(offer.pickup_end)}</span>
                    <span>📦 {offer.available_quantity} عدد باقی‌مانده</span>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => openAuth("login")}>
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
          <div><p className="eyebrow">ساده و سریع</p><h2>چطور کار می‌کند؟</h2></div>
        </div>
        <div className="steps">
          <div className="step"><span className="step-number">۰۱</span><h3>پیدا کن</h3><p>پیشنهادهای غذایی اطراف خودت را ببین.</p></div>
          <div className="step"><span className="step-number">۰۲</span><h3>رزرو کن</h3><p>غذای موردنظرت را با قیمت تخفیف‌خورده سفارش بده.</p></div>
          <div className="step"><span className="step-number">۰۳</span><h3>تحویل بگیر</h3><p>در بازه مشخص‌شده به فروشنده مراجعه کن و سفارشت را تحویل بگیر.</p></div>
        </div>
      </section>



      {orderMessage && (
        <div className="toast success-toast" role="status">
          <strong>سفارش ثبت شد</strong>
          <span>{orderMessage}</span>
          <button type="button" onClick={() => setOrderMessage("")}>×</button>
        </div>
      )}

      {selectedOffer && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedOffer(null)}>
          <section className="offer-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setSelectedOffer(null)} aria-label="بستن">×</button>
            <div className="detail-image">
              {selectedOffer.image_url ? <img src={selectedOffer.image_url} alt={selectedOffer.title} /> : <span>🍱</span>}
              {discountPercent(selectedOffer) > 0 && <span className="discount-badge">{discountPercent(selectedOffer)}٪ تخفیف</span>}
            </div>
            <div className="offer-detail-content">
              <span className="merchant">فروشنده #{selectedOffer.merchant_id}</span>
              <h2>{selectedOffer.title}</h2>
              {selectedOffer.description && <p className="detail-description">{selectedOffer.description}</p>}
              <div className="detail-price"><strong>{formatToman(selectedOffer.sale_price)}</strong><del>{formatToman(selectedOffer.original_price)}</del></div>
              <div className="detail-meta">
                <span>🕐 دریافت تا {formatPickupTime(selectedOffer.pickup_end)}</span>
                <span>📦 {selectedOffer.available_quantity} عدد موجود</span>
              </div>
              <div className="quantity-control">
                <button type="button" onClick={() => setSelectedQuantity((value) => Math.max(1, value - 1))}>−</button>
                <strong>{selectedQuantity}</strong>
                <button type="button" onClick={() => setSelectedQuantity((value) => Math.min(selectedOffer.available_quantity, value + 1))}>+</button>
              </div>
              <button className="primary-button full-button" type="button" onClick={addToCart}>افزودن به سبد خرید</button>
            </div>
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-header">
              <div><p className="eyebrow">سفارش شما</p><h2>سبد خرید</h2></div>
              <button className="modal-close" type="button" onClick={() => setCartOpen(false)} aria-label="بستن">×</button>
            </div>
            {cart.length === 0 ? (
              <div className="cart-empty"><div className="state-icon">🛒</div><h3>سبد خرید خالی است</h3><p>یک پیشنهاد خوشمزه انتخاب کن.</p></div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.offer.id}>
                      <div className="cart-item-image">{item.offer.image_url ? <img src={item.offer.image_url} alt="" /> : "🍱"}</div>
                      <div className="cart-item-info">
                        <strong>{item.offer.title}</strong>
                        <span>{formatToman(item.offer.sale_price)}</span>
                        <div className="mini-quantity">
                          <button type="button" onClick={() => updateCartQuantity(item.offer.id, item.quantity - 1)}>−</button>
                          <b>{item.quantity}</b>
                          <button type="button" onClick={() => updateCartQuantity(item.offer.id, item.quantity + 1)}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <span>مبلغ کل</span>
                  <strong>{formatToman(cart.reduce((sum, item) => sum + item.offer.sale_price * item.quantity, 0))}</strong>
                </div>
                {orderError && <p className="form-message error-message">{orderError}</p>}
                <button className="primary-button full-button" type="button" disabled={orderLoading} onClick={() => void submitOrder()}>
                  {orderLoading ? "در حال ثبت سفارش..." : "ثبت سفارش"}
                </button>
              </>
            )}
          </aside>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeAuth}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={closeAuth} aria-label="بستن">×</button>
            <div className="auth-header">
              <span className="eyebrow">نجات غذا</span>
              <h2 id="auth-title">{authMode === "login" ? "خوش آمدی" : "ساخت حساب کاربری"}</h2>
              <p>{authMode === "login" ? "برای ادامه وارد حساب خودت شو." : "چند ثانیه بیشتر طول نمی‌کشد."}</p>
            </div>

            <div className="auth-tabs">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); }}>
                ورود
              </button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccess(""); }}>
                ثبت‌نام
              </button>
            </div>

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === "register" && (
                <label>نام و نام خانوادگی<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً سینا احمدی" /></label>
              )}
              <label>ایمیل<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" dir="ltr" /></label>
              <label>رمز عبور<input required type="password" minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="حداقل ۸ کاراکتر" dir="ltr" /></label>

              {authError && <p className="form-message error-message">{authError}</p>}
              {authSuccess && <p className="form-message success-message">{authSuccess}</p>}

              <button className="primary-button auth-submit" type="submit" disabled={authLoading}>
                {authLoading ? "در حال پردازش..." : authMode === "login" ? "ورود به حساب" : "ساخت حساب"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
