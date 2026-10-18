import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    navigate(value ? \`/offers?query=\${encodeURIComponent(value)}\` : "/offers");
  }

  return (
    <header className="site-header">
      <div className="announcement-bar">
        <span className="announcement-mark" aria-hidden="true">✳</span>
        <span>نجات غذای باکیفیت؛ انتخابی هوشمندانه برای امروز</span>
        <span className="announcement-divider" aria-hidden="true">|</span>
        <span className="announcement-secondary">پایلوت محلی: بابلسر و آمل</span>
      </div>

      <nav className="nav" aria-label="ناوبری اصلی">
        <Link className="brand" to="/" aria-label="صفحه اصلی نجات غذا">
          <span className="brand-mark" aria-hidden="true">ن</span>
          <span className="brand-copy">
            <strong>نجات غذا</strong>
            <small>نجات مازاد باکیفیت روزانه</small>
          </span>
        </Link>

        <div className="header-location" aria-label="محدوده‌های پایلوت">
          <span className="header-location-icon" aria-hidden="true">⌖</span>
          <span><small>محدوده‌های فعال</small><strong>بابلسر و آمل</strong></span>
        </div>

        <form className="header-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="header-offer-search">جستجوی پیشنهادها</label>
          <span aria-hidden="true">⌕</span>
          <input
            id="header-offer-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="غذا، کافه یا رستوران را جست‌وجو کن..."
          />
          <button type="submit" aria-label="جستجو">جستجو</button>
        </form>

        <div className="nav-links">
          <NavLink to="/offers">کاوش پیشنهادها</NavLink>
          <a href="#how-it-works" onClick={(event) => {
            event.preventDefault();
            navigate("/");
            window.setTimeout(() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
          }}>چطور کار می‌کند؟</a>
          <Link to="/merchant">همکاری فروشندگان</Link>
        </div>

        <div className="header-actions">
          <Link className="header-cart" to="/cart" aria-label={cartCount > 0 ? \`سبد خرید، \${cartCount} قلم\` : "سبد خرید"}>
            <span aria-hidden="true">▱</span>
            <span className="header-cart-label">سبد خرید</span>
            {cartCount > 0 && <b>{cartCount.toLocaleString("fa-IR")}</b>}
          </Link>
          {user ? (
            <div className="header-account" tabIndex={0} aria-label="منوی حساب کاربری">
              <span className="header-avatar" aria-hidden="true">{(user.name || "کاربر").trim().slice(0, 1)}</span>
              <span className="header-account-name">{user.name || "حساب کاربری"}</span>
              <div className="header-account-menu">
                {user.role === "CUSTOMER" && <Link to="/orders" onClick={onOrders}>سفارش‌های من</Link>}
                <Link to="/notifications">اعلان‌ها</Link>
                <Link to="/profile">پروفایل</Link>
                {user.role === "MERCHANT" && <Link to="/merchant" onClick={onMerchant}>پنل فروشنده</Link>}
                {user.role === "ADMIN" && <Link to="/admin">پنل مدیریت</Link>}
                <button type="button" onClick={onLogout}>خروج</button>
              </div>
            </div>
          ) : (
            <div className="header-auth">
              <Link className="login-button" to="/login" onClick={onLogin}>ورود</Link>
              <Link className="signup-button" to="/register">ثبت‌نام</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
