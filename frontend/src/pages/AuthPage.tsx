import type { FormEvent } from "react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "../lib/api";

type Props = {
  mode: "login" | "register";
  user: User | null;
  loading: boolean;
  error: string;
  success: string;
  name: string;
  email: string;
  password: string;
  onModeChange: (mode: "login" | "register") => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDemoLogin: (role: User["role"]) => void;
};

export function AuthPage({
  mode,
  user,
  loading,
  error,
  success,
  name,
  email,
  password,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onDemoLogin,
}: Props) {
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  return (
    <main className="auth-page">
      <section className="auth-page-card">
        <Link className="brand auth-brand" to="/">نجات غذا</Link>
        <span className="eyebrow">{mode === "login" ? "ورود به بازار" : "شروع با نجات غذا"}</span>
        <h1>{mode === "login" ? "خوش آمدی" : "حساب کاربری بساز"}</h1>
        <p>{mode === "login" ? "برای دیدن سفارش‌ها و ادامه خرید وارد حساب شو." : "با یک حساب، سفارش‌ها و فعالیت‌هایت را مدیریت کن."}</p>

        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => onModeChange("login")}>ورود</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => onModeChange("register")}>ثبت‌نام</button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {mode === "register" && (
            <label>
              نام و نام خانوادگی
              <input required minLength={2} maxLength={100} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="مثلاً سینا احمدی" />
            </label>
          )}
          <label>
            ایمیل
            <input required type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="example@email.com" dir="ltr" />
          </label>
          <label>
            رمز عبور
            <input required type="password" minLength={8} maxLength={128} value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="حداقل ۸ کاراکتر" dir="ltr" />
          </label>
          {error && <p className="form-message error-message">{error}</p>}
          {success && <p className="form-message success-message">{success}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            {loading ? "در حال پردازش..." : mode === "login" ? "ورود به حساب" : "ساخت حساب"}
          </button>
        </form>

        {import.meta.env.VITE_DEMO_MODE === "true" && (
          <section className="demo-login-panel" aria-label="ورود سریع دمو">
            <div>
              <p className="eyebrow">حالت Demo</p>
              <h2>برای دیدن پنل‌ها ورود سریع کن</h2>
              <p>این حساب‌ها فقط برای مشاهده UI و workflow پروژه در GitHub Pages هستند.</p>
            </div>
            <div className="demo-role-grid">
              <button type="button" className="demo-role-card" onClick={() => onDemoLogin("CUSTOMER")}>
                <span>👤</span><strong>مشتری</strong><small>سفارش‌ها، پروفایل و خرید</small>
              </button>
              <button type="button" className="demo-role-card" onClick={() => onDemoLogin("MERCHANT")}>
                <span>🏪</span><strong>فروشنده</strong><small>پیشنهادها و سفارش‌های فروشگاه</small>
              </button>
              <button type="button" className="demo-role-card" onClick={() => onDemoLogin("ADMIN")}>
                <span>🛡️</span><strong>مدیر</strong><small>کاربران و نقش‌ها</small>
              </button>
            </div>
          </section>
        )}

        <Link className="auth-back-link" to="/offers">بازگشت به پیشنهادها</Link>
      </section>
    </main>
  );
}
