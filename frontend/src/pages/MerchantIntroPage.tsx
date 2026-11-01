import { Link } from "react-router-dom";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { UiIcon } from "../components/UiIcon";

type Props = {
  cartCount: number;
  userRole: string | null;
  onCart: () => void;
};

const benefits = [
  {
    icon: "package" as const,
    title: "عرض موجودی مازاد",
    copy: "بسته‌هایی را که در پایان روز باقی می‌مانند با تعداد و توضیح روشن معرفی کنید.",
  },
  {
    icon: "clock" as const,
    title: "زمان دریافت مشخص",
    copy: "بازهٔ تحویل را از قبل تعیین کنید تا مشتری برای دریافت حضوری برنامه داشته باشد.",
  },
  {
    icon: "leaf" as const,
    title: "دورریز کمتر",
    copy: "به‌جای کنار گذاشتن غذای قابل‌مصرف، امکان عرضهٔ آن را با قیمت مناسب فراهم کنید.",
  },
];

const steps = [
  ["۱", "آشنایی و بررسی شرایط", "نوع کسب‌وکار، محدودهٔ فعالیت و شیوهٔ آماده‌سازی و تحویل را با تیم پایلوت مرور می‌کنیم."],
  ["۲", "تأیید و فعال‌سازی حساب", "پس از بررسی اطلاعات و توافق روی شرایط همکاری، دسترسی پنل فروشنده فعال می‌شود."],
  ["۳", "ثبت بسته و تحویل حضوری", "تعداد، قیمت، توضیحات و بازهٔ جمع‌آوری را ثبت می‌کنید و سفارش را در محل کسب‌وکار تحویل می‌دهید."],
];

const faqs = [
  ["چه کسب‌وکارهایی می‌توانند همکاری کنند؟", "کافه‌ها، رستوران‌ها، نانوایی‌ها و دیگر فروشندگان واجد شرایط که بتوانند غذای قابل‌مصرف را با اطلاعات دقیق و در شرایط نگهداری مناسب عرضه کنند."],
  ["آیا باید هر روز بسته ثبت کنم؟", "خیر. عرضهٔ بسته به موجودی و تصمیم کسب‌وکار شما بستگی دارد. تعداد و زمان دریافت باید برای هر بسته دقیق ثبت شود."],
  ["تحویل سفارش چگونه انجام می‌شود؟", "در مدل فعلی، مشتری در بازهٔ مشخص‌شده به محل فروشنده مراجعه می‌کند. ارسال توسط پیک در این معرفی محصول تعهد داده نشده است."],
  ["هزینه، کمیسیون و تسویه چگونه است؟", "نرخ کمیسیون، زمان تسویه و شرایط لغو باید پیش از فعال‌سازی به‌صورت شفاف با فروشنده توافق شود. سامانه در حال حاضر واریز خودکار به فروشنده را تضمین نمی‌کند."],
  ["آیا ثبت‌نام فروشنده آزاد است؟", "برای جلوگیری از نمایش آگهی تأییدنشده، دسترسی پنل فروشنده پس از هماهنگی و بررسی فعال می‌شود. ایجاد حساب عمومی به‌تنهایی مجوز عرضهٔ غذا نیست."],
];

