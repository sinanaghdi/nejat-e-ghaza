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
  const refundReview = status === "refund_review";
  const refunded = status === "refunded";
  const resultClass = success || refunded
    ? "success"
    : cancelled
      ? "cancelled"
      : refundReview
        ? "refund-review"
        : "failed";

  return (
    <>
      <main className="page-shell stitch-app payment-result-page">
        <section className={`payment-result-card ${resultClass}`}>
          <div className="state-icon" aria-hidden="true">
            {success || refunded ? "✓" : cancelled ? "↩" : refundReview ? "…" : "!"}
          </div>
          <p className="eyebrow">نتیجه پرداخت</p>
          <h1>
            {success
              ? "پرداخت با موفقیت انجام شد"
              : cancelled
                ? "پرداخت لغو شد"
                : refunded
                ? "بازپرداخت ثبت شد"
                : refundReview
                  ? "پرداخت ثبت شد و نیازمند پیگیری است"
                  : "پرداخت ناموفق بود"}
          </h1>
          {refundReview && (
            <p role="status">
              درگاه پرداخت را تأیید کرده، اما سفارش منقضی یا لغو شده است. سفارش دوباره فعال نمی‌شود؛
              تیم پشتیبانی باید تراکنش را بررسی و بازپرداخت را پیگیری کند.
            </p>
          )}
          {refunded && (
            <p role="status">
              بازپرداخت این تراکنش در سامانه ثبت شده است. کد رهگیری پرداخت را برای پیگیری نزد پشتیبانی نگه دارید.
            </p>
          )}
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
