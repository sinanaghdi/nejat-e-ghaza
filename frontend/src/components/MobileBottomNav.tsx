import { NavLink } from "react-router-dom";
import { UiIcon } from "./UiIcon";

type Props = {
  cartCount: number;
  userRole: string | null;
  onCart: () => void;
};

export function MobileBottomNav({ cartCount, userRole, onCart }: Props) {
  if (userRole === "MERCHANT") {
    return (
      <nav className="stitch-bottom-nav" aria-label="ناوبری فروشنده">
        <NavLink to="/merchant" end className={({ isActive }) => isActive ? "active" : ""}><UiIcon name="home" size={19} /><span>پیشخوان</span></NavLink>
        <NavLink to="/merchant#merchant-offers"><UiIcon name="package" size={19} /><span>بسته‌ها</span></NavLink>
        <NavLink to="/merchant#merchant-orders"><UiIcon name="check" size={19} /><span>تحویل</span></NavLink>
        <NavLink to="/merchant#merchant-finance"><UiIcon name="wallet" size={19} /><span>مالی</span></NavLink>
        <NavLink to="/profile"><UiIcon name="user" size={19} /><span>حساب</span></NavLink>
      </nav>
    );
  }

  if (userRole === "ADMIN") {
    return (
      <nav className="stitch-bottom-nav" aria-label="ناوبری مدیریت">
        <NavLink to="/admin"><UiIcon name="home" size={19} /><span>نمای کلی</span></NavLink>
        <NavLink to="/admin#admin-merchants"><UiIcon name="store" size={19} /><span>فروشگاه‌ها</span></NavLink>
        <NavLink to="/admin#admin-offers"><UiIcon name="package" size={19} /><span>بسته‌ها</span></NavLink>
        <NavLink to="/admin#admin-settlements"><UiIcon name="wallet" size={19} /><span>تسویه</span></NavLink>
        <NavLink to="/profile"><UiIcon name="user" size={19} /><span>حساب</span></NavLink>
      </nav>
    );
  }

  return (
    <nav className="stitch-bottom-nav" aria-label="ناوبری اصلی">
      <NavLink to="/" end className={({ isActive }) => isActive ? "active" : ""}><UiIcon name="home" size={19} /><span>خانه</span></NavLink>
      <NavLink to="/offers" className={({ isActive }) => isActive ? "active" : ""}><UiIcon name="food" size={19} /><span>بسته‌ها</span></NavLink>
      <NavLink to="/club" className={({ isActive }) => isActive ? "active" : ""}><UiIcon name="leaf" size={19} /><span>باشگاه</span></NavLink>
      <NavLink to="/orders" className={({ isActive }) => isActive ? "active" : ""}><UiIcon name="package" size={19} /><span>سفارش‌ها</span></NavLink>
      <NavLink to="/profile" className={({ isActive }) => isActive ? "active" : ""}><UiIcon name="user" size={19} /><span>حساب</span></NavLink>
      {cartCount > 0 && <button className="stitch-bottom-cart" type="button" onClick={onCart} aria-label={`سبد خرید، ${cartCount} قلم`}><UiIcon name="bag" size={19} /><b>{cartCount.toLocaleString("fa-IR")}</b></button>}
    </nav>
  );
}
