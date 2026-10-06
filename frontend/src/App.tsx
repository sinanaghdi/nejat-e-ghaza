import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getToken } from "./lib/auth";
import { useAuth } from "./hooks/useAuth";
import { useCart } from "./hooks/useCart";
import { useMerchant } from "./hooks/useMerchant";
import { useMarketplace } from "./hooks/useMarketplace";
import { useOrders } from "./hooks/useOrders";
import { Header } from "./components/Header";
import { CartDrawer } from "./components/cart/CartDrawer";
import { AuthModal } from "./components/auth/AuthModal";
import { OrdersModal } from "./components/orders/OrdersModal";
import { MerchantDashboard } from "./components/merchant/MerchantDashboard";
import { MerchantProfileForm } from "./components/merchant/MerchantProfileForm";
import { OfferForm } from "./components/merchant/OfferForm";
import { HomePage } from "./pages/HomePage";
import { OffersPage } from "./pages/OffersPage";
import { OfferDetailPage } from "./pages/OfferDetailPage";
import { MerchantProfilePage } from "./pages/MerchantProfilePage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MerchantPage } from "./pages/MerchantPage";
import { PaymentResultPage } from "./pages/PaymentResultPage";
import { AuthPage } from "./pages/AuthPage";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { offerId, merchantId, orderId } = useParams();

  const marketplace = useMarketplace();
  const auth = useAuth();
  const cartState = useCart({
    openAuth: auth.openAuth,
    refreshOffers: marketplace.loadOffers,
  });
  const ordersState = useOrders({
    isOrdersPage: location.pathname === "/orders",
    openAuth: auth.openAuth,
  });
  const merchantState = useMerchant({
    isMerchantPage: location.pathname === "/merchant",
    openAuth: auth.openAuth,
  });

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
  } = auth;

  const {
    cart,
    cartOpen,
    orderLoading,
    orderMessage,
    orderError,
    setCartOpen,
    setOrderMessage,
    updateCartQuantity,
    submitOrder,
  } = cartState;

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function handleLogout() {
    await logout();
    ordersState.clearOrders();
  }

  useEffect(() => {
    if (location.pathname.startsWith("/offers/") && offerId) {
      const id = Number(offerId);
      if (Number.isInteger(id) && id > 0) {
        const cached = marketplace.offers.find((item) => item.id === id);
        if (cached) return;
        void marketplace.loadOffer(id);
      }
    }
  }, [location.pathname, offerId]);

  useEffect(() => {
    if (location.pathname === "/merchant" && !getToken()) {
      openAuth("login");
    }
  }, [location.pathname]);

  const header = (
    <Header
      user={user}
      cartCount={cartCount}
      onCart={() => setCartOpen(true)}
      onOrders={() => void ordersState.openOrders()}
      onMerchant={() => void merchantState.openMerchantDashboard()}
      onLogin={() => openAuth("login")}
      onLogout={() => void handleLogout()}
    />
  );

  let page: JSX.Element;

  if (location.pathname === "/login" || location.pathname === "/register") {
    page = (
      <AuthPage
        mode={location.pathname === "/register" ? "register" : "login"}
        user={user}
        loading={authLoading}
        error={authError}
        success={authSuccess}
        name={name}
        email={email}
        password={password}
        onModeChange={switchAuthMode}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleAuthSubmit}
      />
    );
  } else if (location.pathname === "/payment/result") {
    page = (
      <>
        {header}
        <PaymentResultPage user={user} cartCount={cartCount} onCart={() => setCartOpen(true)} />
      </>
    );
  } else if (location.pathname.startsWith("/offers/") && offerId) {
    const id = Number(offerId);
    const detailOffer = marketplace.offers.find((item) => item.id === id) || null;
    page = (
      <>
        {header}
        <OfferDetailPage
          offer={detailOffer}
          loading={marketplace.loading}
          error={marketplace.error}
          user={user}
          cartCount={cartCount}
          quantity={cartState.selectedQuantity}
          onQuantityChange={cartState.setSelectedQuantity}
          onAddToCart={() => {
            if (detailOffer) cartState.addToCart(detailOffer);
          }}
          onBack={() => navigate("/offers")}
          onCart={() => setCartOpen(true)}
        />
      </>
    );
  } else if (location.pathname.startsWith("/merchants/") && merchantId) {
    page = (
      <MerchantProfilePage
        merchantId={Number(merchantId)}
        user={user}
        cartCount={cartCount}
        onOffer={(offer) => navigate(`/offers/${offer.id}`)}
        onCart={() => setCartOpen(true)}
        onOrders={() => navigate("/orders")}
        onMerchant={() => navigate("/merchant")}
        onLogin={() => navigate("/login")}
        onLogout={() => void handleLogout()}
      />
    );
  } else if (location.pathname === "/offers") {
    page = (
      <OffersPage
        user={user}
        cartCount={cartCount}
        loading={marketplace.loading}
        error={marketplace.error}
        offers={marketplace.availableOffers}
        search={marketplace.search}
        city={marketplace.city}
        sort={marketplace.sort}
        nearby={marketplace.nearby}
        locationStatus={marketplace.locationStatus}
        onSearchChange={marketplace.setSearch}
        onCityChange={marketplace.setCity}
        onSortChange={marketplace.setSort}
        onSearch={() => void marketplace.loadOffers()}
        onNearby={marketplace.enableNearby}
        onRetry={() => void marketplace.loadOffers()}
        onOffer={(offer) => navigate(`/offers/${offer.id}`)}
        onCart={() => setCartOpen(true)}
        onOrders={() => navigate("/orders")}
        onMerchant={() => navigate("/merchant")}
        onLogin={() => navigate("/login")}
        onLogout={() => void handleLogout()}
      />
    );
  } else if (location.pathname === "/cart") {
    page = (
      <CartPage
        user={user}
        cartCount={cartCount}
        cart={cart}
        onUpdateQuantity={updateCartQuantity}
        onOrders={() => navigate("/orders")}
        onMerchant={() => navigate("/merchant")}
        onLogin={() => navigate("/login")}
        onLogout={() => void handleLogout()}
      />
    );
  } else if (location.pathname === "/checkout") {
    page = (
      <CheckoutPage
        user={user}
        cartCount={cartCount}
        cart={cart}
        loading={orderLoading}
        error={orderError}
        message={orderMessage}
        onSubmit={() => void submitOrder()}
        onOrders={() => navigate("/orders")}
        onMerchant={() => navigate("/merchant")}
        onLogin={() => openAuth("login")}
        onLogout={() => void handleLogout()}
      />
    );
  } else if (location.pathname.startsWith("/orders/") && orderId) {
    page = (
      <OrderDetailPage
        orderId={Number(orderId)}
        user={user}
        cartCount={cartCount}
        onCart={() => setCartOpen(true)}
        onOrders={() => navigate("/orders")}
        onMerchant={() => navigate("/merchant")}
        onLogin={() => navigate("/login")}
        onLogout={() => void handleLogout()}
      />
    );
  } else if (location.pathname === "/orders") {
    page = (
      <>
        {header}
        <OrdersPage
          orders={ordersState.orders}
          loading={ordersState.ordersLoading}
          error={ordersState.ordersError}
          onRetry={() => void ordersState.loadOrders()}
        />
      </>
    );
  } else if (location.pathname === "/profile") {
    page = (
      <>
        {header}
        <ProfilePage
          user={user}
          onLogin={() => navigate("/login")}
          onLogout={() => void handleLogout()}
        />
      </>
    );
  } else if (location.pathname === "/merchant") {
    page = (
      <>
        {header}
        <MerchantPage
          loading={merchantState.merchantLoading}
          error={merchantState.merchantError}
          profile={merchantState.merchantProfile}
          offers={merchantState.merchantOffers}
          orders={merchantState.merchantOrders}
          onCreateProfile={() => merchantState.setMerchantFormOpen(true)}
          onCreateOffer={() => merchantState.setOfferFormOpen(true)}
          onDeactivate={(id) => void merchantState.removeMerchantOffer(id)}
          onStatusChange={(id, status) => void merchantState.changeMerchantOrderStatus(id, status)}
        />
      </>
    );
  } else {
    page = (
      <HomePage
        user={user}
        cartCount={cartCount}
        loading={marketplace.loading}
        error={marketplace.error}
        featuredOffers={marketplace.availableOffers.slice(0, 3)}
        onCart={() => setCartOpen(true)}
        onOrders={() => navigate("/orders")}
        onMerchant={() => navigate("/merchant")}
        onLogin={() => navigate("/login")}
        onLogout={() => void handleLogout()}
        onRetry={() => void marketplace.loadOffers()}
        onOffer={(offer) => navigate(`/offers/${offer.id}`)}
      />
    );
  }

  return (
    <>
      {page}

      {location.pathname === "/" && (
        <>
          <MerchantDashboard
            open={merchantState.merchantOpen}
            loading={merchantState.merchantLoading}
            error={merchantState.merchantError}
            profile={merchantState.merchantProfile}
            offers={merchantState.merchantOffers}
            orders={merchantState.merchantOrders}
            onClose={() => merchantState.setMerchantOpen(false)}
            onCreateProfile={() => merchantState.setMerchantFormOpen(true)}
            onCreateOffer={() => merchantState.setOfferFormOpen(true)}
            onDeactivate={(id) => void merchantState.removeMerchantOffer(id)}
            onStatusChange={(id, status) => void merchantState.changeMerchantOrderStatus(id, status)}
          />

          {merchantState.merchantFormOpen && (
            <MerchantProfileForm
              value={merchantState.merchantForm}
              onChange={merchantState.setMerchantForm}
              onSubmit={merchantState.submitMerchantProfile}
              onClose={() => merchantState.setMerchantFormOpen(false)}
            />
          )}

          {merchantState.offerFormOpen && (
            <OfferForm
              value={merchantState.offerForm}
              onChange={merchantState.setOfferForm}
              onSubmit={merchantState.submitOffer}
              onClose={() => merchantState.setOfferFormOpen(false)}
            />
          )}

          <OrdersModal
            open={ordersState.ordersOpen}
            orders={ordersState.orders}
            loading={ordersState.ordersLoading}
            error={ordersState.ordersError}
            onClose={() => ordersState.setOrdersOpen(false)}
            onRetry={() => void ordersState.openOrders()}
          />
        </>
      )}

      {orderMessage && (
        <div className="toast success-toast" role="status">
          <strong>سفارش ثبت شد</strong>
          <span>{orderMessage}</span>
          <button type="button" onClick={() => setOrderMessage("")}>×</button>
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
        open={authOpen && location.pathname !== "/login" && location.pathname !== "/register"}
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
