import { useEffect, useMemo, useState } from "react";
import type { MerchantProfile, FoodOffer, MerchantSettlement, Order } from "../../lib/api";
import { getMerchantSettlements } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { formatPickupTime, formatToman } from "../../lib/formatters";
import { getStitchFoodImage } from "../../lib/stitchAssets";
import { SafeImage } from "../SafeImage";
import { UiIcon } from "../UiIcon";

function statusLabel(status: Order["status"]): string {
  const labels: Record<Order["status"], string> = {
    PENDING: "در انتظار پرداخت",
    PAID: "پرداخت‌شده",
    READY_FOR_PICKUP: "آمادهٔ دریافت",
    COMPLETED: "تحویل‌شده",
    CANCELLED: "لغوشده",
    EXPIRED: "منقضی‌شده",
  };
  return labels[status];
}

type Props = {
  loading: boolean;
  error: string;
  profile: MerchantProfile | null;
  offers: FoodOffer[];
  orders: Order[];
  onCreateProfile: () => void;
  onEditProfile: () => void;
  onCreateOffer: () => void;
  onEditOffer: (id: number) => void;
  onDeactivate: (id: number) => void;
  onStatusChange: (id: number, status: Order["status"]) => void;
  onVerifyPickup: (id: number, code: string) => void;
};

