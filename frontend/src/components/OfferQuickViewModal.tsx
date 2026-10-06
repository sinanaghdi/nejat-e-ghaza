import type { FoodOffer } from "../lib/api";
import { formatPickupTime, formatToman } from "../lib/formatters";
import { QuantityControl } from "./QuantityControl";

type Props = {
  offer: FoodOffer;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAddToCart: () => void;
  onClose: () => void;
};

function discountPercent(offer: FoodOffer): number {
  if (offer.original_price <= 0) return 0;
  return Math.round((1 - offer.sale_price / offer.original_price) * 100);
}

export function OfferQuickViewModal({
  offer,
  quantity,
  onQuantityChange,
  onAddToCart,
  onClose,
}: Props) {
  const discount = discountPercent(offer);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="offer-modal"
        role="dialog"
        aria-modal="true"
        aria-label={offer.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="بستن"
        >
          ×
        </button>

        <div className="detail-image">
          {offer.image_url ? (
            <img src={offer.image_url} alt={offer.title} />
          ) : (
            <span>🍱</span>
          )}
          {discount > 0 && (
            <span className="discount-badge">{discount}٪ تخفیف</span>
          )}
        </div>

        <div className="offer-detail-content">
          <span className="merchant">
            {offer.merchant.business_name} · {offer.merchant.city}
          </span>
          <h2>{offer.title}</h2>

          {offer.description && (
            <p className="detail-description">{offer.description}</p>
          )}

          <div className="detail-price">
            <strong>{formatToman(offer.sale_price)}</strong>
            <del>{formatToman(offer.original_price)}</del>
          </div>

          <div className="detail-meta">
            <span>🕐 دریافت تا {formatPickupTime(offer.pickup_end)}</span>
            <span>📦 {offer.available_quantity} عدد موجود</span>
          </div>

          <QuantityControl
            value={quantity}
            max={offer.available_quantity}
            onChange={onQuantityChange}
          />

          <button
            className="primary-button full-button"
            type="button"
            onClick={onAddToCart}
          >
            افزودن به سبد خرید
          </button>
        </div>
      </section>
    </div>
  );
}
