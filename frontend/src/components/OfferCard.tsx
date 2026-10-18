import type { FoodOffer } from "../lib/api";
import { formatPickupTime, formatToman } from "../lib/formatters";

function discountPercent(offer: FoodOffer): number {
  if (offer.original_price <= 0) return 0;
  return Math.max(0, Math.round((1 - Number(offer.sale_price) / Number(offer.original_price)) * 100));
}

type Props = {
  offer: FoodOffer;
  onSelect: (offer: FoodOffer) => void;
};

export function OfferCard({ offer, onSelect }: Props) {
  const discount = discountPercent(offer);
  const lowStock = offer.available_quantity > 0 && offer.available_quantity <= 3;

  return (
    <article className="offer-card reference-offer-card">
      <button className="offer-card-hit-area" type="button" onClick={() => onSelect(offer)} aria-label={`مشاهده بسته ${offer.title}`}>
        <div className="offer-image">
          {offer.image_url ? <img src={offer.image_url} alt={offer.title} loading="lazy" /> : <span className="offer-image-fallback" aria-hidden="true">🍱</span>}
          {discount > 0 && <span className="discount-badge">{discount.toLocaleString("fa-IR")}٪ تخفیف</span>}
          {lowStock && <span className="stock-badge">فقط {offer.available_quantity.toLocaleString("fa-IR")} عدد مانده</span>}
        </div>
      </button>
      <div className="offer-content">
        <div className="offer-merchant-row">
          <span className="offer-merchant-avatar" aria-hidden="true">{offer.merchant.business_name.trim().slice(0, 1) || "ن"}</span>
          <span className="offer-merchant-meta">
            <strong>{offer.merchant.business_name}</strong>
            <small><span aria-hidden="true">⌖</span> {offer.merchant.city} · {offer.merchant.address}</small>
          </span>
          <span className="offer-origin-mark" title="فروشنده محلی" aria-label="فروشنده محلی">✳</span>
        </div>

        <button className="offer-title-button" type="button" onClick={() => onSelect(offer)}><h3>{offer.title}</h3></button>
        {offer.description && <p className="description">{offer.description}</p>}

        <div className="offer-pickup-chip"><span aria-hidden="true">◷</span><span>تحویل امروز: {formatPickupTime(offer.pickup_start)} تا {formatPickupTime(offer.pickup_end)}</span></div>

        <div className="offer-card-pricing">
          <div className="offer-price-stack">
            <del>{formatToman(offer.original_price)}</del>
            <strong>{formatToman(offer.sale_price)}</strong>
          </div>
          {discount > 0 && <span className="offer-savings">٪{discount.toLocaleString("fa-IR")}-</span>}
        </div>

        <div className="offer-meta">
          <span><span aria-hidden="true">▣</span> {offer.available_quantity.toLocaleString("fa-IR")} بسته موجود</span>
          <span className={lowStock ? "offer-stock-low" : ""}>{lowStock ? "موجودی محدود" : "رزرو تا پایان موجودی"}</span>
        </div>
        <button className="primary-button offer-reserve-button" type="button" onClick={() => onSelect(offer)}>
          <span aria-hidden="true">▱</span> مشاهده و رزرو
        </button>
      </div>
    </article>
  );
}
