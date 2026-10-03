import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ApiError, createOrder, createPayment, FoodOffer, getCurrentUser, getOffer, getOffers, getOrders, loginUser, registerUser, User, Order, MerchantProfile, createMerchantProfile, getMerchantProfile, getMyOffers, createOffer, deactivateOffer, updateOrderStatus, OfferPayload } from "./lib/api";
import { clearToken, getToken, setToken } from "./lib/auth";
import { formatPickupTime, formatToman } from "./lib/formatters";
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
import { MerchantProfileForm } from "./components/merchant/MerchantProfileForm";
import { OfferForm } from "./components/merchant/OfferForm";
import { OrdersPage } from "./pages/OrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { HomePage } from "./pages/HomePage";
import { OfferDetailPage } from "./pages/OfferDetailPage";
import { PaymentResultPage } from "./pages/PaymentResultPage";
import { MobileBottomNav } from "./components/MobileBottomNav";

type AuthMode = "login" | "register";

type LegacyCartItem = {
  offer: FoodOffer;
  quantity: number;
};

function statusLabel(status: Order["status"]): string {
  const labels: Record<Order["status"], string> = {
    PENDING: "در انتظار پرداخت",
    PAID: "پرداخت شده",
    READY_FOR_PICKUP: "آماده دریافت",
    COMPLETED: "تکمیل شده",
    CANCELLED: "لغو شده",
    EXPIRED: "منقضی شده",
  };
  return labels[status];
}

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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
  const [cart, setCart] = useState<LegacyCartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
  const [merchantOffers, setMerchantOffers] = useState<FoodOffer[]>([]);
  const [merchantOrders, setMerchantOrders] = useState<Order[]>([]);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantError, setMerchantError] = useState("");
  const [merchantFormOpen, setMerchantFormOpen] = useState(false);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [merchantForm, setMerchantForm] = useState({ business_name: "", description: "", address: "", city: "" });
  const [offerForm, setOfferForm] = useState({ title: "", description: "", original_price: "", sale_price: "", quantity: "1", pickup_start: "", pickup_end: "", image_url: "" });

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
    if (location.pathname !== "/merchant") return;
    const token = getToken();
    if (!token) return;
    setMerchantLoading(true);
    setMerchantError("");
    Promise.all([getMerchantProfile(token), getMyOffers(token), getOrders(token)])
      .then(([profile, offers, orders]) => {
        setMerchantProfile(profile);
        setMerchantOffers(offers);
        setMerchantOrders(orders);
      })
      .catch((err) => setMerchantError(err instanceof ApiError ? err.message : "دریافت اطلاعات فروشگاه انجام نشد."))
      .finally(() => setMerchantLoading(false));
  }, [location.pathname]);

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

  function addToCart(offerOverride?: FoodOffer) {
    const offerToAdd = offerOverride || selectedOffer;
    if (!offerToAdd) return;
    const existingMerchantId = cart[0]?.offer.merchant_id;
    if (existingMerchantId !== undefined && existingMerchantId !== offerToAdd.merchant_id) {
      setOrderError("در هر سفارش فقط می‌توانی از یک فروشنده خرید کنی.");
      return;
    }
    const quantity = Math.min(selectedQuantity, offerToAdd.available_quantity);
    setCart((current) => {
      const existing = current.find((item) => item.offer.id === offerToAdd.id);
      if (existing) {
        return current.map((item) =>
          item.offer.id === offerToAdd.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, offerToAdd.available_quantity) }
            : item,
        );
      }
      return [...current, { offer: offerToAdd, quantity }];
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
      const payment = await createPayment(token, order.id);
      setCart([]);
      setCartOpen(false);
      await loadOffers();
      if (payment.payment.provider === "zarinpal") {
        window.location.assign(payment.checkout_url);
        return;
      }
      setOrderMessage(`سفارش #${order.id} ثبت شد. درگاه آزمایشی فعال است؛ پرداخت واقعی هنوز انجام نشده است.`);
    } catch (err) {
      setOrderError(err instanceof ApiError ? err.message : "ثبت سفارش انجام نشد.");
    } finally {
      setOrderLoading(false);
    }
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

  async function openMerchantDashboard() {
    const token = getToken();
    if (!token) { openAuth("login"); return; }
    setMerchantOpen(true); setMerchantLoading(true); setMerchantError("");
    try {
      const [profile, offers, orders] = await Promise.all([getMerchantProfile(token), getMyOffers(token), getOrders(token)]);
      setMerchantProfile(profile); setMerchantOffers(offers); setMerchantOrders(orders);
    } catch (err) { setMerchantError(err instanceof ApiError ? err.message : "دریافت اطلاعات فروشگاه انجام نشد."); }
    finally { setMerchantLoading(false); }
  }

  async function removeMerchantOffer(offerId: number) {
    const token = getToken(); if (!token) return;
    try { const updated = await deactivateOffer(token, offerId); setMerchantOffers((items) => items.map((item) => item.id === offerId ? updated : item)); }
    catch (err) { setMerchantError(err instanceof ApiError ? err.message : "غیرفعال کردن پیشنهاد انجام نشد."); }
  }

  async function changeMerchantOrderStatus(orderId: number, status: Order["status"]) {
    const token = getToken(); if (!token) return;
    try { const updated = await updateOrderStatus(token, orderId, status); setMerchantOrders((items) => items.map((item) => item.id === orderId ? updated : item)); }
    catch (err) { setMerchantError(err instanceof ApiError ? err.message : "تغییر وضعیت سفارش انجام نشد."); }
  }

  async function submitMerchantProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const token = getToken(); if (!token) return;
    try { const profile = await createMerchantProfile(token, merchantForm); setMerchantProfile(profile); setMerchantFormOpen(false); }
    catch (err) { setMerchantError(err instanceof ApiError ? err.message : "ساخت پروفایل فروشگاه انجام نشد."); }
  }

  async function submitOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const token = getToken(); if (!token) return;
    try {
      const payload: OfferPayload = { title: offerForm.title, description: offerForm.description || undefined, original_price: Number(offerForm.original_price), sale_price: Number(offerForm.sale_price), quantity: Number(offerForm.quantity), pickup_start: new Date(offerForm.pickup_start).toISOString(), pickup_end: new Date(offerForm.pickup_end).toISOString(), image_url: offerForm.image_url || undefined };
      const offer = await createOffer(token, payload); setMerchantOffers((items) => [offer, ...items]); setOfferFormOpen(false);
    } catch (err) { setMerchantError(err instanceof ApiError ? err.message : "ایجاد پیشنهاد انجام نشد."); }
  }
  function handleLogout() {
    clearToken();
    setUser(null);
    setOrders([]);
    setOrdersOpen(false);
  }

  const availableOffers = useMemo(
    () => offers.filter((offer) => offer.is_active && offer.available_quantity > 0),
    [offers],
  );

  if (location.pathname === "/payment/result") {
    return (
      <>
        <PaymentResultPage user={user} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onCart={() => setCartOpen(true)} />
        <CartDrawer cart={cart} open={cartOpen} loading={orderLoading} error={orderError} onClose={() => setCartOpen(false)} onUpdateQuantity={updateCartQuantity} onSubmit={() => void submitOrder()} />
      </>
    );
  }

  if (location.pathname.startsWith("/offers/") && offerId) {
    const id = Number(offerId);
    const detailOffer = selectedOffer?.id === id ? selectedOffer : offers.find((item) => item.id === id) || null;
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
          onAddToCart={() => { if (detailOffer) addToCart(detailOffer); }}
          onBack={() => window.history.back()}
          onCart={() => setCartOpen(true)}
        />
        <CartDrawer cart={cart} open={cartOpen} loading={orderLoading} error={orderError} onClose={() => setCartOpen(false)} onUpdateQuantity={updateCartQuantity} onSubmit={() => void submitOrder()} />
        <AuthModal open={authOpen} mode={authMode} loading={authLoading} error={authError} success={authSuccess} name={name} email={email} password={password} onClose={closeAuth} onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); setAuthSuccess(""); }} onNameChange={setName} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={handleAuthSubmit} />
      </>
    );
  }

  if (location.pathname === "/orders") {
    if (location.pathname === "/profile") {
    return (
      <>
        <ProfilePage
          user={user}
          onLogin={() => openAuth("login")}
          onLogout={() => {
            clearToken();
            setUser(null);
          }}
        />
        <MobileBottomNav cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} userRole={user?.role || null} onCart={() => setCartOpen(true)} />
        <AuthModal open={authOpen} mode={authMode} loading={authLoading} error={authError} success={authSuccess} name={name} email={email} password={password} onClose={closeAuth} onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); setAuthSuccess(""); }} onNameChange={setName} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={handleAuthSubmit} />
      </>
    );
  }

  if (location.pathname === "/merchant") {
    const token = getToken();
    if (!token && !authOpen) {
      openAuth("login");
    }
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
          onStatusChange={(id, status) => void changeMerchantOrderStatus(id, status)}
        />
        <MobileBottomNav cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} userRole={user?.role || "MERCHANT"} onCart={() => setCartOpen(true)} />
        <CartDrawer cart={cart} open={cartOpen} loading={orderLoading} error={orderError} onClose={() => setCartOpen(false)} onUpdateQuantity={updateCartQuantity} onSubmit={() => void submitOrder()} />
        <AuthModal open={authOpen} mode={authMode} loading={authLoading} error={authError} success={authSuccess} name={name} email={email} password={password} onClose={closeAuth} onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); setAuthSuccess(""); }} onNameChange={setName} onEmailChange={setEmail} onPasswordChange={setPassword} onSubmit={handleAuthSubmit} />
        {merchantFormOpen && <MerchantProfileForm value={merchantForm} onChange={setMerchantForm} onSubmit={submitMerchantProfile} onClose={() => setMerchantFormOpen(false)} />}
        {offerFormOpen && <OfferForm value={offerForm} onChange={setOfferForm} onSubmit={submitOffer} onClose={() => setOfferFormOpen(false)} />}
      </>
    );
  }

  return (
      <>
        <OrdersPage
          orders={orders}
          loading={ordersLoading}
          error={ordersError}
          onRetry={() => {
            const token = getToken();
            if (!token) { openAuth("login"); return; }
            setOrdersLoading(true);
            setOrdersError("");
            getOrders(token)
              .then(setOrders)
              .catch((err) => setOrdersError(err instanceof ApiError ? err.message : "دریافت سفارش‌ها انجام نشد."))
              .finally(() => setOrdersLoading(false));
          }}
        />
        <MobileBottomNav cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} userRole={user?.role || null} onCart={() => setCartOpen(true)} />
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
          onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); setAuthSuccess(""); }}
          onNameChange={setName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSubmit={handleAuthSubmit}
        />
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
        onStatusChange={(id, status) => void changeMerchantOrderStatus(id, status)}
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
              <QuantityControl value={selectedQuantity} max={selectedOffer.available_quantity} onChange={setSelectedQuantity} />
              <button className="primary-button full-button" type="button" onClick={addToCart}>افزودن به سبد خرید</button>
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
        onModeChange={(mode) => { setAuthMode(mode); setAuthError(""); setAuthSuccess(""); }}
        onNameChange={setName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleAuthSubmit}
      />
    </>
  );}

export default App;
