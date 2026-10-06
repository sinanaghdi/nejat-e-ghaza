import { NavLink } from "react-router-dom";

type Props = {
  cartCount: number;
  userRole: string | null;
  onCart: () => void;
};

export function MobileBottomNav({ cartCount, userRole, onCart }: Props) {
  return (
    <nav className="mobile-bottom-nav" aria-label="ناوبری اصلی">
      <NavLink to="/" className={({isActive}) => isActive ? "active" : ""}>⌂<span>خانه</span></NavLink>
      <NavLink to="/offers" className={({isActive}) => isActive ? "active" : ""}>🍽<span>پیشنهادها</span></NavLink>
      <button type="button" onClick={onCart} aria-label="سبد خرید">🛒{cartCount > 0 && <b>{cartCount}</b>}<span>سبد</span></button>
      {userRole === "MERCHANT"
        ? <NavLink to="/merchant" className={({isActive}) => isActive ? "active" : ""}>🏪<span>فروشگاه</span></NavLink>
        : userRole === "ADMIN"
          ? <NavLink to="/admin" className={({isActive}) => isActive ? "active" : ""}>🛡️<span>مدیر</span></NavLink>
          : <NavLink to="/orders" className={({isActive}) => isActive ? "active" : ""}>📦<span>سفارش‌ها</span></NavLink>}
    </nav>
  );
}