export function MerchantIntroPage({ cartCount, userRole, onCart }: Props) {
  return (
    <main className="merchant-intro-page page-content stitch-app">
      <nav className="merchant-intro-breadcrumb" aria-label="مسیر صفحه">
        <Link to="/">خانه</Link>
        <span aria-hidden="true">/</span>
        <span>همکاری با کافه‌ها و رستوران‌ها</span>
      </nav>

      <section className="merchant-intro-hero" aria-labelledby="merchant-intro-title">
        <div className="merchant-intro-copy">
          <p className="eyebrow"><UiIcon name="store" size={16} /> مخصوص کافه‌ها، رستوران‌ها و نانوایی‌ها</p>
          <h1 id="merchant-intro-title">غذای مازادِ قابل‌مصرف را به یک فرصت تازه تبدیل کنید.</h1>
          <p className="merchant-intro-lead">سهمینو به شما کمک می‌کند بسته‌های مازادِ مناسب عرضه را با قیمت روشن، تعداد مشخص و بازهٔ دریافت معلوم معرفی کنید؛ مشتری برای دریافت حضوری به فروشگاه شما مراجعه می‌کند.</p>
          <div className="merchant-intro-actions">
            <Link className="primary-button" to="/login">ورود فروشندگان <UiIcon name="arrow-left" size={18} /></Link>
            <Link className="secondary-button" to="/offers">دیدن نمونهٔ بازار</Link>
          </div>
          <p className="merchant-intro-caption">همکاری و فعال‌سازی پنل پس از گفت‌وگو و تأیید شرایط انجام می‌شود؛ ثبت‌نام عمومی به‌تنهایی دسترسی فروشنده ایجاد نمی‌کند.</p>
        </div>
        <aside className="merchant-intro-summary" aria-label="خلاصهٔ مدل همکاری">
          <div className="merchant-intro-summary-icon"><UiIcon name="leaf" size={28} /></div>
          <p className="eyebrow">مدل سادهٔ همکاری</p>
          <h2>شما آماده می‌کنید؛ مشتری حضوری تحویل می‌گیرد.</h2>
          <ul>
            <li><UiIcon name="check" size={17} /> تعداد و قیمت مشخص</li>
            <li><UiIcon name="check" size={17} /> بازهٔ دریافت از قبل معلوم</li>
            <li><UiIcon name="check" size={17} /> بدون وعدهٔ ارسال پیک در مدل فعلی</li>
          </ul>
        </aside>
      </section>

      <section className="merchant-intro-benefits" aria-label="مزیت‌های همکاری">
        {benefits.map((item) => (
          <article key={item.title}>
            <span className="merchant-intro-benefit-icon"><UiIcon name={item.icon} size={22} /></span>
            <h2>{item.title}</h2>
            <p>{item.copy}</p>
          </article>
        ))}
      </section>

      <section className="merchant-intro-steps" aria-labelledby="merchant-steps-heading">
        <div className="merchant-intro-section-heading">
          <p className="eyebrow">شروع همکاری</p>
          <h2 id="merchant-steps-heading">فرایند همکاری چگونه است؟</h2>
          <p>مراحل و شرایط مالی پیش از فعال‌سازی شفاف می‌شوند؛ این صفحه به‌تنهایی قرارداد یا تعهد فروش ایجاد نمی‌کند.</p>
        </div>
        <div className="merchant-intro-step-grid">
          {steps.map(([number, title, copy]) => (
            <article key={number}>
              <span className="merchant-intro-step-number">{number}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="merchant-intro-responsibilities" aria-labelledby="merchant-responsibilities-heading">
        <div>
          <p className="eyebrow">پیش از شروع</p>
          <h2 id="merchant-responsibilities-heading">شفافیت، ایمنی و احترام به مشتری</h2>
          <p>اعتماد مشتری با اطلاعات درست و تحویل قابل‌اتکا ساخته می‌شود. از فروشنده انتظار می‌رود:</p>
        </div>
        <ul>
          <li><UiIcon name="check" size={18} /> فقط غذای قابل‌مصرف و نگهداری‌شده در شرایط مناسب را عرضه کند.</li>
          <li><UiIcon name="check" size={18} /> تعداد، محتویات، قیمت و بازهٔ تحویل را دقیق اعلام کند.</li>
          <li><UiIcon name="check" size={18} /> دربارهٔ مواد حساسیت‌زا و احتمال تماس متقاطع، اطلاعات موجود را شفاف ارائه دهد.</li>
          <li><UiIcon name="check" size={18} /> شرایط لغو، عدم مراجعه، شکایت و بازپرداخت توافق‌شده را رعایت کند.</li>
        </ul>
      </section>

      <section className="merchant-intro-faq" aria-labelledby="merchant-faq-heading">
        <div className="merchant-intro-section-heading">
          <p className="eyebrow">پرسش‌های رایج</p>
          <h2 id="merchant-faq-heading">پیش از پیوستن بدانید</h2>
        </div>
        <div className="merchant-intro-faq-list">
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="merchant-intro-final-cta">
        <div>
          <p className="eyebrow">گام بعدی</p>
          <h2>آماده‌اید دربارهٔ همکاری گفت‌وگو کنیم؟</h2>
          <p>شرایط پایلوت، فرایند تأیید فروشگاه و مدل مالی باید پیش از شروع، با شما مرور شود.</p>
        </div>
        <div className="merchant-intro-actions">
          <Link className="primary-button" to="/login">ورود فروشندگان <UiIcon name="arrow-left" size={18} /></Link>
          <Link className="secondary-button" to="/terms">مطالعهٔ شرایط استفاده</Link>
        </div>
      </section>

      <p className="merchant-intro-demo-note" role="note">
        این نسخه برای معرفی و ارزیابی محصول است. سفارش و پرداخت زنده تا اعلام رسمی آغاز پایلوت فعال نیست؛ اطلاعات واقعی بانکی یا محرمانه وارد نکنید.
      </p>

      <MobileBottomNav cartCount={cartCount} userRole={userRole} onCart={onCart} />
    </main>
  );
}
