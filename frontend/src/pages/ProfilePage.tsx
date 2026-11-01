import { Link } from "react-router-dom";
import type { User } from "../lib/api";
import { UiIcon } from "../components/UiIcon";

type Props = {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "مشتری",
  MERCHANT: "فروشنده",
  ADMIN: "مدیر سامانه",
};

export function ProfilePage({ user, onLogin, onLogout }: Props) {
  if (!user) {
    return <main className="stitch-app"><section className="stitch-content stitch-account-page"><section className="stitch-empty-card"><UiIcon name="user" size={32} /><h2>برای مشاهدهٔ حساب وارد شو</h2><p>اطلاعات پروفایل پس از ورود از سرویس حساب کاربری دریافت می‌شود.</p><button className="stitch-button stitch-button-primary" onClick={onLogin}>ورود</button></section></section></main>;
  }

  return (
    <main className="stitch-app">
      <section className="stitch-content stitch-account-page">
        <div className="stitch-breadcrumb"><Link to="/">خانه</Link><span>←</span><strong>پروفایل</strong></div>
        <section className="stitch-profile-card" style={{ marginTop: 18 }}>
          <div className="stitch-profile-avatar">{user.name.trim().slice(0, 1) || "س"}</div>
          <div><p className="stitch-kicker">حساب کاربری سهمینو</p><h1>{user.name}</h1><p>نوع حساب: {roleLabels[user.role]}</p></div>
          <div className="stitch-profile-row"><small>نام نمایشی</small><strong>{user.name}</strong></div>
          <div className="stitch-profile-row"><small>ایمیل ثبت‌شده</small><strong dir="ltr">{user.email || "ثبت نشده"}</strong></div>
          <div className="stitch-profile-row"><small>نقش حساب</small><strong>{roleLabels[user.role]}</strong></div>
          <p className="stitch-legal-hint">ویرایش نام، علایق و نشانی شخصی در API فعلی حساب ارائه نشده است؛ این صفحه فقط اطلاعات برگشتی از حساب را نمایش می‌دهد.</p>
        </section>

        <section className="stitch-account-links" style={{ marginTop: 15 }}>
          {user.role === "CUSTOMER" && <Link to="/orders"><strong>سفارش‌های من</strong><small>رسید و کد دریافت</small></Link>}
          {user.role === "CUSTOMER" && <Link to="/club"><strong>باشگاه سبز</strong><small>گزارش فعالیت ثبت‌شده</small></Link>}
          {user.role === "MERCHANT" && <Link to="/merchant"><strong>پیشخوان فروشگاه</strong><small>بسته‌ها، تحویل و تسویه</small></Link>}
          {user.role === "ADMIN" && <Link to="/admin"><strong>مرکز مدیریت</strong><small>پایش عملیات سامانه</small></Link>}
          <Link to="/notifications"><strong>اعلان‌ها</strong><small>پیام‌های مربوط به حساب</small></Link>
        </section>
        <button className="stitch-button stitch-button-outline" type="button" onClick={onLogout}>خروج از حساب</button>
      </section>
    </main>
  );
}
