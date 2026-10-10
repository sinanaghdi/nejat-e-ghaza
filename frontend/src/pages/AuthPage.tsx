import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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
  phoneNumber: string;
  otpCode: string;
  otpRequested: boolean;
  onModeChange: (mode: "login" | "register") => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onOtpCodeChange: (value: string) => void;
  onRequestOtp: () => void;
  onVerifyOtp: () => void;
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
  phoneNumber,
  otpCode,
  otpRequested,
  onModeChange,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onPhoneChange,
  onOtpCodeChange,
  onRequestOtp,
  onVerifyOtp,
  onSubmit,
  onDemoLogin,
}: Props) {
  const navigate = useNavigate();
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">(demoMode ? "email" : "phone");

  useEffect(() => {
    if (!user) return;
    const destination =
      user.role === "MERCHANT" ? "/merchant" :
      user.role === "ADMIN" ? "/admin" :
      "/dashboard";
    navigate(destination, { replace: true });
  }, [user, navigate]);

  function handleModeChange(nextMode: "login" | "register") {
    onModeChange(nextMode);
    if (nextMode === "login" && !demoMode) setLoginMethod("phone");
    if (nextMode === "register") setLoginMethod("email");
  }

  return (
    <main className="auth-page">
      <section className="auth-page-card">
        <Link className="brand auth-brand" to="/">نجات غذا</Link>
        <span className="eyebrow">{mode === "login" ? "ورود به بازار" : "شروع با نجات غذا"}</span>
        <h1>{mode === "login" ? "خوش آمدی" : "حساب کاربری بساز"}</h1>
        <p>{mode === "login" ? "با شماره موبایل و یک کد پیامکی وارد شو." : "حساب بساز تا سفارش‌ها و فعالیت‌هایت را مدیریت کنی."}</p>

        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => handleModeChange("login")}>ورود</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => handleModeChange("register")}>ثبت‌نام</button>
        </div>

        {mode === "login" && (
          <div className="auth-login-methods" role="group" aria-label="روش ورود">
            <button
              type="button"
              className={loginMethod === "phone" ? "active" : ""}
              onClick={() => setLoginMethod("phone")}
              disabled={demoMode}
            >
              ورود با موبایل
            </button>
            <button
              type="button"
              className={loginMethod === "email" ? "active" : ""}
              onClick={() => setLoginMethod("email")}
            >
              ایمیل و رمز عبور
            </button>
          </div>
        )}

        {mode === "login" && loginMethod === "phone" && !demoMode ? (
          <form className="auth-form" onSubmit={(event) => { event.preventDefault(); if (otpRequested) onVerifyOtp(); }}>
            <label>
              شماره موبایل
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => onPhoneChange(event.target.value)}
                placeholder="0912 345 6789"
                dir="ltr"
              />
            </label>
            {!otpRequested && (
              <label>
                نام (برای حساب جدید، اختیاری)
                <input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="مثلاً سارا رضایی" maxLength={100} />
              </label>
            )}
            {otpRequested && (
              <label>
                کد پیامکی
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{4,8}"
                  minLength={4}
                  maxLength={8}
                  value={otpCode}
                  onChange={(event) => onOtpCodeChange(
                    event.target.value
                      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
                      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
                      .replace(/\D/g, "")
                  )}
                  placeholder="کد ورود"
                  dir="ltr"
                />
              </label>
            )}
            {error && <p className="form-message error-message">{error}</p>}
            {success && <p className="form-message success-message">{success}</p>}
            <div className="auth-otp-actions">
              <button className="primary-button auth-submit" type="button" onClick={() => void onRequestOtp()} disabled={loading || !phoneNumber.trim()}>
                {loading ? "در حال پردازش..." : otpRequested ? "ارسال دوباره کد" : "دریافت کد پیامکی"}
              </button>
              {otpRequested && (
                <button className="secondary-button auth-submit" type="submit" disabled={loading || otpCode.trim().length < 4}>
                  {loading ? "در حال بررسی..." : "تأیید و ورود"}
                </button>
              )}
            </div>
            <p className="auth-privacy-note">کد ورود پس از ۵ دقیقه منقضی می‌شود و فقط یک‌بار قابل استفاده است.</p>
          </form>
        ) : (
          <form className="auth-form" onSubmit={onSubmit}>
            {mode === "register" && (
              <label>
                نام و نام خانوادگی
                <input required minLength={2} maxLength={100} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="مثلاً سارا رضایی" />
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
        )}

        {demoMode && (
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
