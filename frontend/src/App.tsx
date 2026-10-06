import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ApiError, FoodOffer, getOffer, getOffers, getOrders, Order, MerchantProfile, createMerchantProfile, getMerchantProfile, getMyOffers, createOffer, deactivateOffer, updateOrderStatus, OfferPayload } from "./lib/api";
import { getToken } from "./lib/auth";
import { formatPickupTime, formatToman } from "./lib/formatters";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { useMerchant } from "./hooks/useMerchant";
import { OfferCard } from "./components/OfferCard";
import { QuantityControl } from "./components/QuantityControl";
import { StatusBadge } from "./components/StatusBadge";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { CartDrawer } from "./components/cart/CartDrawer";
import { AuthModal } from "./components/auth/AuthModal";
import { OrdersModal } from "./components/orders/OrdersModal";
import { MerchantDashboard } from "./components/merchant/MerchantDashboard";
import { MerchantPage } from "./pages/MerchantPage";
import { MerchantProfileForm } from "./components/merchant/MerchantProfileForm";
import { OfferForm } from "./components/merchant/OfferForm";
import { OrdersPage } from "./pages/OrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { HomePage } from "./pages/HomePage";
import { OfferDetailPage } from "./pages/OfferDetailPage";
import { PaymentResultPage } from "./pages/PaymentResultPage";
import { MobileBottomNav } from "./components/MobileBottomNav";

function discountPercent(offer: FoodOffer): number {
  if (offer.original_price <= 0) return 0;
  return Math.round((1 - offer.sale_price / offer.original_price) * 100);
}

