import { useEffect, useState } from "react";
import type { AppNotification, User } from "../lib/api";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../lib/api";
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

const typeIcons: Record<string, string> = {
  ORDER: "📦",
  PAYMENT: "💳",
  INFO: "ℹ️",
};

function formatNotificationDate(value: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsPage(props: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getNotifications(token);
      setItems(result.items);
      setUnreadCount(result.unread_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "اعلان‌ها دریافت نشدند.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function readOne(notification: AppNotification) {
    if (notification.is_read) return;
    try {
      await markNotificationRead(getToken(), notification.id);
      setItems((current) =>
        current.map((item) => item.id === notification.id ? { ...item, is_read: true } : item),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "اعلان خوانده نشد.");
    }
  }

  async function readAll() {
    try {
      await markAllNotificationsRead(getToken());
      setItems((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "اعلان‌ها به‌روزرسانی نشدند.");
    }
  }

  if (!props.user) {
    return (
      <>
        <Header user={null} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
        <main className="page-shell">
          <div className="state-card">
            <div className="state-icon">🔐</div>
            <h3>ابتدا وارد شو</h3>
            <p>برای دیدن اعلان‌ها باید وارد حساب شوی.</p>
            <button className="primary-button" onClick={props.onLogin}>ورود</button>
          </div>
        </main>
      </>
    );
  }

  return (
    <main className="app">
      <Header user={props.user} cartCount={props.cartCount} onCart={props.onCart} onOrders={props.onOrders} onMerchant={props.onMerchant} onLogin={props.onLogin} onLogout={props.onLogout} />
      <section className="page-shell notifications-page">
        <header className="page-header notifications-header">
          <div>
            <p className="eyebrow">پیام‌ها</p>
            <h1>اعلان‌ها</h1>
            <p>{unreadCount ? `${unreadCount} اعلان خوانده‌نشده داری.` : "همه اعلان‌ها خوانده شده‌اند."}</p>
          </div>
          {unreadCount > 0 && (
            <button className="secondary-button compact" type="button" onClick={() => void readAll()}>
              همه را خواندم
            </button>
          )}
        </header>

        {loading && <div className="state-card"><div className="spinner" />در حال دریافت اعلان‌ها...</div>}
        {!loading && error && (
          <div className="state-card error-state">
            <div className="state-icon">!</div>
            <h3>اعلان‌ها دریافت نشدند</h3>
            <p>{error}</p>
            <button className="secondary-button compact" type="button" onClick={() => void load()}>تلاش دوباره</button>
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="state-card">
            <div className="state-icon">🔔</div>
            <h3>اعلان جدیدی نداری</h3>
            <p>بعد از ثبت سفارش یا تغییر وضعیت، پیام‌ها اینجا نمایش داده می‌شوند.</p>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="notifications-list">
            {items.map((item) => (
              <button
                className={`notification-card${item.is_read ? "" : " unread"}`}
                key={item.id}
                type="button"
                onClick={() => void readOne(item)}
              >
                <span className="notification-icon">{typeIcons[item.notification_type] || "🔔"}</span>
                <span className="notification-content">
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                  <time dateTime={item.created_at}>{formatNotificationDate(item.created_at)}</time>
                </span>
                {!item.is_read && <span className="notification-dot" aria-label="خوانده‌نشده" />}
              </button>
            ))}
          </div>
        )}
      </section>
      <MobileBottomNav cartCount={props.cartCount} userRole={props.user?.role || null} onCart={props.onCart} />
    </main>
  );
}
