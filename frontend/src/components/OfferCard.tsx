import type { FoodOffer } from "../lib/api";
import { formatPickupTime, formatToman } from "../lib/formatters";

function discountPercent(offer: FoodOffer): number {
  if (offer.original_price <= 0) return 0;
  return Math.round((1 - offer.sale_price / offer.original_price) * 100);
}

type Props = {
  offer: FoodOffer;
  onSelect: (offer: FoodOffer) => void;
};

export function OfferCard({ offer, onSelect }: Props) {
  const discount = discountPercent(offer);

  return (
    <article className="offer-card">
      <div className="offer-image">
        {offer.image_url ? <img src={offer.image_url} alt={offer.title} /> : <span aria-hidden="true">🍱</span>}
        {discount > 0 && <span className="discount-badge">{discount}٪ تخفیف</span>}
      </div>
      <div className="offer-content">
        <span className="merchant">{offer.merchant.business_name} · {offer.merchant.city}</span>
        <h3>{offer.title}</h3>
        {offer.description && <p className="description">{offer.description}</p>}
        <div className="price-row">
          <div><strong>{formatToman(offer.sale_price)}</strong><del>{formatToman(offer.original_price)}</del></div>
        </div>
        <div className="offer-meta">
          <span>🕐 دریافت تا {formatPickupTime(offer.pickup_end)}</span>
          <span>📦 {offer.available_quantity} عدد باقی‌مانده</span>
        </div>
        <button className="secondary-button" type="button" onClick={() => onSelect(offer)}>
          مشاهده و رزرو
        </button>
      </div>
    </article>
  );
}
