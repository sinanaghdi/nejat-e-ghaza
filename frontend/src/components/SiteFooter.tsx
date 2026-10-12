import { Link } from "react-router-dom";

const policyLinks = [
  { to: "/privacy", label: "حریم خصوصی" },
  { to: "/terms", label: "شرایط استفاده" },
  { to: "/safety", label: "ایمنی غذا و بازپرداخت" },
  { to: "/security", label: "امنیت" },
  { to: "/license", label: "مجوز و حقوق استفاده" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link className="brand" to="/" aria-label="بازگشت به صفحه اصلی نجات غذا">نجات غذا</Link>
          <p>غذای خوب، کمتر هدر می‌رود.</p>
          <span className="site-footer-status">نسخهٔ آزمایشی و نمونه‌کار</span>
        </div>

        <nav className="site-footer-links" aria-label="قوانین و اطلاعات">
          <h2>اطلاعات و سیاست‌ها</h2>
          {policyLinks.map((item) => (
            <Link key={item.to} to={item.to}>{item.label}</Link>
          ))}
        </nav>

        <div className="site-footer-note">
          <h2>پیش از استفاده</h2>
          <p>
            نسخهٔ نمایشی برای بررسی تجربهٔ کاربری است؛ خرید و پرداخت واقعی در آن انجام نمی‌شود.
            اطلاعات واقعی بانکی یا محرمانه را در نسخهٔ دمو وارد نکنید.
          </p>
          <a href="https://github.com/sinanaghdi/nejat-e-ghaza" target="_blank" rel="noreferrer">
            مخزن عمومی پروژه در GitHub
          </a>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© ۲۰۲۶ نجات غذا</span>
        <span>متن‌های حقوقی این نسخه، پیش‌نویس MVP هستند و پیش از پایلوت باید بازبینی شوند.</span>
      </div>
    </footer>
  );
}
