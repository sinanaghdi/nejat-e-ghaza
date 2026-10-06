import type { FoodOffer, MerchantProfile, Order } from "../lib/api";
import { MerchantDashboard } from "../components/merchant/MerchantDashboard";

type Props = {
  loading: boolean;
  error: string;
  profile: MerchantProfile | null;
  offers: FoodOffer[];
  orders: Order[];
  onCreateProfile: () => void;
  onCreateOffer: () => void;
  onEditOffer: (id: number) => void;
  onDeactivate: (id: number) => void;
  onStatusChange: (id: number, status: Order["status"]) => void;
  onVerifyPickup: (id: number) => void;
};

export function MerchantPage(props: Props) {
  return (
    <main className="page-shell merchant-page">
      <header className="page-header">
        <p className="eyebrow">پنل کسب‌وکار</p>
        <h1>{props.profile?.business_name || "فروشگاه شما"}</h1>
        <p>پیشنهادهای غذایی و سفارش‌های کسب‌وکارت را مدیریت کن.</p>
      </header>

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
          onCreateOffer={props.onCreateOffer}
          onEditOffer={props.onEditOffer}
          onDeactivate={props.onDeactivate}
          onStatusChange={props.onStatusChange}
          onVerifyPickup={props.onVerifyPickup}
        />
      </div>
    </main>
  );
}