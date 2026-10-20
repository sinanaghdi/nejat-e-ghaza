import { Link } from "react-router-dom";
import { UiIcon } from "./UiIcon";

const policyLinks = [
  { to: "/privacy", label: "حریم خصوصی" },
  { to: "/terms", label: "شرایط استفاده" },
  { to: "/safety", label: "ایمنی غذا و بازپرداخت" },
  { to: "/merchant-terms", label: "شرایط همکاری فروشندگان" },
  { to: "/cookies", label: "کوکی‌ها و ذخیره‌سازی" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link className="brand" to="/" aria-label="بازگشت به صفحهٔ اصلی نجات غذا">
            <span className="brand-mark" aria-hidden="true">ن</span>
            <span className="brand-copy"><strong>نجات غذا</strong><small>غذای خوب، کمتر هدر می‌رود</small></span>
          </Link>
          <p>راهی برای عرضهٔ غذای مازادِ قابل‌مصرف با قیمت روشن و تحویل حضوری.</p>
          <span className="site-footer-status"><UiIcon name="leaf" size={14} /> معرفی اولیهٔ پایلوت</span>
        </div>

        <nav className="site-footer-links" aria-label="قوانین و اطلاعات">
          <h2>قوانین و سیاست‌ها</h2>
          {policyLinks.map((item) => (
            <Link key={item.to} to={item.to}>{item.label}</Link>
          ))}
        </nav>

        <div className="site-footer-note">
          <h2>وضعیت فعلی</h2>
          <p>
            این نسخه برای معرفی محصول و بررسی تجربهٔ کاربری است. ثبت سفارش و پرداخت زنده تا اعلام رسمی آغاز پایلوت فعال نیست.
            لطفاً اطلاعات بانکی یا محرمانهٔ واقعی وارد نکنید.
          </p>
          <Link className="site-footer-merchant-link" to="/for-restaurants">اطلاعات همکاری فروشندگان <span aria-hidden="true">←</span></Link>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© ۲۰۲۶ نجات غذا</span>
        <span>شرایط نهایی پایلوت و مسیر پشتیبانی پیش از فعال‌سازی رسمی اعلام می‌شوند.</span>
      </div>
    </footer>
  );
}
