import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, createOrder, FoodOffer, getCurrentUser, getOffers, getOrders, loginUser, registerUser, User, Order, MerchantProfile, createMerchantProfile, getMerchantProfile, getMyOffers, createOffer, deactivateOffer, updateOrderStatus, OfferPayload } from "./lib/api";
import { clearToken, getToken, setToken } from "./lib/auth";
import { formatPickupTime, formatToman } from "./lib/formatters";
import { OfferCard } from "./components/OfferCard";
import { QuantityControl } from "./components/QuantityControl";
import { StatusBadge } from "./components/StatusBadge";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";

type AuthMode = "login" | "register";

type CartItem = {
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
    const existingMerchantId = cart[0]?.offer.merchant_id;
    if (existingMerchantId !== undefined && existingMerchantId !== selectedOffer.merchant_id) {
      setOrderError("در هر سفارش فقط می‌توانی از یک فروشنده خرید کنی.");
      return;
    }
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

  return (
    <main className="app">
      <Header
        user={user}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onCart={() => setCartOpen(true)}
        onOrders={() => void openOrders()}
        onMerchant={() => void openMerchantDashboard()}
        onLogin={() => openAuth("login")}
        onLogout={handleLogout}
      />
      <Hero />     <section id="offers" className="section">
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
                  <button className="secondary-button" type="button" onClick={() => openOffer(offer)}>
                    مشاهده و رزرو
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <HowItWorks />
      {merchantOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setMerchantOpen(false)}>
          <section className="merchant-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setMerchantOpen(false)} aria-label="بستن">×</button>
            {merchantLoading ? <div className="orders-loading"><div className="spinner" /> در حال بارگذاری پنل فروشنده...</div> : (
              <>
                <div className="merchant-head"><div><p className="eyebrow">مدیریت کسب‌وکار</p><h2>{merchantProfile?.business_name || "فروشگاه شما"}</h2><p>{merchantProfile?.city || "پروفایل فروشگاه هنوز ساخته نشده است."}</p></div><div>{!merchantProfile ? <button className="primary-button" type="button" onClick={() => setMerchantFormOpen(true)}>ساخت پروفایل</button> : <button className="primary-button" type="button" onClick={() => setOfferFormOpen(true)}>+ پیشنهاد جدید</button>}</div></div>
                {merchantError && <p className="form-message error-message">{merchantError}</p>}
                {!merchantProfile ? <div className="state-card"><div className="state-icon">🏪</div><h3>پروفایل فروشگاه را بسازید</h3><p>بعد از ساخت پروفایل می‌توانید پیشنهاد غذایی ثبت کنید.</p></div> : <>
                  <div className="merchant-stats"><div><strong>{merchantOffers.filter((o) => o.is_active).length}</strong><span>پیشنهاد فعال</span></div><div><strong>{merchantOrders.length}</strong><span>سفارش</span></div><div><strong>{merchantOrders.filter((o) => o.status === "COMPLETED").length}</strong><span>تکمیل‌شده</span></div></div>
                  <div className="merchant-grid"><div><div className="section-heading"><h3>پیشنهادهای من</h3></div><div className="merchant-offers">{merchantOffers.length === 0 ? <p className="muted">هنوز پیشنهادی ثبت نکرده‌اید.</p> : merchantOffers.map((offer) => <div className="merchant-row" key={offer.id}><div><strong>{offer.title}</strong><span>{formatToman(offer.sale_price)} · موجودی {offer.available_quantity}</span></div><span className={offer.is_active ? "active-dot" : "inactive-dot"}>{offer.is_active ? "فعال" : "غیرفعال"}</span>{offer.is_active && <button className="text-button danger" type="button" onClick={() => void removeMerchantOffer(offer.id)}>غیرفعال کردن</button>}</div>)}</div></div>
                  <div><div className="section-heading"><h3>سفارش‌های اخیر</h3></div><div className="merchant-orders">{merchantOrders.length === 0 ? <p className="muted">هنوز سفارشی ندارید.</p> : merchantOrders.slice(0, 8).map((order) => <div className="merchant-order-row" key={order.id}><div><strong>سفارش #{order.id}</strong><span>{formatToman(order.total_amount)} · کد {order.pickup_code}</span></div><select value={order.status} onChange={(e) => void changeMerchantOrderStatus(order.id, e.target.value as Order["status"])}><option value={order.status}>{statusLabel(order.status)}</option>{order.status === "PAID" && <option value="READY_FOR_PICKUP">آماده دریافت</option>}{order.status === "READY_FOR_PICKUP" && <option value="COMPLETED">تکمیل شده</option>}{order.status === "PENDING" && <option value="CANCELLED">لغو شده</option>}</select></div>)}</div></div>
                </>}
              </>
            )}
          </section>
        </div>
      )}

      {merchantFormOpen && <div className="modal-backdrop nested-modal"><form className="form-modal" onSubmit={submitMerchantProfile}><h2>ساخت پروفایل فروشگاه</h2>{(["business_name","description","address","city"] as const).map((key) => <label key={key}>{key === "business_name" ? "نام کسب‌وکار" : key === "description" ? "توضیحات" : key === "address" ? "آدرس" : "شهر"}<input required={key !== "description"} value={merchantForm[key]} onChange={(e) => setMerchantForm({...merchantForm,[key]:e.target.value})} /></label>)}<div className="form-actions"><button className="secondary-button" type="button" onClick={() => setMerchantFormOpen(false)}>انصراف</button><button className="primary-button" type="submit">ذخیره</button></div></form></div>}

      {offerFormOpen && <div className="modal-backdrop nested-modal"><form className="form-modal" onSubmit={submitOffer}><h2>پیشنهاد غذایی جدید</h2><label>عنوان<input required value={offerForm.title} onChange={(e) => setOfferForm({...offerForm,title:e.target.value})} /></label><label>توضیحات<textarea value={offerForm.description} onChange={(e) => setOfferForm({...offerForm,description:e.target.value})} /></label><div className="two-fields"><label>قیمت اصلی<input required type="number" min="1" value={offerForm.original_price} onChange={(e) => setOfferForm({...offerForm,original_price:e.target.value})} /></label><label>قیمت تخفیف<input required type="number" min="1" value={offerForm.sale_price} onChange={(e) => setOfferForm({...offerForm,sale_price:e.target.value})} /></label></div><label>تعداد<input required type="number" min="1" value={offerForm.quantity} onChange={(e) => setOfferForm({...offerForm,quantity:e.target.value})} /></label><div className="two-fields"><label>شروع دریافت<input required type="datetime-local" value={offerForm.pickup_start} onChange={(e) => setOfferForm({...offerForm,pickup_start:e.target.value})} /></label><label>پایان دریافت<input required type="datetime-local" value={offerForm.pickup_end} onChange={(e) => setOfferForm({...offerForm,pickup_end:e.target.value})} /></label></div><label>لینک تصویر اختیاری<input value={offerForm.image_url} onChange={(e) => setOfferForm({...offerForm,image_url:e.target.value})} /></label><div className="form-actions"><button className="secondary-button" type="button" onClick={() => setOfferFormOpen(false)}>انصراف</button><button className="primary-button" type="submit">ثبت پیشنهاد</button></div></form></div>}      {ordersOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setOrdersOpen(false)}>
          <section className="orders-modal" role="dialog" aria-modal="true" aria-labelledby="orders-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" type="button" onClick={() => setOrdersOpen(false)} aria-label="بستن">×</button>
            <div className="orders-header">
              <p className="eyebrow">حساب کاربری</p>
              <h2 id="orders-title">سفارش‌های من</h2>
              <p>سفارش‌ها و کدهای دریافتت را اینجا ببین.</p>
            </div>
            {ordersLoading && <div className="orders-loading"><div className="spinner" /> در حال دریافت سفارش‌ها...</div>}
            {!ordersLoading && ordersError && (
              <div className="state-card error-state"><div className="state-icon">!</div><h3>دریافت سفارش‌ها ناموفق بود</h3><p>{ordersError}</p><button className="secondary-button compact" type="button" onClick={() => void openOrders()}>تلاش دوباره</button></div>
            )}
            {!ordersLoading && !ordersError && orders.length === 0 && (
              <div className="state-card"><div className="state-icon">📦</div><h3>هنوز سفارشی نداری</h3><p>یک پیشنهاد انتخاب کن و اولین غذایت را نجات بده.</p></div>
            )}
            {!ordersLoading && !ordersError && orders.length > 0 && (
              <div className="orders-list">
                {orders.map((order) => (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-top"><div><span className="order-label">سفارش</span><strong>#{order.id}</strong></div><StatusBadge status={order.status} /></div>
                    <div className="order-items">{order.items.map((item) => <div className="order-item-row" key={item.id}><span>غذا #{item.food_offer_id} × {item.quantity}</span><strong>{formatToman(item.subtotal)}</strong></div>)}</div>
                    <div className="order-total"><span>مبلغ کل</span><strong>{formatToman(order.total_amount)}</strong></div>
                    <div className="pickup-code"><span>کد دریافت</span><strong>{order.pickup_code}</strong></div>
                    <time className="order-date" dateTime={order.created_at}>ثبت شده در {formatOrderDate(order.created_at)}</time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

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
