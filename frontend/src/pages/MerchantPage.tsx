import { Link, NavLink } from "react-router-dom";
import type { FoodOffer, MerchantProfile, Order } from "../lib/api";
import { MerchantDashboard } from "../components/merchant/MerchantDashboard";
import { SahminoMark } from "../components/SahminoMark";

type Props = {
  loading: boolean;
  error: string;
  profile: MerchantProfile | null;
  offers: FoodOffer[];
  orders: Order[];
  onCreateProfile: () => void;
  onEditProfile: () => void;
  onCreateOffer: () => void;
  onEditOffer: (id: number) => void;
  onDeactivate: (id: number) => void;
  onStatusChange: (id: number, status: Order["status"]) => void;
  onVerifyPickup: (id: number) => void;
  onLogout: () => void;
};

export function MerchantPage(props: Props) {
  return (
    <main className="app merchant-console">
      <aside className="dashboard-sidebar merchant-sidebar">
        <Link className="dashboard-brand" to="/">
          <SahminoMark className="dashboard-brand-mark" />
          <span><strong>پنل همکاران</strong><small>سهمینو</small></span>
        </Link>
        <div className="sidebar-caption">مدیریت فروشگاه</div>
        <nav className="dashboard-side-nav" aria-label="ناوبری پنل فروشنده">
          <a className="active" href="#merchant-overview"><span aria-hidden="true">▦</span> نمای کلی فروشگاه</a>
          <a href="#merchant-offers"><span aria-hidden="true">◈</span> مدیریت بسته‌ها</a>
          <a href="#merchant-orders"><span aria-hidden="true">▤</span> سفارش‌ها و تحویل حضوری</a>
          <a href="#merchant-settlements"><span aria-hidden="true">◇</span> آمار و امور مالی</a>
          <button type="button" onClick={props.onEditProfile}><span aria-hidden="true">⚙</span> تنظیمات فروشگاه</button>
        </nav>
        <div className="sidebar-help-card"><span aria-hidden="true">✳</span><strong>اطلاعات شفاف، همکاری بهتر</strong><p>موجودی، قیمت و زمان دریافت را به‌روز نگه دار.</p><Link to="/safety">راهنمای ایمنی غذا ←</Link></div>
        <Link className="sidebar-market-link" to="/"><span aria-hidden="true">←</span> بازگشت به بازار مشتریان</Link>
      </aside>

      <div className="merchant-console-main">
        <header className="console-topbar">
          <div><span className="console-overline">میزکار فروشنده</span><strong>{props.profile?.business_name || "فروشگاه شما"}</strong></div>
          <div className="console-topbar-actions">
            <button type="button" className="console-logout" onClick={props.onLogout}>خروج</button>
            <span className={props.profile?.verification_status === "VERIFIED" ? "console-status verified" : "console-status"}>
              <span aria-hidden="true">●</span>
              {props.profile?.verification_status === "VERIFIED" ? "فروشگاه تأیید شده" : props.profile?.verification_status === "SUSPENDED" ? "فروشگاه تعلیق شده" : props.profile ? "در انتظار تأیید فروشگاه" : "پروفایل ساخته نشده"}
            </span>
            <Link className="console-market-link" to="/offers">مشاهده بازار <span aria-hidden="true">↗</span></Link>
          </div>
        </header>

        <section className="page-shell merchant-page">
          <header className="page-header merchant-page-heading" id="merchant-overview">
            <div><p className="eyebrow">عملیات روزانه</p><h1>{props.profile?.business_name || "فروشگاه شما"}</h1><p>بسته‌های مازاد قابل‌مصرف، سفارش‌ها و وضعیت تسویه را از یک نقطه مدیریت کن.</p></div>
            {props.profile && <div className="merchant-heading-location"><span aria-hidden="true">⌖</span><span><small>نشانی فروشگاه</small><strong>{props.profile.city} · {props.profile.address}</strong></span></div>}
          </header>

          <div className="merchant-dashboard-callout"><span aria-hidden="true">ⓘ</span><p>اطلاعات این پنل بر اساس پاسخ سرویس ثبت می‌شود. وضعیت مالی فقط ثبت حسابداری سامانه را نشان می‌دهد و به معنای انتقال خودکار وجه نیست.</p></div>

          <div className="merchant-page-content">
            <MerchantDashboard
              open
              loading={props.loading}
              error={props.error}
              profile={props.profile}
              offers={props.offers}
              orders={props.orders}
              onClose={() => {}}
              onCreateProfile={props.onCreateProfile}
              onEditProfile={props.onEditProfile}
              onCreateOffer={props.onCreateOffer}
              onEditOffer={props.onEditOffer}
              onDeactivate={props.onDeactivate}
              onStatusChange={props.onStatusChange}
              onVerifyPickup={props.onVerifyPickup}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
