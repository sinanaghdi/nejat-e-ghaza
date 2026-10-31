import { useEffect, useState } from "react";
import type { MerchantProfile, FoodOffer, MerchantSettlement, Order } from "../../lib/api";
import { getMerchantSettlements } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { formatToman } from "../../lib/formatters";

function statusLabel(status: Order["status"]): string {
  const labels: Record<Order["status"], string> = {
    PENDING: "در انتظار پرداخت",
    PAID: "پرداخت‌شده",
    READY_FOR_PICKUP: "آماده دریافت",
    COMPLETED: "تکمیل‌شده",
    CANCELLED: "لغوشده",
    EXPIRED: "منقضی‌شده",
  };
  return labels[status];
}

type Props = {
  open?: boolean;
  loading: boolean;
  error: string;
  profile: MerchantProfile | null;
  offers: FoodOffer[];
  orders: Order[];
  onClose: () => void;
  onCreateProfile: () => void;
  onEditProfile: () => void;
  onCreateOffer: () => void;
  onEditOffer: (id: number) => void;
  onDeactivate: (id: number) => void;
  onStatusChange: (id: number, status: Order["status"]) => void;
  onVerifyPickup: (id: number) => void;
};

export function MerchantDashboard({
  open,
  loading,
  error,
  profile,
  offers,
  orders,
  onClose,
  onCreateProfile,
  onEditProfile,
  onCreateOffer,
  onEditOffer,
  onDeactivate,
  onStatusChange,
  onVerifyPickup,
}: Props) {
  const [settlements, setSettlements] = useState<MerchantSettlement[]>([]);

  useEffect(() => {
    let active = true;
    if (!profile) {
      setSettlements([]);
      return () => { active = false; };
    }
    getMerchantSettlements(getToken())
      .then((items) => { if (active) setSettlements(items); })
      .catch(() => { if (active) setSettlements([]); });
    return () => { active = false; };
  }, [profile?.id]);

  if (open === false) return null;

  return (
    <div className="merchant-dashboard-surface">
      <section className="merchant-dashboard-content" aria-label="پنل مدیریت فروشگاه">
        {onClose && (
          <button className="modal-close" type="button" onClick={onClose} aria-label="بستن">
            ×
          </button>
        )}

        {loading ? (
          <div className="orders-loading">
            <div className="spinner" /> در حال بارگذاری پنل فروشنده...
          </div>
        ) : (
          <>
            <div className="merchant-head">
              <div>
                <p className="eyebrow">مدیریت کسب‌وکار</p>
                <h2>{profile?.business_name || "فروشگاه شما"}</h2>
                <p>{profile?.city || "پروفایل فروشگاه هنوز ساخته نشده است."}</p>
              </div>

              <div>
                {!profile ? (
                  <button className="primary-button" type="button" onClick={onCreateProfile}>
                    ساخت پروفایل
                  </button>
                ) : (
                  <div className="merchant-head-actions">
                    <button
                      className="secondary-button compact"
                      type="button"
                      onClick={onEditProfile}
                    >
                      ویرایش پروفایل
                    </button>
                    <button className="primary-button" type="button" onClick={onCreateOffer}>
                      + پیشنهاد جدید
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && <p className="form-message error-message">{error}</p>}

            {profile && (
              <div className={`merchant-verification-banner verification-${profile.verification_status.toLowerCase()}`}>
                <strong>
                  وضعیت احراز: {{
                    PENDING: "در انتظار بررسی",
                    VERIFIED: "تأییدشده",
                    SUSPENDED: "تعلیق‌شده",
                  }[profile.verification_status]}
                </strong>
                {profile.verification_reason && <span>علت: {profile.verification_reason}</span>}
              </div>
            )}

            {!profile ? (
              <div className="state-card">
                <div className="state-icon">🏪</div>
                <h3>پروفایل فروشگاه را بسازید</h3>
                <p>بعد از ساخت پروفایل می‌توانید پیشنهاد غذایی ثبت کنید.</p>
              </div>
            ) : (
              <>
                {(() => {
                  const activeOrders = orders.filter((order) =>
                    ["PAID", "READY_FOR_PICKUP", "COMPLETED"].includes(order.status),
                  );
                  const completedOrders = orders.filter((order) => order.status === "COMPLETED");
                  const rescuedMeals = completedOrders.reduce(
                    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
                    0,
                  );
                  const grossSales = activeOrders.reduce((sum, order) => sum + order.total_amount, 0);
                  const cancellationRate = orders.length
                    ? Math.round((orders.filter((order) => order.status === "CANCELLED").length / orders.length) * 100)
                    : 0;

                  return (
                    <div className="merchant-stats" id="merchant-performance">
                      <div><strong>{offers.filter((offer) => offer.is_active).length}</strong><span>پیشنهاد فعال</span></div>
                      <div><strong>{orders.length}</strong><span>کل سفارش</span></div>
                      <div><strong>{completedOrders.length}</strong><span>تحویل‌شده</span></div>
                      <div><strong>{rescuedMeals}</strong><span>بسته‌های دریافت‌شده</span></div>
                      <div><strong>{grossSales.toLocaleString("fa-IR")}</strong><span>فروش ثبت‌شده (تومان)</span></div>
                      <div><strong>{cancellationRate}٪</strong><span>نرخ لغو</span></div>
                      <div><strong>{settlements.filter((item) => item.status === "PENDING").reduce((sum, item) => sum + item.net_amount, 0).toLocaleString("fa-IR")}</strong><span>در انتظار تسویه (تومان)</span></div>
                      <div><strong>{settlements.filter((item) => item.status === "PAID").reduce((sum, item) => sum + item.net_amount, 0).toLocaleString("fa-IR")}</strong><span>تسویه‌شده (تومان)</span></div>
                    </div>
                  );
                })()}

                <div className="merchant-grid">
                  <div>
                    <div className="section-heading">
                      <h3>پیشنهادهای من</h3>
                    </div>

                    <div className="merchant-offers" id="merchant-offers">
                      {offers.length === 0 ? (
                        <p className="muted">هنوز پیشنهادی ثبت نکرده‌اید.</p>
                      ) : (
                        offers.map((offer) => (
                          <div className="merchant-row" key={offer.id}>
                            <div>
                              <strong>{offer.title}</strong>
                              <span>
                                {formatToman(offer.sale_price)} · موجودی {offer.available_quantity}
                              </span>
                            </div>
                            <span className={offer.is_active ? "active-dot" : "inactive-dot"}>
                              {offer.is_active ? "فعال" : "غیرفعال"}
                            </span>
                            {offer.is_active && (
                              <>
                                <button
                                  className="text-button"
                                  type="button"
                                  onClick={() => onEditOffer(offer.id)}
                                >
                                  ویرایش
                                </button>
                                <button
                                  className="text-button danger"
                                  type="button"
                                  onClick={() => onDeactivate(offer.id)}
                                >
                                  غیرفعال کردن
                                </button>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="section-heading">
                      <h3>سفارش‌های اخیر</h3>
                    </div>

                    <div className="merchant-orders" id="merchant-orders">
                      {orders.length === 0 ? (
                        <p className="muted">هنوز سفارشی ندارید.</p>
                      ) : (
                        orders.slice(0, 8).map((order) => (
                          <div className="merchant-order-row" key={order.id}>
                            <div>
                              <strong>سفارش #{order.id}</strong>
                              <span>
                                {formatToman(order.total_amount)} · کد {order.pickup_code}
                              </span>
                            </div>

                            <div className="merchant-order-actions">
                              <select
                                value={order.status}
                                onChange={(event) =>
                                  onStatusChange(
                                    order.id,
                                    event.target.value as Order["status"],
                                  )
                                }
                              >
                                <option value={order.status}>{statusLabel(order.status)}</option>
                                {order.status === "PAID" && (
                                  <option value="READY_FOR_PICKUP">آماده دریافت</option>
                                )}
                                {order.status === "PENDING" && (
                                  <option value="CANCELLED">لغو شده</option>
                                )}
                              </select>

                              {order.status === "READY_FOR_PICKUP" && (
                                <button
                                  className="text-button"
                                  type="button"
                                  onClick={() => onVerifyPickup(order.id)}
                                >
                                  تحویل با کد
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <section className="merchant-finance-card" id="merchant-settlements">
                  <div className="section-heading merchant-finance-heading">
                    <div><p className="eyebrow">گزارش مالی</p><h3>وضعیت تسویه‌های فروشگاه</h3></div>
                    <span className="offer-count">{settlements.length.toLocaleString("fa-IR")} رکورد</span>
                  </div>
                  <p className="merchant-finance-notice">این دفتر، وضعیت ثبت‌شدهٔ تسویه را نمایش می‌دهد. انتقال بانکی به‌صورت خودکار از این پنل انجام نمی‌شود؛ مرجع رسمی تسویه را از مدیریت پیگیری کن.</p>
                  <div className="merchant-finance-list">
                    {settlements.length === 0 ? (
                      <p className="muted merchant-finance-empty">در حال حاضر رکوردی برای تسویهٔ فروشگاه ثبت نشده است.</p>
                    ) : settlements.slice(0, 10).map((item) => (
                      <article className="merchant-finance-row" key={item.id}>
                        <div className="merchant-finance-order"><strong>سفارش #{item.order_id}</strong><small>تاریخ ثبت: {new Date(item.created_at).toLocaleDateString("fa-IR")}</small></div>
                        <div className="merchant-finance-amounts"><span>ناخالص: {formatToman(item.gross_amount)}</span><span>کارمزد: {formatToman(item.commission_amount)}</span><strong>خالص: {formatToman(item.net_amount)}</strong></div>
                        <div className="merchant-finance-status"><span className={item.status === "PAID" ? "moderation-status moderation-approved" : "moderation-status moderation-pending"}>{item.status === "PAID" ? "تسویه ثبت‌شده" : "در انتظار تسویه"}</span>{item.payout_reference && <small>مرجع: <bdi dir="ltr">{item.payout_reference}</bdi></small>}</div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