export function MerchantDashboard({
  loading, error, profile, offers, orders, onCreateProfile, onEditProfile,
  onCreateOffer, onEditOffer, onDeactivate, onStatusChange, onVerifyPickup,
}: Props) {
  const [settlements, setSettlements] = useState<MerchantSettlement[]>([]);
  const [settlementError, setSettlementError] = useState("");
  const [pickupOrderId, setPickupOrderId] = useState<number | null>(null);
  const [pickupCode, setPickupCode] = useState("");
  const [pickupCodeError, setPickupCodeError] = useState("");

  useEffect(() => {
    let active = true;
    if (!profile) {
      setSettlements([]);
      return () => { active = false; };
    }
    getMerchantSettlements(getToken())
      .then((items) => { if (active) { setSettlements(items); setSettlementError(""); } })
      .catch((err) => { if (active) setSettlementError(err instanceof Error ? err.message : "دریافت دفتر تسویه ممکن نشد."); });
    return () => { active = false; };
  }, [profile?.id]);

  const completedOrders = orders.filter((order) => order.status === "COMPLETED");
  const paidOrders = orders.filter((order) => ["PAID", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status));
  const deliveredPackages = completedOrders.reduce((sum, order) => sum + order.items.reduce((n, item) => n + item.quantity, 0), 0);
  const grossSales = paidOrders.reduce((sum, order) => sum + order.total_amount, 0);
  const cancellationRate = orders.length ? Math.round(orders.filter((order) => order.status === "CANCELLED").length / orders.length * 100) : 0;
  const waitingSettlement = settlements.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + item.net_amount, 0);
  const paidSettlement = settlements.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.net_amount, 0);
  const activeOffers = offers.filter((offer) => offer.is_active).length;

  const selectedPickupOrder = useMemo(
    () => orders.find((order) => order.id === pickupOrderId) || null,
    [orders, pickupOrderId],
  );

  function submitPickup() {
    if (!pickupOrderId) return;
    const code = pickupCode.trim();
    if (!/^[A-Za-z0-9]{4,32}$/.test(code)) {
      setPickupCodeError("کد دریافت معتبر نیست؛ ۴ تا ۳۲ نویسه وارد کن.");
      return;
    }
    onVerifyPickup(pickupOrderId, code);
    setPickupOrderId(null);
    setPickupCode("");
    setPickupCodeError("");
  }

  if (loading) {
    return <section className="stitch-state-card" role="status">در حال دریافت اطلاعات فروشگاه...</section>;
  }

  if (!profile) {
    return (
      <section className="stitch-empty-card">
        <span className="stitch-state-illustration">🏪</span>
        <h2>پروفایل فروشگاه را ایجاد کن</h2>
        <p>برای ثبت بسته‌های قابل‌عرضه، ابتدا نام، نشانی و شهر فروشگاه را ثبت کن. پس از ثبت، پروفایل برای بررسی مدیر ارسال می‌شود.</p>
        <button className="stitch-button stitch-button-primary" type="button" onClick={onCreateProfile}>ساخت پروفایل فروشگاه</button>
      </section>
    );
  }

  return (
    <div className="stitch-merchant-dashboard">
      {error && <div className="stitch-state-card stitch-error-card" role="alert"><p>{error}</p></div>}

      <section className="stitch-merchant-hero" id="merchant-overview">
        <div>
          <p className="stitch-kicker">میزکار فروشگاه</p>
          <h1>{profile.business_name}</h1>
          <p>{profile.city} · {profile.address}</p>
          <span className={profile.verification_status === "VERIFIED" ? "stitch-status-pill" : profile.verification_status === "SUSPENDED" ? "stitch-status-pill is-danger" : "stitch-status-pill is-warning"}>
            {profile.verification_status === "VERIFIED" ? "فروشگاه تأیید شده" : profile.verification_status === "SUSPENDED" ? "فروشگاه تعلیق شده" : "در انتظار بررسی مدیر"}
          </span>
          {profile.verification_reason && <p style={{ marginTop: 8 }}>علت/یادداشت بررسی: {profile.verification_reason}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="stitch-button stitch-button-secondary" type="button" onClick={onEditProfile}>ویرایش اطلاعات</button>
          <button className="stitch-button stitch-button-accent" type="button" onClick={onCreateOffer}>+ ثبت بسته</button>
        </div>
      </section>

      <section className="stitch-merchant-kpis" aria-label="شاخص‌های فروشگاه">
        <article><strong>{activeOffers.toLocaleString("fa-IR")}</strong><small>پیشنهاد فعال</small></article>
        <article><strong>{orders.length.toLocaleString("fa-IR")}</strong><small>کل سفارش‌ها</small></article>
        <article><strong>{deliveredPackages.toLocaleString("fa-IR")}</strong><small>بسته تحویل‌شده</small></article>
        <article><strong>{formatToman(grossSales)}</strong><small>مبلغ سفارش‌های پرداخت‌شده</small></article>
        <article><strong>{cancellationRate.toLocaleString("fa-IR")}٪</strong><small>نرخ لغو</small></article>
        <article><strong>{formatToman(waitingSettlement)}</strong><small>در انتظار تسویه</small></article>
        <article><strong>{formatToman(paidSettlement)}</strong><small>تسویه ثبت‌شده</small></article>
        <article><strong>{completedOrders.length.toLocaleString("fa-IR")}</strong><small>سفارش تکمیل‌شده</small></article>
      </section>

      <nav className="stitch-merchant-tabs" aria-label="بخش‌های پنل فروشنده">
        <a href="#merchant-offers">بسته‌ها</a><a href="#merchant-orders">سفارش و تحویل</a><a href="#merchant-settlements">امور مالی</a><a href="#merchant-profile">پروفایل</a>
      </nav>

      <section className="stitch-merchant-panel" id="merchant-offers">
        <div className="stitch-merchant-panel-head">
          <div><p className="stitch-kicker">مدیریت موجودی</p><h2>بسته‌های من</h2></div>
          <button className="stitch-button stitch-button-primary" type="button" onClick={onCreateOffer}>ثبت بستهٔ جدید</button>
        </div>

        {offers.length === 0 ? (
          <div className="stitch-empty-card"><h3>هنوز بسته‌ای ثبت نشده</h3><p>با ثبت عنوان، قیمت، تعداد و بازهٔ دریافت، اولین پیشنهاد را آمادهٔ بررسی کن.</p></div>
        ) : offers.map((offer) => (
          <article className="stitch-merchant-product-row" key={offer.id}>
            <div className="stitch-merchant-offer-image"><SafeImage src={offer.image_url || getStitchFoodImage(offer.title, offer.description || "")} alt={offer.title} fallback={<span>🍱</span>} /></div>
            <div className="stitch-merchant-product-meta">
              <strong>{offer.title}</strong>
              <small>{formatToman(offer.sale_price)} · موجودی {offer.available_quantity.toLocaleString("fa-IR")} · دریافت تا {formatPickupTime(offer.pickup_end)}</small>
              <small>وضعیت بررسی: {offer.moderation_status === "APPROVED" ? "تأییدشده" : offer.moderation_status === "REJECTED" ? "ردشده" : "در انتظار بررسی"}</small>
            </div>
            <span className={offer.is_active ? "stitch-status-pill" : "stitch-status-pill is-danger"}>{offer.is_active ? "فعال" : "غیرفعال"}</span>
            <div className="stitch-merchant-row-actions">
              {offer.is_active && <button type="button" onClick={() => onEditOffer(offer.id)}>ویرایش</button>}
              {offer.is_active && <button type="button" className="is-danger" onClick={() => onDeactivate(offer.id)}>غیرفعال‌سازی</button>}
            </div>
          </article>
        ))}
      </section>

      <section className="stitch-merchant-panel" id="merchant-orders">
        <div className="stitch-merchant-panel-head"><div><p className="stitch-kicker">از پرداخت تا تحویل</p><h2>سفارش‌ها و دریافت حضوری</h2></div><span className="stitch-status-pill">{orders.length.toLocaleString("fa-IR")} سفارش</span></div>
        <p className="stitch-merchant-notice">کد دریافت متعلق به مشتری است و در فهرست سفارش‌های فروشنده نمایش داده نمی‌شود. هنگام مراجعه، کدی را که مشتری اعلام می‌کند وارد کن. اسکن دوربین در این نسخه متصل نیست.</p>
        {orders.length === 0 ? <p style={{ color: "var(--stitch-muted)", fontSize: ".8rem" }}>هنوز سفارشی برای فروشگاه ثبت نشده است.</p> : orders.map((order) => (
          <article className="stitch-merchant-order-row" key={order.id}>
            <div className="stitch-merchant-order-meta">
              <strong>سفارش #{order.id}</strong>
              <small>{formatToman(order.total_amount)} · {order.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("fa-IR")} بسته</small>
              <small>{new Date(order.created_at).toLocaleString("fa-IR")}</small>
            </div>
            <span className={order.status === "COMPLETED" ? "stitch-status-pill" : order.status === "CANCELLED" || order.status === "EXPIRED" ? "stitch-status-pill is-danger" : "stitch-status-pill is-warning"}>{statusLabel(order.status)}</span>
            <div className="stitch-merchant-order-controls">
              <select aria-label={`تغییر وضعیت سفارش ${order.id}`} value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as Order["status"])}>
                <option value={order.status}>{statusLabel(order.status)}</option>
                {order.status === "PAID" && <option value="READY_FOR_PICKUP">آمادهٔ دریافت</option>}
                {order.status === "PENDING" && <option value="CANCELLED">لغوشده</option>}
              </select>
              {order.status === "READY_FOR_PICKUP" && <button className="stitch-button stitch-button-primary" type="button" onClick={() => { setPickupOrderId(order.id); setPickupCode(""); setPickupCodeError(""); }}>ثبت کد دریافت مشتری</button>}
            </div>
          </article>
        ))}
      </section>

      <section className="stitch-merchant-panel" id="merchant-settlements">
        <div className="stitch-merchant-panel-head"><div><p className="stitch-kicker">دفتر تسویه</p><h2>وضعیت مالی فروشگاه</h2></div><span className="stitch-status-pill">{settlements.length.toLocaleString("fa-IR")} رکورد</span></div>
        <p className="stitch-merchant-notice">این بخش وضعیت حسابداری تسویه را نمایش می‌دهد. انتقال بانکی به‌صورت خودکار از پنل فروشنده انجام نمی‌شود؛ مدیریت پس از ثبت انتقال واقعی، مرجع آن را در سامانه ثبت می‌کند.</p>
        {settlementError && <p className="form-message error-message" role="alert">{settlementError}</p>}
        {settlements.length === 0 ? <p style={{ color: "var(--stitch-muted)", fontSize: ".8rem" }}>فعلاً رکورد تسویه‌ای ثبت نشده است.</p> : settlements.slice(0, 20).map((item) => (
          <article className="stitch-settlement-row" key={item.id}>
            <div className="stitch-settlement-meta"><strong>سفارش #{item.order_id}</strong><small>{new Date(item.created_at).toLocaleDateString("fa-IR")}</small></div>
            <div className="stitch-settlement-meta"><small>ناخالص {formatToman(item.gross_amount)}</small><small>کارمزد {formatToman(item.commission_amount)}</small><strong>خالص {formatToman(item.net_amount)}</strong></div>
            <div className="stitch-settlement-meta"><span className={item.status === "PAID" ? "stitch-status-pill" : "stitch-status-pill is-warning"}>{item.status === "PAID" ? "پرداخت ثبت‌شده" : "در انتظار تسویه"}</span>{item.payout_reference && <small>مرجع: <bdi dir="ltr">{item.payout_reference}</bdi></small>}</div>
          </article>
        ))}
      </section>

      <section className="stitch-merchant-panel" id="merchant-profile">
        <div className="stitch-merchant-panel-head"><div><p className="stitch-kicker">اطلاعات همکاری</p><h2>پروفایل فروشگاه</h2></div><button className="stitch-button stitch-button-outline" onClick={onEditProfile}>ویرایش</button></div>
        <div className="stitch-profile-row"><small>نام فروشگاه</small><strong>{profile.business_name}</strong></div>
        <div className="stitch-profile-row"><small>شهر</small><strong>{profile.city}</strong></div>
        <div className="stitch-profile-row"><small>نشانی</small><strong>{profile.address}</strong></div>
        <div className="stitch-profile-row"><small>شرح</small><strong>{profile.description || "ثبت نشده"}</strong></div>
      </section>

      {pickupOrderId !== null && (
        <div className="stitch-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPickupOrderId(null); }}>
          <section className="stitch-modal" role="dialog" aria-modal="true" aria-labelledby="pickup-modal-title">
            <button className="stitch-modal-close" type="button" aria-label="بستن" onClick={() => setPickupOrderId(null)}>×</button>
            <p className="stitch-kicker">تأیید تحویل حضوری</p>
            <h2 id="pickup-modal-title">کد اعلام‌شده توسط مشتری را وارد کن</h2>
            <p>کد را از روی رسید مشتری دریافت کن. این سامانه آن را با کد ذخیره‌شدهٔ سفارش مقایسه می‌کند.</p>
            <label className="stitch-form-field">کد دریافت
              <input autoFocus inputMode="text" autoComplete="off" dir="ltr" maxLength={32} minLength={4} value={pickupCode} onChange={(event) => { setPickupCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,32)); setPickupCodeError(""); }} placeholder="کد ۱۶ نویسه‌ای" />
            </label>
            {pickupCodeError && <p className="form-message error-message" role="alert">{pickupCodeError}</p>}
            {selectedPickupOrder && <p className="stitch-legal-hint">سفارش #{selectedPickupOrder.id} · مبلغ {formatToman(selectedPickupOrder.total_amount)}</p>}
            <div className="stitch-modal-actions">
              <button type="button" className="stitch-button stitch-button-outline" onClick={() => setPickupOrderId(null)}>انصراف</button>
              <button type="button" className="stitch-button stitch-button-primary" disabled={pickupCode.trim().length < 4} onClick={submitPickup}>تأیید کد تحویل</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
