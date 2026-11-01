import { Link } from "react-router-dom";
import type { FoodOffer, MerchantProfile, Order } from "../lib/api";
import { MerchantDashboard } from "../components/merchant/MerchantDashboard";
import { SahminoMark } from "../components/SahminoMark";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { UiIcon } from "../components/UiIcon";

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
  onVerifyPickup: (id: number, code: string) => void;
  onLogout: () => void;
};

export function MerchantPage(props: Props) {
  const verification = props.profile?.verification_status;
  return (
    <main className="stitch-app">
      <section className="stitch-content stitch-merchant-page">
        <header className="stitch-simple-header">
          <Link to="/" className="stitch-brand-lockup" aria-label="صفحه اصلی سهمینو"><SahminoMark /><span><strong>سهمینو</strong><small>پنل همکاران</small></span></Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to="/offers" className="stitch-button stitch-button-outline"><UiIcon name="store" size={16} /> بازار</Link>
            <button className="stitch-button stitch-button-secondary" type="button" onClick={props.onLogout}>خروج</button>
          </div>
        </header>

        <div className="stitch-merchant-dashboard">
          <header className="stitch-section-heading" style={{ marginBlock: "20px 14px" }}>
            <div><p className="stitch-kicker">مدیریت کسب‌وکار محلی</p><h1 style={{ margin: 0, color: "var(--stitch-pine)", fontSize: "1.65rem" }}>پیشخوان فروشنده</h1><p>بسته‌ها، سفارش‌های دریافتی، تحویل حضوری و دفتر تسویه را مدیریت کن.</p></div>
            <span className={verification === "VERIFIED" ? "stitch-status-pill" : verification === "SUSPENDED" ? "stitch-status-pill is-danger" : "stitch-status-pill is-warning"}>
              {verification === "VERIFIED" ? "فروشگاه تأیید شده" : verification === "SUSPENDED" ? "فروشگاه تعلیق شده" : "نیازمند بررسی"}
            </span>
          </header>

          {props.profile && (
            <nav className="stitch-merchant-tabs" aria-label="بخش‌های پنل">
              <a href="#merchant-overview">نمای کلی</a>
              <a href="#merchant-offers">بسته‌ها</a>
              <a href="#merchant-orders">سفارش و تحویل</a>
              <a href="#merchant-settlements">مالی</a>
              <a href="#merchant-profile">پروفایل</a>
            </nav>
          )}

          <MerchantDashboard
            loading={props.loading}
            error={props.error}
            profile={props.profile}
            offers={props.offers}
            orders={props.orders}
            onCreateProfile={props.onCreateProfile}
            onEditProfile={props.onEditProfile}
            onCreateOffer={props.onCreateOffer}
            onEditOffer={props.onEditOffer}
            onDeactivate={props.onDeactivate}
            onStatusChange={props.onStatusChange}
            onVerifyPickup={props.onVerifyPickup}
          />

          <section className="stitch-note-card" style={{ marginTop: 18 }}>
            <span className="stitch-note-icon"><UiIcon name="shield-check" size={20} /></span>
            <div><strong>شفافیت در ثبت اطلاعات</strong><p>فقط پیشنهادهایی را ثبت کن که برای مصرف مناسب‌اند و اطلاعات قیمت، تعداد و زمان دریافتشان درست است. دربارهٔ مواد اولیه و آلرژن‌ها اطلاعات تأییدنشده وارد نکن.</p><Link to="/merchant-terms" className="stitch-text-link">شرایط همکاری فروشندگان ←</Link></div>
          </section>
        </div>
      </section>
      <MobileBottomNav cartCount={0} userRole="MERCHANT" onCart={() => {}} />
    </main>
  );
}
