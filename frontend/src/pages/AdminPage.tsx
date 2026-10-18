import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
  AdminMerchant,
  AdminModerationOffer,
  MerchantVerificationStatus,
  OfferModerationStatus,
  MerchantSettlement,
  Order,
  PaymentResponse,
  User,
} from "../lib/api";
import {
  getAdminMerchants,
  getAdminOrders,
  getAdminPendingOffers,
  getAdminSettlements,
  getAdminRefundRequiredPayments,
  getAdminUsers,
  markRefundCompleted,
  markSettlementPaid,
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
  const [settlements, setSettlements] = useState<MerchantSettlement[]>([]);
  const [refundPayments, setRefundPayments] = useState<PaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [region, setRegion] = useState<"all" | "بابلسر" | "آمل">("all");

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
      getAdminSettlements(getToken()),
      getAdminRefundRequiredPayments(getToken()),
    ])
      .then(([userItems, orderItems, merchantItems, offerItems, settlementItems, refundItems]) => {
        if (!active) return;
        setUsers(userItems);
        setOrders(orderItems);
        setMerchants(merchantItems);
        setPendingOffers(offerItems);
        setSettlements(settlementItems);
        setRefundPayments(refundItems);
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

  async function recordSettlementPaid(settlement: MerchantSettlement) {
    const payoutReference = window.prompt(
      `مرجع انتقال بانکی برای تسویه سفارش #${settlement.order_id}:`,
      settlement.payout_reference || "",
    )?.trim();
    if (!payoutReference) return;
    try {
      const updated = await markSettlementPaid(getToken(), settlement.id, payoutReference);
      setSettlements((items) => items.map((item) => item.id === settlement.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت تسویه انجام نشد.");
    }
  }


  async function recordRefundCompleted(payment: PaymentResponse) {
    const confirmed = window.confirm(
      `پیش از ثبت، مطمئن شوید بازپرداخت سفارش #${payment.order_id} واقعاً از طریق درگاه یا بانک انجام شده است. این دکمه پولی انتقال نمی‌دهد. ادامه می‌دهید؟`,
    );
    if (!confirmed) return;
    const refundReference = window.prompt(
      `مرجع بازپرداخت واقعی برای سفارش #${payment.order_id}:`,
      "",
    )?.trim();
    if (!refundReference) return;
    try {
      const updated = await markRefundCompleted(getToken(), payment.id, refundReference);
      setRefundPayments((items) => items.filter((item) => item.id !== updated.id || updated.status === "REFUND_REQUIRED"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت بازپرداخت انجام نشد.");
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
        <main className="page-shell"><div className="state-card error-state"><div className="state-icon">403</div><h3>دسترسی مدیر لازم است</h3><p>برای ادامه با حساب مدیر وارد شوید.</p><Link className="primary-button" to="/profile">بازگشت به پروفایل</Link></div></main>
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

  const matchesRegion = (city?: string | null) => region === "all" || city === region;
  const visibleMerchants = merchants.filter((item) => matchesRegion(item.city));
  const visibleOffers = pendingOffers.filter((item) => matchesRegion(item.merchant.city));
  const visibleOrders = orders.filter((order) => region === "all" || matchesRegion(merchants.find((item) => item.id === order.merchant_id)?.city));
  const visibleSettlements = settlements.filter((item) => region === "all" || matchesRegion(merchants.find((merchant) => merchant.id === item.merchant_id)?.city));
  const visibleRefundPayments = refundPayments.filter((payment) => {
    if (region === "all") return true;
    const order = orders.find((item) => item.id === payment.order_id);
    return matchesRegion(merchants.find((merchant) => merchant.id === order?.merchant_id)?.city);
  });
  const visibleCompletedOrders = visibleOrders.filter((order) => order.status === "COMPLETED");
  const visibleRescuedMeals = visibleCompletedOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0,
  );
  const visibleGrossSales = visibleOrders.filter((order) => ["PAID", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status)).reduce((sum, order) => sum + order.total_amount, 0);
  const visibleCancellationRate = visibleOrders.length
    ? Math.round((visibleOrders.filter((order) => order.status === "CANCELLED").length / visibleOrders.length) * 100)
    : 0;

  function exportSettlementCsv() {
    const rows = [
      ["شناسه سفارش", "شناسه فروشگاه", "مبلغ ناخالص (تومان)", "کمیسیون (تومان)", "مبلغ خالص (تومان)", "وضعیت", "مرجع انتقال"],
      ...visibleSettlements.map((item) => [
        item.order_id, item.merchant_id, item.gross_amount, item.commission_amount, item.net_amount,
        item.status === "PAID" ? "ثبت تسویه" : "در انتظار", item.payout_reference || "",
      ]),
    ];
    const csv = "\uFEFF" + rows.map((row) => row.map((cell) => '"' + String(cell ?? "").replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nejat-e-ghaza-settlements.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app admin-console">
      <aside className="dashboard-sidebar admin-sidebar">
        <Link className="dashboard-brand" to="/">
          <span className="dashboard-brand-mark" aria-hidden="true">ن</span>
          <span><strong>مرکز مدیریت</strong><small>پلتفرم نجات غذا</small></span>
        </Link>
        <div className="sidebar-caption">پایش و عملیات</div>
        <nav className="dashboard-side-nav" aria-label="ناوبری پنل مدیریت">
          <a className="active" href="#admin-overview"><span aria-hidden="true">▦</span> نمای کلی شبکه</a>
          <a href="#admin-merchants"><span aria-hidden="true">♙</span> بررسی فروشندگان</a>
          <a href="#admin-offers"><span aria-hidden="true">◈</span> تأیید بسته‌ها</a>
          <a href="#admin-orders"><span aria-hidden="true">▤</span> پایش سفارش‌ها</a>
          <a href="#admin-settlements"><span aria-hidden="true">◇</span> تسویه‌حساب‌ها</a>
          <a href="#admin-refunds"><span aria-hidden="true">↩</span> پیگیری بازپرداخت‌ها</a>
          <a href="#admin-users"><span aria-hidden="true">◎</span> مدیریت کاربران</a>
        </nav>
        <div className="sidebar-help-card"><span aria-hidden="true">ⓘ</span><strong>پایش دقیق، تصمیم مستند</strong><p>تغییر وضعیت‌ها و عملیات مالی باید بر اساس دادهٔ واقعی و قابل پیگیری باشد.</p><Link to="/security">چک‌لیست امنیت ←</Link></div>
        <Link className="sidebar-market-link" to="/"><span aria-hidden="true">←</span> بازگشت به بازار</Link>
      </aside>

      <div className="admin-console-main">
        <header className="console-topbar">
          <div><span className="console-overline">مرکز کنترل منطقه‌ای</span><strong>مدیریت نجات غذا · مازندران</strong></div>
          <div className="console-topbar-actions"><button type="button" className="console-logout" onClick={props.onLogout}>خروج</button><span className="console-status"><span aria-hidden="true">●</span> داده‌ها از API سامانه</span><Link className="console-market-link" to="/">بازگشت به سایت <span aria-hidden="true">↗</span></Link></div>
        </header>
      <section className="page-shell admin-page">
        <header className="page-header admin-page-heading" id="admin-overview">
          <div><p className="eyebrow">نظارت عملیاتی و مالی</p>
          <h1>داشبورد مدیر</h1>
          <p>فروشندگان، بسته‌های منتظر بررسی، سفارش‌ها، بازپرداخت و ثبت تسویه را از یک نقطه پیگیری کن.</p></div>
          <div className="admin-heading-status"><span aria-hidden="true">●</span><span><strong>نمای زندهٔ سرویس</strong><small>مقادیر بر اساس پاسخ فعلی API</small></span></div>
        </header>
        <div className="admin-region-toolbar">
          <div className="admin-region-controls" role="group" aria-label="فیلتر منطقه">
            <button type="button" className={region === "all" ? "city-chip is-selected" : "city-chip"} onClick={() => setRegion("all")}>همه مناطق</button>
            <button type="button" className={region === "بابلسر" ? "city-chip is-selected" : "city-chip"} onClick={() => setRegion("بابلسر")}>بابلسر</button>
            <button type="button" className={region === "آمل" ? "city-chip is-selected" : "city-chip"} onClick={() => setRegion("آمل")}>آمل</button>
          </div>
          <button className="secondary-button compact admin-export-button" type="button" onClick={exportSettlementCsv}><span aria-hidden="true">⇩</span> خروجی CSV تسویه‌ها</button>
        </div>
        <section className="admin-summary-grid" id="admin-overview-summary">
          <div><strong>{users.length}</strong><span>کاربر</span></div>
          <div><strong>{visibleMerchants.filter((item) => item.verification_status === "VERIFIED").length.toLocaleString("fa-IR")}</strong><span>فروشنده تأییدشده</span></div>
          <div><strong>{visibleMerchants.filter((item) => item.verification_status === "PENDING").length.toLocaleString("fa-IR")}</strong><span>فروشنده در انتظار</span></div>
          <div><strong>{visibleOffers.length.toLocaleString("fa-IR")}</strong><span>پیشنهاد در انتظار</span></div>
          <div><strong>{visibleOrders.length.toLocaleString("fa-IR")}</strong><span>سفارش</span></div>
          <div><strong>{visibleCompletedOrders.length.toLocaleString("fa-IR")}</strong><span>تکمیل‌شده</span></div>
          <div><strong>{visibleRescuedMeals.toLocaleString("fa-IR")}</strong><span>غذای نجات‌یافته</span></div>
          <div><strong>{visibleCancellationRate.toLocaleString("fa-IR")}٪</strong><span>نرخ لغو</span></div>
          <div><strong>{visibleGrossSales.toLocaleString("fa-IR")}</strong><span>فروش ثبت‌شده (تومان)</span></div>
          <div><strong>{visibleSettlements.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + item.net_amount, 0).toLocaleString("fa-IR")}</strong><span>تسویه در انتظار (تومان)</span></div>
        </section>

        {loading && <div className="state-card"><div className="spinner" />در حال دریافت اطلاعات مدیریت...</div>}
        {!loading && error && <div className="state-card error-state"><div className="state-icon">!</div><h3>دریافت اطلاعات ناموفق بود</h3><p>{error}</p></div>}

        {!loading && !error && (
          <>
            <section className="admin-users-card" id="admin-merchants">
              <div className="section-heading">
                <div><p className="eyebrow">Moderation</p><h2>فروشندگان</h2></div>
                <span className="offer-count">{visibleMerchants.length.toLocaleString("fa-IR")} فروشگاه</span>
              </div>
              <div className="admin-user-list">
                {visibleMerchants.map((item) => (
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

            <section className="admin-users-card" id="admin-offers">
              <div className="section-heading">
                <div><p className="eyebrow">Queue</p><h2>پیشنهادهای در انتظار بررسی</h2></div>
                <span className="offer-count">{visibleOffers.length.toLocaleString("fa-IR")} مورد</span>
              </div>
              <div className="admin-user-list">
                {visibleOffers.length === 0 ? (
                  <p className="muted">صف بررسی خالی است.</p>
                ) : visibleOffers.map((offer) => (
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

            <section className="admin-users-card" id="admin-settlements">
              <div className="section-heading">
                <div><p className="eyebrow">Payouts</p><h2>دفتر تسویه فروشندگان</h2></div>
                <span className="offer-count">{visibleSettlements.filter((item) => item.status === "PENDING").length.toLocaleString("fa-IR")} تسویه باز</span>
              </div>
              <p className="muted">این بخش فقط ثبت و پیگیری تسویه دستی را مدیریت می‌کند؛ انتقال وجه خودکار از درگاه انجام نمی‌دهد.</p>
              <div className="admin-user-list">
                {visibleSettlements.length === 0 ? (
                  <p className="muted">هنوز پرداخت تأییدشده‌ای برای تسویه ثبت نشده است.</p>
                ) : visibleSettlements.map((item) => (
                  <article className="admin-user-row" key={item.id}>
                    <div className="admin-user-info">
                      <strong>سفارش #{item.order_id} · فروشگاه #{item.merchant_id}</strong>
                      <span>ناخالص: {item.gross_amount.toLocaleString("fa-IR")} تومان · کمیسیون {item.commission_rate_bps / 100}٪ ({item.commission_amount.toLocaleString("fa-IR")})</span>
                      <span>خالص فروشنده: {item.net_amount.toLocaleString("fa-IR")} تومان</span>
                      {item.payout_reference && <span>مرجع انتقال: {item.payout_reference}</span>}
                    </div>
                    <span className={`moderation-status ${item.status === "PAID" ? "moderation-approved" : "moderation-pending"}`}>
                      {item.status === "PAID" ? "تسویه ثبت‌شده" : "در انتظار تسویه"}
                    </span>
                    {item.status === "PENDING" && (
                      <button className="secondary-button" type="button" onClick={() => void recordSettlementPaid(item)}>ثبت انتقال بانکی</button>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-users-card" id="admin-refunds">
              <div className="section-heading">
                <div><p className="eyebrow">Refund review</p><h2>پیگیری بازپرداخت‌ها</h2></div>
                <span className="offer-count">{visibleRefundPayments.length.toLocaleString("fa-IR")} مورد در انتظار</span>
              </div>
              <p className="muted">
                این بخش انتقال یا بازپرداخت پول انجام نمی‌دهد؛ فقط بعد از انجام واقعی بازپرداخت، مرجع آن را ثبت کنید.
              </p>
              <div className="admin-user-list">
                {visibleRefundPayments.length === 0 ? (
                  <p className="muted">در حال حاضر بازپرداختی در صف بررسی نیست.</p>
                ) : visibleRefundPayments.map((payment) => (
                  <article className="admin-user-row" key={payment.id}>
                    <div className="admin-user-avatar">↩</div>
                    <div className="admin-user-info">
                      <strong>سفارش #{payment.order_id} · پرداخت #{payment.id}</strong>
                      <span>مبلغ: {payment.amount.toLocaleString("fa-IR")} تومان · درگاه: {payment.provider}</span>
                      <span>مرجع پرداخت: <bdi dir="ltr">{payment.reference_id || "ثبت نشده"}</bdi></span>
                    </div>
                    <span className="moderation-status moderation-pending">نیازمند بازپرداخت</span>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => void recordRefundCompleted(payment)}
                    >
                      ثبت بازپرداخت انجام‌شده
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-users-card" id="admin-users">
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

            <section className="admin-users-card admin-orders-card" id="admin-orders">
              <div className="section-heading">
                <div><p className="eyebrow">Orders</p><h2>سفارش‌ها</h2></div>
                <span className="offer-count">{visibleOrders.length.toLocaleString("fa-IR")} سفارش</span>
              </div>
              <div className="admin-order-list">
                {visibleOrders.length === 0 ? <p className="muted">هنوز سفارشی ثبت نشده است.</p> : visibleOrders.slice(0, 50).map((order) => (
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
      </div>
      <MobileBottomNav cartCount={props.cartCount} userRole={props.user?.role || null} onCart={props.onCart} />
    </main>
  );
}
