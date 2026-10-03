import type { FoodOffer } from "../lib/api";
import { formatToman } from "../lib/formatters";

export type CartItem = { offer: FoodOffer; quantity: number };

type Props = {
  cart: CartItem[];
  open: boolean;
  loading: boolean;
  error: string;
  onClose: () => void;
  onUpdateQuantity: (offerId: number, quantity: number) => void;
  onSubmit: () => void;
};

export function CartDrawer({ cart, open, loading, error, onClose, onUpdateQuantity, onSubmit }: Props) {
  if (!open) return null;
  const total = cart.reduce((sum, item) => sum + item.offer.sale_price * item.quantity, 0);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <div><p className="eyebrow">سفارش شما</p><h2 id="cart-title">سبد خرید</h2></div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="بستن">×</button>
        </div>
        {cart.length === 0 ? (
          <div className="cart-empty"><div className="state-icon">🛒</div><h3>سبد خرید خالی است</h3><p>یک پیشنهاد خوشمزه انتخاب کن.</p></div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.offer.id}>
                  <div className="cart-item-image">{item.offer.image_url ? <img src={item.offer.image_url} alt="" /> : "🍱"}</div>
                  <div className="cart-item-info">
                    <strong>{item.offer.title}</strong>
                    <span>{formatToman(item.offer.sale_price)}</span>
                    <div className="mini-quantity">
                      <button type="button" onClick={() => onUpdateQuantity(item.offer.id, item.quantity - 1)} aria-label="کاهش تعداد">−</button>
                      <b>{item.quantity}</b>
                      <button type="button" onClick={() => onUpdateQuantity(item.offer.id, item.quantity + 1)} aria-label="افزایش تعداد">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary"><span>مبلغ کل</span><strong>{formatToman(total)}</strong></div>
            {error && <p className="form-message error-message">{error}</p>}
            <button className="primary-button full-button" type="button" disabled={loading} onClick={onSubmit}>
              {loading ? "در حال ثبت سفارش..." : "ثبت سفارش"}
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
