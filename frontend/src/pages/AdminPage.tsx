import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "../lib/api";
import { getAdminUsers, updateUserRole } from "../lib/api";
import { getToken } from "../lib/auth";
import { Header } from "../components/Header";
import { MobileBottomNav } from "../components/MobileBottomNav";

type Props = {
  user: User | null;
  cartCount: number;
  onCart: () => void;
  onOrders: () => void;
  onMerchant: () => void;
  onLogin: () => void;
  onLogout: () => void;
};

const roleLabels: Record<User["role"], string> = {
  CUSTOMER: "مشتری",
  MERCHANT: "فروشنده",
  ADMIN: "مدیر",
};

export function AdminPage(props: Props) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!props.user || props.user.role !== "ADMIN") {
      setLoading(false);
      return;
    }
    let active = true;
    getAdminUsers(getToken())
      .then((items) => {
        if (active) setUsers(items);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "اطلاعات کاربران دریافت نشد.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [props.user]);

  async function changeRole(id: number, role: User["role"]) {
    const updated = await updateUserRole(getToken(), id, role);
    setUsers((items) => items.map((item) => item.id === id ? updated : item));
  }

  if (!props.user) {
    return (
      <>
        <Header user={null} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
        <main className="page-shell"><div className="state-card"><div className="state-icon">🔐</div><h3>ابتدا وارد شو</h3><p>این بخش مخصوص مدیر سیستم است.</p><button className="primary-button" onClick={props.onLogin}>ورود</button></div></main>
      </>
    );
  }

  if (props.user.role !== "ADMIN") {
    return (
      <>
        <Header user={props.user} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
        <main className="page-shell"><div className="state-card error-state"><div className="state-icon">403</div><h3>دسترسی مدیر لازم است</h3><p>با حساب مدیر دمو یا نقش ADMIN وارد شوید.</p><Link className="primary-button" to="/profile">بازگشت به پروفایل</Link></div></main>
      </>
    );
  }

  return (
    <main className="app">
      <Header user={props.user} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
      <section className="page-shell admin-page">
        <header className="page-header">
          <p className="eyebrow">مدیریت سیستم</p>
          <h1>داشبورد مدیر</h1>
          <p>مدیریت کاربران و نقش‌ها در یک نمای ساده و قابل ارائه.</p>
        </header>
        <section className="admin-summary-grid">
          <div><strong>{users.length}</strong><span>کاربر</span></div>
          <div><strong>{users.filter((item) => item.role === "MERCHANT").length}</strong><span>فروشنده</span></div>
          <div><strong>{users.filter((item) => item.role === "CUSTOMER").length}</strong><span>مشتری</span></div>
          <div><strong>{users.filter((item) => item.role === "ADMIN").length}</strong><span>مدیر</span></div>
        </section>

        {loading && <div className="state-card"><div className="spinner" />در حال دریافت کاربران...</div>}
        {!loading && error && <div className="state-card error-state"><div className="state-icon">!</div><h3>دریافت اطلاعات ناموفق بود</h3><p>{error}</p></div>}

        {!loading && !error && (
          <section className="admin-users-card">
            <div className="section-heading">
              <div><p className="eyebrow">Users</p><h2>کاربران</h2></div>
              <span className="offer-count">{users.length} حساب</span>
            </div>
            <div className="admin-user-list">
              {users.map((item) => (
                <article className="admin-user-row" key={item.id}>
                  <div className="admin-user-avatar">{item.name.trim().charAt(0) || "ن"}</div>
                  <div className="admin-user-info">
                    <strong>{item.name}</strong>
                    <span dir="ltr">{item.email}</span>
                  </div>
                  <select value={item.role} onChange={(event) => void changeRole(item.id, event.target.value as User["role"])}>
                    {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
      <MobileBottomNav cartCount={props.cartCount} userRole={props.user?.role || null} onCart={props.onCart} />
    </main>
  );
}
