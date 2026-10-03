import type { FoodOffer, User } from "../lib/api";
import { QuantityControl } from "../components/QuantityControl";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { formatPickupTime, formatToman } from "../lib/formatters";

type Props = {
  offer: FoodOffer | null;
  loading: boolean;
  error: string;
  user: User | null;
  cartCount: number;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => void;
  onBack: () => void;
  onCart: () => void;
};

function discountPercent(offer: FoodOffer) {
  if (!offer.original_price) return 0;
  return Math.round((1 - Number(offer.sale_price) / Number(offer.original_price)) * 100);
}

export function OfferDetailPage({ offer, loading, error, user, cartCount, quantity, onQuantityChange, onAddToCart, onBack, onCart }: Props) {
  if (loading) return <main className="page-shell"><div className="state-card"><div className="spinner" />در حال دریافت پیشنهاد...</div></main>;
  if (error || !offer) return <main className="page-shell"><div className="state-card error-state"><div className="state-icon">!</div><h3>{error || "این پیشنهاد پیدا نشد."}</h3><p>ممکن است پیشنهاد غیرفعال شده یا دیگر موجود نباشد.</p><button className="secondary-button compact" type="button" onClick={onBack}>بازگشت به پیشنهادها</button></div></main>;

  return (
    <>
      <main className="page-shell offer-detail-page">
        <button className="back-button" type="button" onClick={onBack}>→ بازگشت به پیشنهادها</button>
        <section className="offer-detail-layout">
          <div className="detail-image detail-image-page">
            {offer.image_url ? <img src={offer.image_url} alt={offer.title} /> : <span>🍱</span>}
            {discountPercent(offer) > 0 && <span className="discount-badge">{discountPercent(offer)}٪ تخفیف</span>}
          </div>
          <div className="offer-detail-content">
            <span className="merchant">فروشنده #{offer.merchant_id}</span>
            <h1>{offer.title}</h1>
            {offer.description && <p className="detail-description">{offer.description}</p>}
            <div className="detail-price"><strong>{formatToman(offer.sale_price)}</strong><del>{formatToman(offer.original_price)}</del></div>
            <div className="detail-meta"><span>🕐 دریافت تا {formatPickupTime(offer.pickup_end)}</span><span>📦 {offer.available_quantity} عدد موجود</span></div>
            <QuantityControl value={quantity} max={offer.available_quantity} onChange={onQuantityChange} />
            <button className="primary-button full-button" type="button" onClick={onAddToCart}>افزودن به سبد خرید</button>
          </div>
        </section>
      </main>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </>
  );
}