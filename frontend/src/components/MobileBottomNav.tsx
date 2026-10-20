import { NavLink } from "react-router-dom";
import { UiIcon } from "./UiIcon";

type Props = {
  cartCount: number;
  userRole: string | null;
  onCart: () => void;
};

export function MobileBottomNav({ cartCount, userRole, onCart }: Props) {
  return (
    <nav className="mobile-bottom-nav" aria-label="ناوبری اصلی">
      <NavLink to="/" end aria-label="خانه" className={({isActive}) => isActive ? "active" : ""}><UiIcon name="home" size={21} /><span>خانه</span></NavLink>
      <NavLink to="/offers" aria-label="پیشنهادها" className={({isActive}) => isActive ? "active" : ""}><UiIcon name="food" size={21} /><span>پیشنهادها</span></NavLink>
      <button type="button" onClick={onCart} aria-label={cartCount > 0 ? `سبد خرید، ${cartCount.toLocaleString("fa-IR")} قلم` : "سبد خرید"}><UiIcon name="bag" size={21} />{cartCount > 0 && <b>{cartCount.toLocaleString("fa-IR")}</b>}<span>سبد خرید</span></button>
      {userRole === "MERCHANT"
        ? <NavLink to="/merchant" className={({isActive}) => isActive ? "active" : ""}><UiIcon name="store" size={21} /><span>فروشگاه</span></NavLink>
        : userRole === "ADMIN"
          ? <NavLink to="/admin" className={({isActive}) => isActive ? "active" : ""}><UiIcon name="shield-check" size={21} /><span>مدیریت</span></NavLink>
          : userRole === "CUSTOMER"
            ? <NavLink to="/orders" className={({isActive}) => isActive ? "active" : ""}><UiIcon name="package" size={21} /><span>سفارش‌ها</span></NavLink>
            : <NavLink to="/login" className={({isActive}) => isActive ? "active" : ""}><UiIcon name="user" size={21} /><span>ورود</span></NavLink>}
    </nav>
  );
}