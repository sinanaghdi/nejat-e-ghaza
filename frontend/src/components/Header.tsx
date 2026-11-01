import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import type { User } from "../lib/api";
import { UiIcon } from "./UiIcon";
import { SahminoMark } from "./SahminoMark";

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
    navigate(value ? `/offers?query=${encodeURIComponent(value)}` : "/offers");
  }

  return (
    <header className="site-header stitch-site-header">
      <div className="announcement-bar stitch-announcement">
        <span className="announcement-mark" aria-hidden="true">✳</span>
        <span>غذای خوب، سهم تو.</span>
        <span className="announcement-divider" aria-hidden="true">·</span>
        <span className="announcement-secondary">پایلوت محلی در بابلسر و آمل</span>
      </div>

      <nav className="nav stitch-nav" aria-label="ناوبری اصلی">
        <Link className="brand stitch-brand" to="/" aria-label="صفحه اصلی سهمینو">
          <SahminoMark className="brand-mark" />
          <span className="brand-copy"><strong>سهمینو</strong><small>غذای خوب، سهم تو.</small></span>
        </Link>

        <div className="header-location stitch-header-location" aria-label="محدوده‌های فعال">
          <span className="stitch-location-icon"><UiIcon name="pin" size={17} /></span>
          <span><small>محدوده‌های فعال</small><strong>بابلسر و آمل</strong></span>
        </div>

        <form className="header-search stitch-header-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="header-offer-search">جستجوی بسته‌ها</label>
          <UiIcon name="search" size={18} />
          <input id="header-offer-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جست‌وجوی غذا، نانوایی یا کافه..." />
          <button type="submit" aria-label="جستجو">جستجو</button>
        </form>

        <div className="nav-links stitch-desktop-links">
          <NavLink to="/offers">بسته‌ها</NavLink>
          <NavLink to="/club">باشگاه سبز</NavLink>
          <a href="#how-it-works" onClick={(event) => {
            event.preventDefault();
            navigate("/");
            window.setTimeout(() => document.getElementById("stitch-how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
          }}>راهنما</a>
          <Link to="/for-restaurants">همکاری فروشندگان</Link>
        </div>

        <div className="header-actions stitch-header-actions">
          {user?.role === "CUSTOMER" && <Link className="header-orders-link" to="/orders" onClick={onOrders}>سفارش‌ها</Link>}
          <Link className="header-cart" to="/cart" aria-label={cartCount > 0 ? `سبد خرید، ${cartCount} قلم` : "سبد خرید"}>
            <UiIcon name="bag" size={18} /><span className="header-cart-label">سبد</span>
            {cartCount > 0 && <b>{cartCount.toLocaleString("fa-IR")}</b>}
          </Link>
          {user ? (
            <div className="header-account stitch-header-account" tabIndex={0} aria-label="منوی حساب کاربری">
              <span className="header-avatar" aria-hidden="true">{(user.name || "کاربر").trim().slice(0, 1)}</span>
              <span className="header-account-name">{user.name || "حساب کاربری"}</span>
              <div className="header-account-menu">
                {user.role === "CUSTOMER" && <Link to="/orders" onClick={onOrders}>سفارش‌های من</Link>}
                {user.role === "CUSTOMER" && <Link to="/club">باشگاه سبز</Link>}
                <Link to="/notifications">اعلان‌ها</Link>
                <Link to="/profile">پروفایل</Link>
                {user.role === "MERCHANT" && <Link to="/merchant" onClick={onMerchant}>پنل فروشنده</Link>}
                {user.role === "ADMIN" && <Link to="/admin">پنل مدیریت</Link>}
                <button type="button" onClick={onLogout}>خروج از حساب</button>
              </div>
            </div>
          ) : (
            <div className="header-auth">
              <Link className="login-button" to="/login" onClick={onLogin}>ورود</Link>
              <Link className="signup-button" to="/register">عضویت</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
