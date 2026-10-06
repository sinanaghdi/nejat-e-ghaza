import { Link, NavLink } from "react-router-dom";
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

export function Header({ user, cartCount, onOrders, onMerchant, onLogin, onLogout }: Props) {
  return (
    <nav className="nav">
      <Link className="brand" to="/" aria-label="صفحه اصلی نجات غذا">نجات غذا</Link>
      <div className="nav-links">
        <NavLink to="/offers">پیشنهادها</NavLink>
        <NavLink to="/#how-it-works">چطور کار می‌کند؟</NavLink>
        <Link className="cart-button" to="/cart">
          سبد خرید{cartCount > 0 && <span>{cartCount}</span>}
        </Link>
        {user ? (
          <>
            {user.role === "CUSTOMER" && (
              <Link className="orders-button" to="/orders" onClick={onOrders}>سفارش‌های من</Link>
            )}
            <Link className="orders-button" to="/profile">پروفایل</Link>
            {user.role === "MERCHANT" && (
              <Link className="orders-button" to="/merchant" onClick={onMerchant}>پنل فروشنده</Link>
            )}
            {user.role === "ADMIN" && (
              <Link className="orders-button" to="/admin">پنل مدیر</Link>
            )}
            <button className="login-button" type="button" onClick={onLogout}>خروج</button>
          </>
        ) : (
          <>
            <Link className="login-button" to="/login" onClick={onLogin}>ورود</Link>
            <Link className="signup-button" to="/register">ثبت‌نام</Link>
          </>
        )}
      </div>
    </nav>
  );
}
