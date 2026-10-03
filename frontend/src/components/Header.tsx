import type { User } from "../lib/api";

type Props = {
  user: User | null;
  cartCount: number;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

export function Header({ user, cartCount, onCart, onOrders, onMerchant, onLogin, onLogout }: Props) {
  return (
    <nav className="nav">
      <a className="brand" href="/" aria-label="صفحه اصلی نجات غذا">نجات غذا</a>
      <div className="nav-links">
        <a href="#offers">پیشنهادها</a>
        <a href="#how-it-works">چطور کار می‌کند؟</a>
        <button className="cart-button" type="button" onClick={onCart}>
          سبد خرید{cartCount > 0 && <span>{cartCount}</span>}
        </button>
        {user ? (
          <>
            <button className="orders-button" type="button" onClick={onOrders}>سفارش‌های من</button>
            {user.role === "MERCHANT" && (
              <button className="orders-button" type="button" onClick={onMerchant}>پنل فروشنده</button>
            )}
            <button className="login-button" type="button" onClick={onLogout}>خروج</button>
          </>
        ) : (
          <button className="login-button" type="button" onClick={onLogin}>ورود</button>
        )}
      </div>
    </nav>
  );
}
