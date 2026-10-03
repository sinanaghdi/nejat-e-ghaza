import type { User } from "../lib/api";

type Props = {
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "مشتری",
  MERCHANT: "فروشنده",
  ADMIN: "مدیر",
};

export function ProfilePage({ user, onLogin, onLogout }: Props) {
  if (!user) {
    return (
      <main className="page-shell">
        <section className="profile-guest-card">
          <div className="state-icon">👤</div>
          <p className="eyebrow">حساب کاربری</p>
          <h1>برای ادامه وارد شو</h1>
          <p>برای مشاهده اطلاعات حساب و مدیریت سفارش‌ها باید وارد حساب کاربری‌ات شوی.</p>
          <button className="primary-button" type="button" onClick={onLogin}>ورود به حساب</button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">حساب کاربری</p>
        <h1>پروفایل من</h1>
        <p>اطلاعات حساب کاربری و دسترسی‌های فعلی تو.</p>
      </header>

      <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {user.name?.trim().charAt(0) || "ن"}
        </div>
        <div className="profile-main">
          <h2>{user.name}</h2>
          <p className="profile-email" dir="ltr">{user.email}</p>
          <span className="profile-role">{roleLabels[user.role] || user.role}</span>
        </div>
      </section>

      <section className="profile-info-grid" aria-label="اطلاعات حساب">
        <div className="profile-info-item">
          <span>نام</span>
          <strong>{user.name}</strong>
        </div>
        <div className="profile-info-item">
          <span>ایمیل</span>
          <strong dir="ltr">{user.email}</strong>
        </div>
        <div className="profile-info-item">
          <span>نوع حساب</span>
          <strong>{roleLabels[user.role] || user.role}</strong>
        </div>
      </section>

      <button className="secondary-button profile-logout" type="button" onClick={onLogout}>
        خروج از حساب
      </button>
    </main>
  );
}