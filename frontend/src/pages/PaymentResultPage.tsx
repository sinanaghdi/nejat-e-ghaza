import { Link, useSearchParams } from "react-router-dom";
import { MobileBottomNav } from "../components/MobileBottomNav";
import type { User } from "../lib/api";

type Props = {
  user: User | null;
  cartCount: number;
  onCart: () => void;
};

export function PaymentResultPage({ user, cartCount, onCart }: Props) {
  const [params] = useSearchParams();
  const status = params.get("status");
  const orderId = params.get("order_id");
  const refId = params.get("ref_id");

  const success = status === "success";
  const cancelled = status === "cancelled";

  return (
    <>
      <main className="page-shell">
        <section className={`payment-result-card ${success ? "success" : cancelled ? "cancelled" : "failed"}`}>
          <div className="state-icon" aria-hidden="true">{success ? "✓" : cancelled ? "↩" : "!"}</div>
          <p className="eyebrow">نتیجه پرداخت</p>
          <h1>{success ? "پرداخت با موفقیت انجام شد" : cancelled ? "پرداخت لغو شد" : "پرداخت ناموفق بود"}</h1>
          {orderId && <p>شماره سفارش: <strong>#{orderId}</strong></p>}
          {refId && <p>کد رهگیری: <strong dir="ltr">{refId}</strong></p>}
          <div className="payment-result-actions">
            <Link className="primary-button" to="/orders">مشاهده سفارش‌ها</Link>
            <Link className="secondary-button" to="/offers">بازگشت به پیشنهادها</Link>
          </div>
        </section>
      </main>
      <MobileBottomNav cartCount={cartCount} userRole={user?.role || null} onCart={onCart} />
    </>
  );
}