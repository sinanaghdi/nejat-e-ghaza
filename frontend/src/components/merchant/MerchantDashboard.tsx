import type { MerchantProfile, FoodOffer, Order } from "../../lib/api";
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

            {!profile ? (
              <div className="state-card">
                <div className="state-icon">🏪</div>
                <h3>پروفایل فروشگاه را بسازید</h3>
                <p>بعد از ساخت پروفایل می‌توانید پیشنهاد غذایی ثبت کنید.</p>
              </div>
            ) : (
              <>
                <div className="merchant-stats">
                  <div>
                    <strong>{offers.filter((offer) => offer.is_active).length}</strong>
                    <span>پیشنهاد فعال</span>
                  </div>
                  <div>
                    <strong>{orders.length}</strong>
                    <span>سفارش</span>
                  </div>
                  <div>
                    <strong>{orders.filter((order) => order.status === "COMPLETED").length}</strong>
                    <span>تکمیل‌شده</span>
                  </div>
                </div>

                <div className="merchant-grid">
                  <div>
                    <div className="section-heading">
                      <h3>پیشنهادهای من</h3>
                    </div>

                    <div className="merchant-offers">
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

                    <div className="merchant-orders">
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
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
