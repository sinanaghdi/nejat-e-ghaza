import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "../lib/api";
import { SahminoMark } from "../components/SahminoMark";
import { UiIcon } from "../components/UiIcon";

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

export function AuthPage(props: Props) {
  const navigate = useNavigate();
  const demoMode = import.meta.env.VITE_DEMO_MODE === "true";
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">(demoMode ? "email" : "phone");

  useEffect(() => {
    if (!props.user) return;
    const destination =
      props.user.role === "MERCHANT" ? "/merchant" :
      props.user.role === "ADMIN" ? "/admin" :
      "/dashboard";
    navigate(destination, { replace: true });
  }, [props.user, navigate]);

  function changeMode(next: "login" | "register") {
    props.onModeChange(next);
    if (next === "login") setLoginMethod(demoMode ? "email" : "phone");
  }

  function normalizeDigits(value: string) {
    return value
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
      .replace(/\D/g, "")
      .slice(0, 6);
  }

  return (
    <main className="stitch-app stitch-auth-page">
      <section className="stitch-auth-art">
        <div className="stitch-auth-mark"><SahminoMark /></div>
        <p className="stitch-kicker">خوش آمدی به سهمینو</p>
        <h1>هر بستهٔ خوب،<br />یک سهم برای تو.</h1>
        <p>پیشنهادهای محلی را کشف کن، زمان دریافت را ببین و با خرید آگاهانه، سهم خودت را انتخاب کن.</p>
        <div className="stitch-auth-benefits"><span>قیمت شفاف</span><span>تحویل حضوری مشخص</span><span>فروشندهٔ محلی</span></div>
        <span className="stitch-eco-orbit" aria-hidden="true" />
      </section>

      <section className="stitch-auth-panel">
        <Link className="stitch-brand-lockup" to="/" aria-label="صفحه اصلی سهمینو">
          <SahminoMark /><span><strong>سهمینو</strong><small>غذای خوب، سهم تو.</small></span>
        </Link>

        <p className="stitch-kicker">{props.mode === "login" ? "خوشحالیم که برگشتی" : "شروع همراهی"}</p>
        <h1>{props.mode === "login" ? "ورود به حساب" : "ساخت حساب کاربری"}</h1>
        <p>{props.mode === "login" ? "با شماره موبایل و کد یک‌بارمصرف وارد شو؛ یا با ایمیل و رمز عبور ادامه بده." : "اطلاعات اولیه را وارد کن تا بتوانی سفارش‌ها و فعالیتت را دنبال کنی."}</p>

        <div className="stitch-auth-tabs">
          <button type="button" className={props.mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>ورود</button>
          <button type="button" className={props.mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>ثبت‌نام</button>
        </div>

        {props.mode === "login" && (
          <div className="stitch-auth-methods" role="group" aria-label="روش ورود">
            <button type="button" className={loginMethod === "phone" ? "active" : ""} onClick={() => setLoginMethod("phone")} disabled={demoMode}>کد پیامکی</button>
            <button type="button" className={loginMethod === "email" ? "active" : ""} onClick={() => setLoginMethod("email")}>ایمیل و رمز</button>
          </div>
        )}

        {props.mode === "login" && loginMethod === "phone" && !demoMode ? (
          <form className="stitch-auth-form" onSubmit={(event) => { event.preventDefault(); if (props.otpRequested) props.onVerifyOtp(); }}>
            <label>
              شماره موبایل
              <input required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="0912 345 6789" value={props.phoneNumber} onChange={(event) => props.onPhoneChange(event.target.value)} />
            </label>

            {!props.otpRequested && (
              <label>نام (برای حساب جدید، اختیاری)
                <input maxLength={100} value={props.name} onChange={(event) => props.onNameChange(event.target.value)} placeholder="مثلاً سارا رضایی" />
              </label>
            )}

            {props.otpRequested && (
              <label>کد یک‌بارمصرف ۶ رقمی
                <input className="fa-number" required type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} dir="ltr" value={props.otpCode} onChange={(event) => props.onOtpCodeChange(normalizeDigits(event.target.value))} placeholder="••••••" />
              </label>
            )}

            {props.error && <p className="form-message error-message" role="alert">{props.error}</p>}
            {props.success && <p className="form-message success-message" role="status">{props.success}</p>}

            <button className="stitch-button stitch-button-primary" type="button" onClick={props.onRequestOtp} disabled={props.loading || !props.phoneNumber.trim()}>
              {props.loading ? "در حال پردازش..." : props.otpRequested ? "درخواست کد دوباره" : "دریافت کد ورود"}
              <UiIcon name="arrow-left" size={17} />
            </button>
            {props.otpRequested && (
              <button className="stitch-button stitch-button-secondary" type="submit" disabled={props.loading || props.otpCode.trim().length !== 6}>
                {props.loading ? "در حال بررسی..." : "تأیید کد و ورود"}
              </button>
            )}
            <p className="stitch-auth-privacy">کد ورود یک‌بارمصرف است و پس از ۵ دقیقه منقضی می‌شود. آن را در اختیار دیگران قرار نده.</p>
          </form>
        ) : (
          <form className="stitch-auth-form" onSubmit={props.onSubmit}>
            {props.mode === "register" && (
              <label>نام و نام خانوادگی
                <input required minLength={2} maxLength={100} value={props.name} onChange={(event) => props.onNameChange(event.target.value)} placeholder="مثلاً سارا رضایی" />
              </label>
            )}
            <label>ایمیل
              <input required type="email" autoComplete="email" dir="ltr" value={props.email} onChange={(event) => props.onEmailChange(event.target.value)} placeholder="name@example.com" />
            </label>
            <label>رمز عبور
              <input required type="password" autoComplete={props.mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={128} dir="ltr" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} placeholder="حداقل ۸ کاراکتر" />
            </label>
            {props.error && <p className="form-message error-message" role="alert">{props.error}</p>}
            {props.success && <p className="form-message success-message" role="status">{props.success}</p>}
            <button className="stitch-button stitch-button-primary" type="submit" disabled={props.loading}>
              {props.loading ? "در حال پردازش..." : props.mode === "login" ? "ورود به حساب" : "ساخت حساب"}
              <UiIcon name="arrow-left" size={17} />
            </button>
          </form>
        )}

        {demoMode && (
          <section className="stitch-demo-card">
            <p><strong>محیط نمایشی</strong> — این حساب‌ها فقط برای مشاهدهٔ جریان‌های دمو هستند.</p>
            <div className="stitch-demo-roles">
              <button type="button" onClick={() => props.onDemoLogin("CUSTOMER")}>ورود دمو: مشتری</button>
              <button type="button" onClick={() => props.onDemoLogin("MERCHANT")}>ورود دمو: فروشنده</button>
              <button type="button" onClick={() => props.onDemoLogin("ADMIN")}>ورود دمو: مدیر</button>
            </div>
          </section>
        )}

        <Link className="stitch-text-link" style={{ marginTop: 22 }} to="/offers">بازگشت به بسته‌ها ←</Link>
      </section>
    </main>
  );
}
