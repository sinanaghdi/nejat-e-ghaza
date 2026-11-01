import type { FoodOffer } from "../lib/api";
import { SafeImage } from "./SafeImage";
import { formatPickupTime, formatToman } from "../lib/formatters";
import { getStitchFoodImage } from "../lib/stitchAssets";
import { UiIcon } from "./UiIcon";

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
  const lowStock = offer.available_quantity > 0 && offer.available_quantity <= 2;

  return (
    <article className="stitch-offer-card">
      <button className="stitch-offer-image-button" type="button" onClick={() => onSelect(offer)} aria-label={`مشاهده بسته ${offer.title}`}>
        <div className="stitch-offer-image">
          <SafeImage
            src={offer.image_url || getStitchFoodImage(offer.title, offer.description || "")}
            alt={offer.image_url ? offer.title : `تصویر نمونه برای ${offer.title}`}
            fallback={<span aria-hidden="true" className="stitch-food-placeholder">🍱</span>}
          />
          {discount > 0 && <span className="stitch-discount-badge">{discount.toLocaleString("fa-IR")}٪ تخفیف</span>}
          {lowStock && <span className="stitch-stock-badge">فقط {offer.available_quantity.toLocaleString("fa-IR")} بسته مانده</span>}
        </div>
      </button>

      <div className="stitch-offer-body">
        <div className="stitch-offer-merchant">
          <span className="stitch-merchant-avatar">{offer.merchant.business_name.trim().slice(0, 1) || "س"}</span>
          <span><strong>{offer.merchant.business_name}</strong><small><UiIcon name="pin" size={13} /> {offer.merchant.city} · {offer.merchant.address}</small></span>
          <span className="stitch-local-dot" title="فروشنده محلی" />
        </div>

        <button className="stitch-offer-title" type="button" onClick={() => onSelect(offer)}><h3>{offer.title}</h3></button>
        {offer.description && <p className="stitch-offer-description">{offer.description}</p>}

        <div className="stitch-offer-pickup"><UiIcon name="clock" size={15} /><span>دریافت {formatPickupTime(offer.pickup_start)} تا {formatPickupTime(offer.pickup_end)}</span></div>

        <div className="stitch-offer-price-row">
          <span className="stitch-offer-prices">
            {offer.original_price > offer.sale_price && <del>{formatToman(offer.original_price)}</del>}
            <strong>{formatToman(offer.sale_price)}</strong>
          </span>
          {discount > 0 && <span className="stitch-saving-chip">صرفه‌جویی {discount.toLocaleString("fa-IR")}٪</span>}
        </div>

        <div className="stitch-offer-foot">
          <small>{offer.available_quantity.toLocaleString("fa-IR")} بسته موجود</small>
          <button type="button" className="stitch-button stitch-button-primary" onClick={() => onSelect(offer)} disabled={!offer.is_active || offer.available_quantity < 1}>
            مشاهده و رزرو <UiIcon name="arrow-left" size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
