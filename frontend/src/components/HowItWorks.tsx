import { SectionHeading } from "./SectionHeading";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section steps-section">
      <SectionHeading eyebrow="ساده و سریع" title="چطور کار می‌کند؟" />
      <div className="steps">
        <div className="step"><span className="step-number">۰۱</span><h3>پیدا کن</h3><p>پیشنهادهای غذایی اطراف خودت را ببین.</p></div>
        <div className="step"><span className="step-number">۰۲</span><h3>رزرو کن</h3><p>غذای موردنظرت را با قیمت تخفیف‌خورده سفارش بده.</p></div>
        <div className="step"><span className="step-number">۰۳</span><h3>تحویل بگیر</h3><p>در بازه مشخص‌شده به فروشنده مراجعه کن و سفارشت را تحویل بگیر.</p></div>
      </div>
    </section>
  );
}
