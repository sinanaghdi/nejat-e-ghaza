import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
  AdminMerchant,
  AdminModerationOffer,
  MerchantVerificationStatus,
  OfferModerationStatus,
  Order,
  User,
} from "../lib/api";
import {
  getAdminMerchants,
  getAdminOrders,
  getAdminPendingOffers,
  getAdminUsers,
  moderateAdminOffer,
  updateMerchantVerification,
  updateOrderStatus,
  updateUserRole,
} from "../lib/api";
import { getToken } from "../lib/auth";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";

type Props = {
  user: User | null;
  cartCount: number;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

const roleLabels: Record<User["role"], string> = {
  CUSTOMER: "مشتری",
  MERCHANT: "فروشنده",
  ADMIN: "مدیر",
};

const verificationLabels: Record<MerchantVerificationStatus, string> = {
  PENDING: "در انتظار بررسی",
  VERIFIED: "تأییدشده",
  SUSPENDED: "تعلیق‌شده",
};

const moderationLabels: Record<OfferModerationStatus, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
};

export function AdminPage(props: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<AdminMerchant[]>([]);
  const [pendingOffers, setPendingOffers] = useState<AdminModerationOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!props.user || props.user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([
      getAdminUsers(getToken()),
      getAdminOrders(getToken()),
      getAdminMerchants(getToken()),
      getAdminPendingOffers(getToken()),
    ])
      .then(([userItems, orderItems, merchantItems, offerItems]) => {
        if (!active) return;
        setUsers(userItems);
        setOrders(orderItems);
        setMerchants(merchantItems);
        setPendingOffers(offerItems);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "اطلاعات مدیریت دریافت نشد.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [props.user]);

  async function changeRole(id: number, role: User["role"]) {
    try {
      const updated = await updateUserRole(getToken(), id, role);
      setUsers((items) => items.map((item) => item.id === id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تغییر نقش انجام نشد.");
    }
  }

  async function changeOrderStatus(id: number, status: Order["status"]) {
    try {
      const updated = await updateOrderStatus(getToken(), id, status);
      setOrders((items) => items.map((item) => item.id === id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تغییر وضعیت سفارش انجام نشد.");
    }
  }

  async function changeMerchantStatus(merchant: AdminMerchant, status: MerchantVerificationStatus) {
    let reason: string | undefined;
    if (status === "SUSPENDED") {
      reason = window.prompt("علت تعلیق این فروشگاه را وارد کنید:", merchant.verification_reason || "")?.trim();
      if (!reason) return;
    }
    try {
      const updated = await updateMerchantVerification(getToken(), merchant.id, status, reason);
      setMerchants((items) => items.map((item) => item.id === merchant.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تغییر وضعیت فروشگاه انجام نشد.");
    }
  }

  async function moderateOffer(offer: AdminModerationOffer, status: Exclude<OfferModerationStatus, "PENDING">) {
    let reason: string | undefined;
    if (status === "REJECTED") {
      reason = window.prompt("علت رد این پیشنهاد را وارد کنید:", offer.moderation_reason || "")?.trim();
      if (!reason) return;
    }
    try {
      await moderateAdminOffer(getToken(), offer.id, status, reason);
      setPendingOffers((items) => items.filter((item) => item.id !== offer.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "بررسی پیشنهاد انجام نشد.");
    }
  }

  if (!props.user) {
    return (
      <>
        <Header user={null} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
        <main className="page-shell"><div className="state-card"><div className="state-icon">🔐</div><h3>ابتدا وارد شو</h3><p>این بخش مخصوص مدیر سیستم است.</p><button className="primary-button" onClick={props.onLogin}>ورود</button></div></main>
      </>
    );
  }

  if (props.user.role !== "ADMIN") {
    return (
      <>
        <Header user={props.user} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
        <main className="page-shell"><div className="state-card error-state"><div className="state-icon">403</div><h3>دسترسی مدیر لازم است</h3><p>با حساب مدیر دمو یا نقش ADMIN وارد شوید.</p><Link className="primary-button" to="/profile">بازگشت به پروفایل</Link></div></main>
      </>
    );
  }

  const completedOrders = orders.filter((order) => order.status === "COMPLETED");
  const activeOrders = orders.filter((order) => ["PAID", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status));
  const rescuedMeals = completedOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const grossSales = activeOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const cancellationRate = orders.length
    ? Math.round((orders.filter((order) => order.status === "CANCELLED").length / orders.length) * 100)
    : 0;

  return (
    <main className="app">
      <Header user={props.user} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
      <section className="page-shell admin-page">
        <header className="page-header">
          <p className="eyebrow">مدیریت سیستم</p>
          <h1>داشبورد مدیر</h1>
          <p>کاربران، فروشندگان، پیشنهادها و سفارش‌ها را از یک نقطه کنترل کن.</p>
        </header>

        <section className="admin-summary-grid">
          <div><strong>{users.length}</strong><span>کاربر</span></div>
          <div><strong>{merchants.filter((item) => item.verification_status === "VERIFIED").length}</strong><span>فروشنده تأییدشده</span></div>
          <div><strong>{merchants.filter((item) => item.verification_status === "PENDING").length}</strong><span>فروشنده در انتظار</span></div>
          <div><strong>{pendingOffers.length}</strong><span>پیشنهاد در انتظار</span></div>
          <div><strong>{orders.length}</strong><span>سفارش</span></div>
          <div><strong>{completedOrders.length}</strong><span>تکمیل‌شده</span></div>
          <div><strong>{rescuedMeals}</strong><span>غذای نجات‌یافته</span></div>
          <div><strong>{cancellationRate}٪</strong><span>نرخ لغو</span></div>
          <div><strong>{grossSales.toLocaleString("fa-IR")}</strong><span>فروش ثبت‌شده (تومان)</span></div>
        </section>

        {loading && <div className="state-card"><div className="spinner" />در حال دریافت اطلاعات مدیریت...</div>}
        {!loading && error && <div className="state-card error-state"><div className="state-icon">!</div><h3>دریافت اطلاعات ناموفق بود</h3><p>{error}</p></div>}

        {!loading && !error && (
          <>
            <section className="admin-users-card">
              <div className="section-heading">
                <div><p className="eyebrow">Moderation</p><h2>فروشندگان</h2></div>
                <span className="offer-count">{merchants.length} فروشگاه</span>
              </div>
              <div className="admin-user-list">
                {merchants.map((item) => (
                  <article className="admin-user-row" key={item.id}>
                    <div className="admin-user-avatar">🏪</div>
                    <div className="admin-user-info">
                      <strong>{item.business_name}</strong>
                      <span>{item.city} · {item.address}</span>
                    </div>
                    <span className={`moderation-status moderation-${item.verification_status.toLowerCase()}`}>{verificationLabels[item.verification_status]}</span>
                    <select value={item.verification_status} onChange={(event) => void changeMerchantStatus(item, event.target.value as MerchantVerificationStatus)}>
                      <option value="PENDING">در انتظار</option>
                      <option value="VERIFIED">تأیید</option>
                      <option value="SUSPENDED">تعلیق</option>
                    </select>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-users-card">
              <div className="section-heading">
                <div><p className="eyebrow">Queue</p><h2>پیشنهادهای در انتظار بررسی</h2></div>
                <span className="offer-count">{pendingOffers.length} مورد</span>
              </div>
              <div className="admin-user-list">
                {pendingOffers.length === 0 ? (
                  <p className="muted">صف بررسی خالی است.</p>
                ) : pendingOffers.map((offer) => (
                  <article className="admin-user-row" key={offer.id}>
                    <div className="admin-user-avatar">🍱</div>
                    <div className="admin-user-info">
                      <strong>{offer.title}</strong>
                      <span>{offer.merchant.business_name} · {offer.sale_price.toLocaleString("fa-IR")} تومان · موجودی {offer.available_quantity}</span>
                    </div>
                    <span className="moderation-status moderation-pending">{moderationLabels[offer.moderation_status]}</span>
                    <div className="admin-moderation-actions">
                      <button className="secondary-button" type="button" onClick={() => void moderateOffer(offer, "APPROVED")}>تأیید</button>
                      <button className="danger-button" type="button" onClick={() => void moderateOffer(offer, "REJECTED")}>رد</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-users-card">
              <div className="section-heading">
                <div><p className="eyebrow">Users</p><h2>کاربران</h2></div>
                <span className="offer-count">{users.length} حساب</span>
              </div>
              <div className="admin-user-list">
                {users.map((item) => (
                  <article className="admin-user-row" key={item.id}>
                    <div className="admin-user-avatar">{item.name.trim().charAt(0) || "ن"}</div>
                    <div className="admin-user-info">
                      <strong>{item.name}</strong>
                      <span dir="ltr">{item.email}</span>
                    </div>
                    <select value={item.role} onChange={(event) => void changeRole(item.id, event.target.value as User["role"])}>
                      {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-users-card admin-orders-card">
              <div className="section-heading">
                <div><p className="eyebrow">Orders</p><h2>سفارش‌ها</h2></div>
                <span className="offer-count">{orders.length} سفارش</span>
              </div>
              <div className="admin-order-list">
                {orders.length === 0 ? <p className="muted">هنوز سفارشی ثبت نشده است.</p> : orders.slice(0, 50).map((order) => (
                  <article className="admin-user-row" key={order.id}>
                    <div className="admin-user-info">
                      <strong>سفارش #{order.id}</strong>
                      <span>{order.items.length} قلم · مبلغ {order.total_amount.toLocaleString("fa-IR")} تومان</span>
                    </div>
                    <select value={order.status} onChange={(event) => void changeOrderStatus(order.id, event.target.value as Order["status"])}>
                      <option value={order.status}>{order.status}</option>
                      {order.status === "PENDING" && <><option value="CANCELLED">CANCELLED</option><option value="EXPIRED">EXPIRED</option></>}
                      {order.status === "PAID" && <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>}
                      {order.status === "READY_FOR_PICKUP" && <option value="EXPIRED">EXPIRED</option>}
                    </select>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </section>
      <MobileBottomNav cartCount={props.cartCount} userRole={props.user?.role || null} onCart={props.onCart} />
    </main>
  );
}
