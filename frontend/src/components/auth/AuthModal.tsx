import type { FormEvent } from "react";

type Props = {
  open: boolean;
  mode: "login" | "register";
  loading: boolean;
  error: string;
  success: string;
  name: string;
  email: string;
  password: string;
  onClose: () => void;
  onModeChange: (mode: "login" | "register") => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthModal({ open, mode, loading, error, success, name, email, password, onClose, onModeChange, onNameChange, onEmailChange, onPasswordChange, onSubmit }: Props) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="بستن">×</button>
        <div className="auth-header">
          <span className="eyebrow">نجات غذا</span>
          <h2 id="auth-title">{mode === "login" ? "خوش آمدی" : "ساخت حساب کاربری"}</h2>
          <p>{mode === "login" ? "برای ادامه وارد حساب خودت شو." : "چند ثانیه بیشتر طول نمی‌کشد."}</p>
        </div>
        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => onModeChange("login")}>ورود</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => onModeChange("register")}>ثبت‌نام</button>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          {mode === "register" && <label>نام و نام خانوادگی<input required minLength={2} maxLength={100} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="مثلاً سینا احمدی" /></label>}
          <label>ایمیل<input required type="email" value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="example@email.com" dir="ltr" /></label>
          <label>رمز عبور<input required type="password" minLength={8} maxLength={128} value={password} onChange={(event) => onPasswordChange(event.target.value)} placeholder="حداقل ۸ کاراکتر" dir="ltr" /></label>
          {error && <p className="form-message error-message">{error}</p>}
          {success && <p className="form-message success-message">{success}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={loading}>{loading ? "در حال پردازش..." : mode === "login" ? "ورود به حساب" : "ساخت حساب"}</button>
        </form>
      </section>
    </div>
  );
}