function App() {
  const location = useLocation();
  const { offerId } = useParams();
  const [offers, setOffers] = useState<FoodOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "discount">("newest");
  const [nearby, setNearby] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "denied" | "ready">("idle");
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const {
    user,
    authMode,
    authOpen,
    authLoading,
    authError,
    authSuccess,
    name,
    email,
    password,
    setName,
    setEmail,
    setPassword,
    openAuth,
    closeAuth,
    handleAuthSubmit,
    handleLogout: logout,
    switchAuthMode,
  } = useAuth();

  const {
    selectedOffer,
    selectedQuantity,
    cart,
    cartOpen,
    orderLoading,
    orderMessage,
    orderError,
    setSelectedOffer,
    setSelectedQuantity,
    setCartOpen,
    setOrderMessage,
    openOffer,
    addToCart,
    updateCartQuantity,
    submitOrder,
  } = useCart({
    openAuth,
    refreshOffers: loadOffers,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const {
    merchantOpen,
    merchantProfile,
    merchantOffers,
    merchantOrders,
    merchantLoading,
    merchantError,
    merchantFormOpen,
    offerFormOpen,
    merchantForm,
    offerForm,
    setMerchantOpen,
    setMerchantFormOpen,
    setOfferFormOpen,
    setMerchantForm,
    setOfferForm,
    openMerchantDashboard,
    removeMerchantOffer,
    changeMerchantOrderStatus,
    submitMerchantProfile,
    submitOffer,
  } = useMerchant({
    isMerchantPage: location.pathname === "/merchant",
    openAuth,
  });

  async function handleLogout() {
    await logout();
    setOrders([]);
    setOrdersOpen(false);
  }

  async function loadOffers() {
    setLoading(true);
    setError("");
    try {
      setOffers(await getOffers({
        query: search,
        city,
        sort: nearby && userCoordinates ? "distance" : sort,
        latitude: nearby && userCoordinates ? userCoordinates.latitude : undefined,
        longitude: nearby && userCoordinates ? userCoordinates.longitude : undefined,
        radius_km: nearby && userCoordinates ? 10 : undefined,
      }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!location.pathname.startsWith("/offers/") || !offerId) return;
    const id = Number(offerId);
    if (!Number.isInteger(id) || id <= 0) return;
    const cached = offers.find((item) => item.id === id);
    if (cached) {
      setSelectedOffer(cached);
      setSelectedQuantity(1);
      return;
    }
    setLoading(true);
    setError("");
    getOffer(id)
      .then((offer) => {
        setOffers((current) => current.some((item) => item.id === offer.id) ? current : [...current, offer]);
        setSelectedOffer(offer);
        setSelectedQuantity(1);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "دریافت این پیشنهاد انجام نشد."))
      .finally(() => setLoading(false));
  }, [location.pathname, offerId, offers]);

  useEffect(() => {
    if (location.pathname !== "/orders") return;
    const token = getToken();
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError("");
    getOrders(token)
      .then(setOrders)
      .catch((err) => setOrdersError(err instanceof ApiError ? err.message : "دریافت سفارش‌ها انجام نشد."))
      .finally(() => setOrdersLoading(false));
  }, [location.pathname]);

  useEffect(() => {
    void loadOffers();
  }, []);

  function enableNearby() {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setNearby(true);
        setLocationStatus("ready");
      },
      () => {
        setNearby(false);
        setLocationStatus("denied");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  }

  async function openOrders() {
    const token = getToken();
    if (!token) {
      openAuth("login");
      return;
    }
    setOrdersOpen(true);
    setOrdersLoading(true);
    setOrdersError("");
    try {
      setOrders(await getOrders(token));
    } catch (err) {
      setOrdersError(err instanceof ApiError ? err.message : "دریافت سفارش‌ها انجام نشد.");
    } finally {
      setOrdersLoading(false);
    }
  }

  const availableOffers = useMemo(
    () => offers.filter((offer) => offer.is_active && offer.available_quantity > 0),
    [offers],
  );

  useEffect(() => {
    if (location.pathname === "/merchant" && !getToken()) {
      openAuth("login");
    }
  }, [location.pathname]);

  useEffect(() => {
    if (nearby && userCoordinates) {
      void loadOffers();
    }
  }, [nearby, userCoordinates]);

  if (location.pathname === "/payment/result") {
    return (
      <>
        <PaymentResultPage
          user={user}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          onCart={() => setCartOpen(true)}
        />
        <CartDrawer
          cart={cart}
          open={cartOpen}
          loading={orderLoading}
          error={orderError}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onSubmit={() => void submitOrder()}
        />
      </>
    );
  }

  if (location.pathname.startsWith("/offers/") && offerId) {
    const id = Number(offerId);
    const detailOffer =
      selectedOffer?.id === id
        ? selectedOffer
        : offers.find((item) => item.id === id) || null;

    return (
      <>
        <OfferDetailPage
          offer={detailOffer}
          loading={loading}
          error={error}
          user={user}
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          quantity={selectedQuantity}
          onQuantityChange={setSelectedQuantity}
          onAddToCart={() => {
            if (detailOffer) addToCart(detailOffer);
          }}
          onBack={() => window.history.back()}
          onCart={() => setCartOpen(true)}
        />
        <CartDrawer
          cart={cart}
          open={cartOpen}
          loading={orderLoading}
          error={orderError}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onSubmit={() => void submitOrder()}
        />
        <AuthModal
          open={authOpen}
          mode={authMode}
          loading={authLoading}
          error={authError}
          success={authSuccess}
          name={name}
          email={email}
          password={password}
          onClose={closeAuth}
          onModeChange={switchAuthMode}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleAuthSubmit}
        />
      </>
    );
  }

  if (location.pathname === "/profile") {
    return (
      <>
        <ProfilePage
          user={user}
          onLogin={() => openAuth("login")}
          onLogout={() => void handleLogout()}
        />
        <MobileBottomNav
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          userRole={user?.role || null}
          onCart={() => setCartOpen(true)}
        />
        <AuthModal
          open={authOpen}
          mode={authMode}
          loading={authLoading}
          error={authError}
          success={authSuccess}
          name={name}
          email={email}
          password={password}
          onClose={closeAuth}
          onModeChange={switchAuthMode}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleAuthSubmit}
        />
      </>
    );
  }

  if (location.pathname === "/orders") {
    return (
      <>
        <OrdersPage
          orders={orders}
          loading={ordersLoading}
          error={ordersError}
          onRetry={() => {
            const token = getToken();
            if (!token) {
              openAuth("login");
              return;
            }

            setOrdersLoading(true);
            setOrdersError("");
            getOrders(token)
              .then(setOrders)
              .catch((err) =>
                setOrdersError(
                  err instanceof ApiError
                    ? err.message
                    : "دریافت سفارش‌ها انجام نشد.",
                ),
              )
              .finally(() => setOrdersLoading(false));
          }}
        />
        <MobileBottomNav
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          userRole={user?.role || null}
          onCart={() => setCartOpen(true)}
        />
        <AuthModal
          open={authOpen}
          mode={authMode}
          loading={authLoading}
          error={authError}
          success={authSuccess}
          name={name}
          email={email}
          password={password}
          onClose={closeAuth}
          onModeChange={switchAuthMode}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleAuthSubmit}
        />
      </>
    );
  }

  if (location.pathname === "/merchant") {
    return (
      <>
        <MerchantPage
          loading={merchantLoading}
          error={merchantError}
          profile={merchantProfile}
          offers={merchantOffers}
          orders={merchantOrders}
          onCreateProfile={() => setMerchantFormOpen(true)}
          onCreateOffer={() => setOfferFormOpen(true)}
          onDeactivate={(id) => void removeMerchantOffer(id)}
          onStatusChange={(id, status) =>
            void changeMerchantOrderStatus(id, status)
          }
        />
        <MobileBottomNav
          cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
          userRole={user?.role || "MERCHANT"}
          onCart={() => setCartOpen(true)}
        />
        <CartDrawer
          cart={cart}
          open={cartOpen}
          loading={orderLoading}
          error={orderError}
          onClose={() => setCartOpen(false)}
          onUpdateQuantity={updateCartQuantity}
          onSubmit={() => void submitOrder()}
        />
        <AuthModal
          open={authOpen}
          mode={authMode}
          loading={authLoading}
          error={authError}
          success={authSuccess}
          name={name}
          email={email}
          password={password}
          onClose={closeAuth}
          onModeChange={switchAuthMode}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleAuthSubmit}
        />
        {merchantFormOpen && (
          <MerchantProfileForm
            value={merchantForm}
            onChange={setMerchantForm}
            onSubmit={submitMerchantProfile}
            onClose={() => setMerchantFormOpen(false)}
          />
        )}
        {offerFormOpen && (
          <OfferForm
            value={offerForm}
            onChange={setOfferForm}
            onSubmit={submitOffer}
            onClose={() => setOfferFormOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <HomePage
        user={user}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        loading={loading}
        error={error}
        availableOffers={availableOffers}
        search={search}
        city={city}
        sort={sort}
        onSearchChange={setSearch}
        onCityChange={setCity}
        onSortChange={setSort}
        onSearch={() => void loadOffers()}
        nearby={nearby}
        locationStatus={locationStatus}
        onNearby={enableNearby}
        onCart={() => setCartOpen(true)}
        onOrders={() => void openOrders()}
        onMerchant={() => void openMerchantDashboard()}
        onLogin={() => openAuth("login")}
        onLogout={handleLogout}
        onRetry={() => void loadOffers()}
        onOffer={openOffer}
      />

      <MerchantDashboard
        open={merchantOpen}
        loading={merchantLoading}
        error={merchantError}
        profile={merchantProfile}
        offers={merchantOffers}
        orders={merchantOrders}
        onClose={() => setMerchantOpen(false)}
        onCreateProfile={() => setMerchantFormOpen(true)}
        onCreateOffer={() => setOfferFormOpen(true)}
        onDeactivate={(id) => void removeMerchantOffer(id)}
        onStatusChange={(id, status) =>
          void changeMerchantOrderStatus(id, status)
        }
      />

      {merchantFormOpen && (
        <MerchantProfileForm
          value={merchantForm}
          onChange={setMerchantForm}
          onSubmit={submitMerchantProfile}
          onClose={() => setMerchantFormOpen(false)}
        />
      )}

      {offerFormOpen && (
        <OfferForm
          value={offerForm}
          onChange={setOfferForm}
          onSubmit={submitOffer}
          onClose={() => setOfferFormOpen(false)}
        />
      )}

      <OrdersModal
        open={ordersOpen}
        orders={orders}
        loading={ordersLoading}
        error={ordersError}
        onClose={() => setOrdersOpen(false)}
        onRetry={() => void openOrders()}
      />

      {orderMessage && (
        <div className="toast success-toast" role="status">
          <strong>سفارش ثبت شد</strong>
          <span>{orderMessage}</span>
          <button type="button" onClick={() => setOrderMessage("")}>
            ×
          </button>
        </div>
      )}

      {selectedOffer && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelectedOffer(null)}
        >
          <section
            className="offer-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              onClick={() => setSelectedOffer(null)}
              aria-label="بستن"
            >
              ×
            </button>
            <div className="detail-image">
              {selectedOffer.image_url ? (
                <img src={selectedOffer.image_url} alt={selectedOffer.title} />
              ) : (
                <span>🍱</span>
              )}
              {discountPercent(selectedOffer) > 0 && (
                <span className="discount-badge">
                  {discountPercent(selectedOffer)}٪ تخفیف
                </span>
              )}
            </div>
            <div className="offer-detail-content">
              <span className="merchant">
                {selectedOffer.merchant.business_name} ·{" "}
                {selectedOffer.merchant.city}
              </span>
              <h2>{selectedOffer.title}</h2>
              {selectedOffer.description && (
                <p className="detail-description">{selectedOffer.description}</p>
              )}
              <div className="detail-price">
                <strong>{formatToman(selectedOffer.sale_price)}</strong>
                <del>{formatToman(selectedOffer.original_price)}</del>
              </div>
              <div className="detail-meta">
                <span>
                  🕐 دریافت تا {formatPickupTime(selectedOffer.pickup_end)}
                </span>
                <span>
                  📦 {selectedOffer.available_quantity} عدد موجود
                </span>
              </div>
              <QuantityControl
                value={selectedQuantity}
                max={selectedOffer.available_quantity}
                onChange={setSelectedQuantity}
              />
              <button
                className="primary-button full-button"
                type="button"
                onClick={() => addToCart()}
              >
                افزودن به سبد خرید
              </button>
            </div>
          </section>
        </div>
      )}

      <CartDrawer
        cart={cart}
        open={cartOpen}
        loading={orderLoading}
        error={orderError}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={updateCartQuantity}
        onSubmit={() => void submitOrder()}
      />

      <AuthModal
        open={authOpen}
        mode={authMode}
        loading={authLoading}
        error={authError}
        success={authSuccess}
        name={name}
        email={email}
        password={password}
        onClose={closeAuth}
        onModeChange={switchAuthMode}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleAuthSubmit}
      />
    </>
  );
}

export default App;
